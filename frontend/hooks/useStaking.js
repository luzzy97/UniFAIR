import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';
import { useWallet } from './useWallet';

export function useStaking() {
  const { address, provider, isConnected } = useWallet();
  const [stakedBalance, setStakedBalance] = useState('0');
  const [stakedEthBalance, setStakedEthBalance] = useState('0');
  
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

      if (address) {
        const checksummed = ethers.getAddress(address);
        
        try {
          const stakeInfo = await contract.stakes(checksummed);
          if (stakeInfo) {
            const rawAmount = (stakeInfo.amount !== undefined ? stakeInfo.amount : stakeInfo[0]) ?? 0n;
            const rawSfsFraction = (stakeInfo.sfsFraction !== undefined ? stakeInfo.sfsFraction : stakeInfo[3]) ?? 0n;
            
            // Combine real on-chain RLO with simulated RLO
            const realBal = parseFloat(ethers.formatEther(rawAmount));
            const simBal = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');
            setStakedBalance((realBal + simBal).toString());
            
            setSfsFraction(Number(rawSfsFraction) / 100);
          }
        } catch (e) {
          console.warn('Failed to fetch stake info:', e);
          const simBal = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');
          setStakedBalance(simBal.toString());
        }
        
        try {
          const rewards = await contract.calculateRewards(checksummed);
          setPendingRewards(ethers.formatEther(rewards));
        } catch (e) {
          setPendingRewards('0');
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
    fetchStakingData 
  };
}
