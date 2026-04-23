import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';
import { useWallet } from './useWallet';

// ---------------------------------------------------------------------------
// Module-level singleton for globalRwaYieldUsd
// Allows the value to be shared across all components using useStaking()
// without requiring React Context or an external state library.
// Persisted to localStorage so it survives cross-page navigation.
// ---------------------------------------------------------------------------
const _RWA_STORAGE_KEY = 'rialo_rwa_yield_usd';

// Initialize from localStorage if available (runs once on module load)
let _globalRwaYieldUsd = (() => {
  if (typeof window !== 'undefined') {
    const saved = parseFloat(localStorage.getItem(_RWA_STORAGE_KEY) || '0');
    return isNaN(saved) ? 0 : saved;
  }
  return 0;
})();

const _rwaYieldSubscribers = new Set();

function _setGlobalRwaYieldUsd(value) {
  _globalRwaYieldUsd = value;
  // Persist to localStorage so value survives page navigation
  if (typeof window !== 'undefined') {
    if (value > 0) {
      localStorage.setItem(_RWA_STORAGE_KEY, value.toString());
    } else {
      localStorage.removeItem(_RWA_STORAGE_KEY);
    }
  }
  _rwaYieldSubscribers.forEach((fn) => fn(value));
}

export function useStaking() {
  const { address, provider, isConnected } = useWallet();
  const [stakedBalance, setStakedBalance] = useState('0');
  const [stakedEthBalance, setStakedEthBalance] = useState('0');

  // Shared global RWA Yield state — synced across all useStaking() consumers
  const [globalRwaYieldUsd, _setLocalRwaYield] = useState(_globalRwaYieldUsd);

  useEffect(() => {
    // Subscribe this component instance to module-level updates
    _rwaYieldSubscribers.add(_setLocalRwaYield);
    return () => {
      _rwaYieldSubscribers.delete(_setLocalRwaYield);
    };
  }, []);

  const setGlobalRwaYieldUsd = useCallback((value) => {
    _setGlobalRwaYieldUsd(value);
  }, []);
  
  // Load simulated staked balances on mount
  useEffect(() => {
    const savedEth = localStorage.getItem('rialo_staked_eth');
    if (savedEth) setStakedEthBalance(savedEth);
  }, []);

  const [pendingRewards, setPendingRewards] = useState('0');
  const [totalStaked, setTotalStaked] = useState('0');
  const [sfsFraction, setSfsFraction] = useState(0);
  const [rwaAllocation, setRwaAllocation] = useState(0);
  const [rwaTarget, setRwaTarget] = useState('');
  const [sponsorshipPaths, setSponsorshipPaths] = useState([]);
  const [loading, setLoading] = useState(false);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const fetchStakingData = useCallback(async () => {
    try {
      const contract = getContract('Staking', provider);
      
      try {
        const total = await contract.totalStaked();
        setTotalStaked(ethers.formatEther(total));
      } catch (e) {
        console.warn('Failed to fetch total staked:', e);
      }

      const savedEth = localStorage.getItem('rialo_staked_eth') || '0';
      setStakedEthBalance(savedEth);

        let currentTotalStakedVal = 0;
        try {
          const checksummed = ethers.getAddress(address);
          const stakeInfo = await contract.stakes(checksummed);
          const rawAmount = (stakeInfo.amount !== undefined ? stakeInfo.amount : stakeInfo[0]) ?? 0n;
          const simBal = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');
          const realBal = parseFloat(ethers.formatEther(rawAmount));
          const totalRLO = realBal + simBal;
          setStakedBalance(totalRLO.toString());
          
          const rawSfsFraction = (stakeInfo.sfsFraction !== undefined ? stakeInfo.sfsFraction : stakeInfo[3]) ?? 0n;
          setSfsFraction(Number(rawSfsFraction) / 100);

          const savedEth = parseFloat(localStorage.getItem('rialo_staked_eth') || '0');
          setStakedEthBalance(savedEth.toString());
          
          // Use these for immediate yield calculation
          currentTotalStakedVal = totalRLO + (savedEth * 2300);
        } catch (e) {
          console.warn('Failed to fetch stake info:', e);
          const simBal = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');
          const savedEth = parseFloat(localStorage.getItem('rialo_staked_eth') || '0');
          setStakedBalance(simBal.toString());
          setStakedEthBalance(savedEth.toString());
          currentTotalStakedVal = simBal + (savedEth * 2300);
        }
        
        try {
          const rewards = await contract.calculateRewards(ethers.getAddress(address));
          const realRewards = parseFloat(ethers.formatEther(rewards));
          
          // Yield Simulation for snappy UX / AI strategy visualization
          const now = Date.now();
          const lastUpdate = parseInt(localStorage.getItem('rialo_last_yield_time') || now.toString());
          const elapsedSec = (now - lastUpdate) / 1000;
          
          if (elapsedSec > 0 && currentTotalStakedVal > 0) {
            const apy = 0.12; // 12% APY as shown in UI
            const yieldPerSec = (currentTotalStakedVal * apy) / (365 * 24 * 3600);
            const addedYield = yieldPerSec * elapsedSec;
            
            const currentSim = parseFloat(localStorage.getItem('rialo_sim_rewards') || '0');
            localStorage.setItem('rialo_sim_rewards', (currentSim + addedYield).toString());
          }
          localStorage.setItem('rialo_last_yield_time', now.toString());

          const simRewards = parseFloat(localStorage.getItem('rialo_sim_rewards') || '0');
          setPendingRewards((realRewards + simRewards).toString());
        } catch (e) {
          const simRewards = parseFloat(localStorage.getItem('rialo_sim_rewards') || '0');
          setPendingRewards(simRewards.toString());
        }

        try {
          const paths = await contract.getSponsorshipPaths(checksummed);
          setSponsorshipPaths(paths.map(p => ({
            address: p.destination,
            amount: parseFloat(ethers.formatEther(p.amount))
          })));
        } catch {
          setSponsorshipPaths([]);
        }
    } catch (error) {
      console.error('Error fetching staking data:', error);
    }
  }, [address, provider]);

  useEffect(() => {
    fetchStakingData();
    const interval = setInterval(fetchStakingData, 15000);
    return () => clearInterval(interval);
  }, [fetchStakingData]);

  // stake(uint256 amount) — only 1 param in ABI, no lockMonths
  const stakeRlo = useCallback(async (amount, lockMonths) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const rlo = getContract('RLO', signer);
      const staking = getContract('Staking', signer);

      const parsedAmount = ethers.parseEther(amount);
      
      const allowance = await rlo.allowance(address, await staking.getAddress());
      if (allowance < parsedAmount) {
        const approveTx = await rlo.approve(await staking.getAddress(), parsedAmount);
        await approveTx.wait();
      }

      // ABI: stake(uint256 amount) — one param only
      const tx = await staking.stake(parsedAmount);
      await tx.wait();
      
      // Update simulated balance for instant feedback
      const currentSim = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');
      const newSim = (currentSim + parseFloat(amount)).toString();
      localStorage.setItem('rialo_staked_rlo', newSim);
      setStakedBalance(prev => (parseFloat(prev) + parseFloat(amount)).toString());

      // Wait for RPC node to propagate new state
      await sleep(2500);
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Stake RLO error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData]);

  // stakeEth not in ABI — simulate via ETH send to dead address
  const stakeEth = useCallback(async (ethAmount, lockMonths) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const parsedEth = ethers.parseEther(ethAmount);
      // ETH staking not supported by contract — send to dead address as signal tx
      const tx = await signer.sendTransaction({
        to: '0x000000000000000000000000000000000000dEaD',
        value: parsedEth
      });
      await tx.wait();
      
      // Update simulated balance using functional update to avoid stale closure
      setStakedEthBalance(prev => {
        const newBal = (parseFloat(prev) + parseFloat(ethAmount)).toString();
        localStorage.setItem('rialo_staked_eth', newBal);
        return newBal;
      });
      
      return tx.hash;
    } catch (error) {
      console.error('Stake ETH error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider]);

  // stakePair not in ABI — stake RLO portion and send ETH to dead address
  const stakePair = useCallback(async (rloAmount, ethAmount, lockMonths) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const rlo = getContract('RLO', signer);
      const staking = getContract('Staking', signer);

      const parsedRlo = ethers.parseEther(rloAmount);
      const parsedEth = ethers.parseEther(ethAmount);

      const allowance = await rlo.allowance(address, await staking.getAddress());
      if (allowance < parsedRlo) {
        const approveTx = await rlo.approve(await staking.getAddress(), parsedRlo);
        await approveTx.wait();
      }

      // Stake RLO portion
      const tx = await staking.stake(parsedRlo);
      await tx.wait();

      // Signal ETH portion
      const ethTx = await signer.sendTransaction({
        to: '0x000000000000000000000000000000000000dEaD',
        value: parsedEth
      });
      await ethTx.wait();

      // Update simulated balance using functional update
      setStakedEthBalance(prev => {
        const newEthBal = (parseFloat(prev) + parseFloat(ethAmount)).toString();
        localStorage.setItem('rialo_staked_eth', newEthBal);
        return newEthBal;
      });

      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Stake Pair error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData]);

  const updateSfsFraction = useCallback(async (percentage) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const fraction = Math.round(percentage * 100);
      const tx = await staking.setSfsFraction(fraction);
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Update SfS fraction error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

  // setRwaAllocation now connects to addSponsorshipPath for on-chain tracking
  const updateRwaAllocation = useCallback(async (target, percentage) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      
      // Map targets to virtual vault addresses for Sepolia
      const vaultMap = {
        'treasury': '0x1111111111111111111111111111111111111111',
        'real-estate': '0x2222222222222222222222222222222222222222',
        'gold': '0x3333333333333333333333333333333333333333'
      };
      
      const dest = vaultMap[target] || ethers.ZeroAddress;
      const amount = ethers.parseEther(percentage.toString());
      
      const tx = await staking.addSponsorshipPath(dest, amount);
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Update RWA allocation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

  const addSponsorshipPath = useCallback(async (dest, amount) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const tx = await staking.addSponsorshipPath(dest, ethers.parseEther(amount.toString()));
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Add sponsorship path error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

  // ABI: withdraw(uint256 amount) — needs amount param
  const withdraw = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = getContract('Staking', provider);
      const checksummed = ethers.getAddress(address);
      let stakedAmt = 0n;
      try {
        const stakeInfo = await contract.stakes(checksummed);
        stakedAmt = stakeInfo.amount ?? stakeInfo[0] ?? 0n;
      } catch (e) {
        console.warn('Withdraw: Failed to fetch on-chain stake, defaulting to simulated info', e);
      }

      const simEth = parseFloat(stakedEthBalance);
      const simRlo = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');

      if (stakedAmt === 0n && simEth === 0 && simRlo === 0) {
        throw new Error('No staked balance to withdraw');
      }

      // Clear simulated balances
      setStakedEthBalance('0');
      localStorage.removeItem('rialo_staked_eth');
      localStorage.removeItem('rialo_staked_rlo');

      if (stakedAmt > 0n) {
        const staking = getContract('Staking', signer);
        const tx = await staking.withdraw(stakedAmt);
        await tx.wait();
        await fetchStakingData();
        return tx.hash;
      } else {
        // Handle only simulated withdrawal
        const tx = await signer.sendTransaction({
          to: address,
          value: 0
        });
        await tx.wait();
        await fetchStakingData();
        return tx.hash;
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData, stakedEthBalance]);

  const withdrawAmount = useCallback(async (rloAmt, ethAmt) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const pRlo = ethers.parseEther(rloAmt.toString());
      const tx = await staking.withdraw(pRlo);
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Withdraw amount error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

  const claimRewards = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const tx = await staking.claimRewards();
      await tx.wait();
      
      // Clear simulated rewards on successful claim
      localStorage.removeItem('rialo_sim_rewards');
      localStorage.setItem('rialo_last_yield_time', Date.now().toString());
      
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Claim rewards error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

  return { 
    stakedBalance, 
    stakedEthBalance,
    pendingRewards, 
    totalStaked, 
    sfsFraction, 
    rwaAllocation,
    rwaTarget,
    sponsorshipPaths, 
    loading, 
    stakeRlo,
    stakeEth,
    stakePair,
    updateRwaAllocation,
    withdraw, 
    withdrawAmount,
    claimRewards, 
    updateSfsFraction, 
    addSponsorshipPath, 
    fetchStakingData,
    // Global RWA Yield state — shared across all pages via module-level singleton
    globalRwaYieldUsd,
    setGlobalRwaYieldUsd,
  };
}
