import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';
import { useWallet } from './useWallet';

export function useStaking() {
  const { address, provider, isConnected, tickingCredits, setTickingCredits, deductCredits } = useWallet();
  const [stakedBalance, setStakedBalance] = useState('0');
  const [stakedEthBalance, setStakedEthBalance] = useState('0');
  // Note: tickingCredits state lives in useWallet context (shared across all pages)
  
  const [pendingRewards, setPendingRewards] = useState('0');
  const [tickingRewards, setTickingRewards] = useState(0);
  const [rewardRate, setRewardRate] = useState(0);
  const [totalStaked, setTotalStaked] = useState('0');
  const [sfsFraction, setSfsFraction] = useState(0);
  const [rwaAllocation, setRwaAllocation] = useState(0);
  const [rwaTarget, setRwaTarget] = useState('');
  const [sponsorshipPaths, setSponsorshipPaths] = useState([]);
  const [loading, setLoading] = useState(false);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // PERSISTENCE: Sync with Backend
  const syncWithBackend = useCallback(async (addr, data = {}) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${baseUrl}/api/user-staking/${addr}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  }, []);

  const fetchStakingData = useCallback(async () => {
    if (!address) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const checksummed = ethers.getAddress(address);
      
      // 1. Fetch from Backend FIRST (Persistence Layer)
      let simRlo = 0;
      let simEth = 0;
      let simCredits = 0;
      try {
        const res = await fetch(`${baseUrl}/api/user-staking/${address}`);
        const backendData = await res.json();
        if (backendData.success) {
          simRlo = backendData.stakedRlo || 0;
          simEth = backendData.stakedEth || 0;
          simCredits = backendData.credits || 0;
          
          // Set initial values from backend immediately for better UX
          setStakedBalance(simRlo.toString());
          setStakedEthBalance(simEth.toString());
          
          // Persistence sync
          if (typeof window !== 'undefined' && address) {
            localStorage.setItem(`rialo_staked_rlo_${address}`, simRlo.toString());
            localStorage.setItem(`rialo_staked_eth_${address}`, simEth.toString());
          }

          // Merge backend persistence with browser high-speed cache
          let localCredits = 0;
          if (typeof window !== 'undefined' && address) {
            localCredits = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
          }
          
          // CRITICAL: Trust local credits above all else for deductions.
          // Only use backend value if it's significantly higher (earned rewards)
          // or if local credits haven't been initialized yet.
          const finalCredits = (simCredits > localCredits + 0.1) ? simCredits : localCredits;
          
          setTickingCredits(prev => {
            // Only update if we are initializing or if incoming data is newer/higher
            return prev === 0 ? finalCredits : Math.max(prev, finalCredits);
          });
          
          if (backendData.rewards !== undefined) {
            setPendingRewards(backendData.rewards.toString());
            setTickingRewards(backendData.rewards);
          }
          console.log(`[useStaking] Backend Load: RLO=${simRlo}, ETH=${simEth}, Credits=${simCredits}, Local=${localCredits}`);
        }
      } catch (e) {
        console.warn('[useStaking] Backend fetch failed, using defaults:', e);
      }

      // 2. Fetch from Contract and MERGE
      const contract = getContract('Staking', provider);
      
      // Protocol-wide constants
      try {
        const total = await contract.totalStaked();
        setTotalStaked(ethers.formatEther(total));
        const rate = await contract.rewardRate();
        setRewardRate(parseFloat(ethers.formatEther(rate)));
      } catch (e) {
        console.warn('[useStaking] Failed to fetch constants from contract:', e);
      }

      // User-specific data from contract
      try {
        const stakeInfo = await contract.stakes(checksummed);
        if (stakeInfo) {
          const rawAmount = (stakeInfo.amount !== undefined ? stakeInfo.amount : stakeInfo[0]) ?? 0n;
          const rawSfsFraction = (stakeInfo.sfsFraction !== undefined ? stakeInfo.sfsFraction : stakeInfo[3]) ?? 0n;
          const realRlo = parseFloat(ethers.formatEther(rawAmount));
          
          console.log(`[useStaking] Contract Data: RLO=${realRlo}, Simulation=${simRlo}`);
          
          // Use the higher value or the contract value if non-zero
          const finalRlo = Math.max(realRlo, simRlo);
          setStakedBalance(finalRlo.toString());
          setSfsFraction(Number(rawSfsFraction) / 100);
        }
      } catch (e) {
        console.warn('[useStaking] Failed to fetch user stake from contract:', e);
      }
      
      // Live rewards from contract (if any)
      try {
        const rewards = await contract.calculateRewards(checksummed);
        const val = parseFloat(ethers.formatEther(rewards));
        if (val > 0) {
          setPendingRewards(val.toString());
          setTickingRewards(val);
        }
      } catch (e) {
        // Fallback already set from backend
      }

      // Sponsorship paths
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
      console.error('[useStaking] General fetch error:', error);
    }
  }, [address, provider]);

  // Fast-boot initial state from cache — handles balances and credits
  useEffect(() => {
    if (address && typeof window !== 'undefined') {
        const cachedRlo = localStorage.getItem(`rialo_staked_rlo_${address}`);
        const cachedEth = localStorage.getItem(`rialo_staked_eth_${address}`);
        if (cachedRlo) setStakedBalance(cachedRlo);
        if (cachedEth) setStakedEthBalance(cachedEth);
    }
  }, [address]);

  // Persistent state saving — save balances whenever they change
  useEffect(() => {
    if (address && typeof window !== 'undefined' && (stakedBalance !== '0' || stakedEthBalance !== '0')) {
      localStorage.setItem(`rialo_staked_rlo_${address}`, stakedBalance);
      localStorage.setItem(`rialo_staked_eth_${address}`, stakedEthBalance);
    }
  }, [address, stakedBalance, stakedEthBalance]);

  // Sync whenever address or provider changes
  useEffect(() => {
    if (isConnected && address) {
      fetchStakingData();
      const interval = setInterval(fetchStakingData, 15000); // Poll contract/backend every 15s
      return () => clearInterval(interval);
    }
  }, [isConnected, address, fetchStakingData]);

  // REAL-TIME CREDIT GENERATION LOGIC
  useEffect(() => {
    const rloVal = parseFloat(stakedBalance);
    const ethVal = parseFloat(stakedEthBalance);
    
    if (isConnected && (rloVal > 0 || ethVal > 0)) {
      const tickInterval = setInterval(() => {
        const totalRloEq = rloVal + (ethVal * 2000);
        const cps = totalRloEq / 3600;
        const increment = cps / 10; // 10 ticks per second (100ms)
        
        setTickingCredits(prev => {
          const nextVal = prev + increment;
          // Persist to localStorage so it syncs across pages
          if (typeof window !== 'undefined' && address) {
            localStorage.setItem(`rialo_credits_${address}`, nextVal.toString());
          }
          return nextVal;
        });
      }, 100);
      return () => clearInterval(tickInterval);
    }
  }, [isConnected, address, stakedBalance, stakedEthBalance, setTickingCredits]);

  // BACKGROUND SYNC: Save credits to backend every 30s
  useEffect(() => {
    if (isConnected && address && tickingCredits > 0) {
      const syncInterval = setInterval(() => {
        syncWithBackend(address, { credits: tickingCredits });
      }, 10000);
      return () => clearInterval(syncInterval);
    }
  }, [isConnected, address, tickingCredits, syncWithBackend]);

  // REAL-TIME REWARD TICKING LOGIC (100ms for premium smoothness)
  useEffect(() => {
    if (rewardRate > 0 && tickingRewards >= 0 && (parseFloat(stakedBalance) > 0 || parseFloat(stakedEthBalance) > 0)) {
      const tickInterval = setInterval(() => {
        // User's Share = (UserStaked / totalProtocolStaked)
        // Rate = Rewards emitted per second
        // YieldPerTick(100ms) = (UserShare * Rate) / 10
        const totalUserStaked = parseFloat(stakedBalance) + (parseFloat(stakedEthBalance) * 1500); // ETH weighted
        const protocolTotalParsed = parseFloat(totalStaked) || 1000000;
        
        const userShare = totalUserStaked / protocolTotalParsed;
        const yieldPerSecond = rewardRate * userShare;
        const increment = yieldPerSecond / 10; 
        
        setTickingRewards(prev => prev + increment);
      }, 100);
      return () => clearInterval(tickInterval);
    }
  }, [rewardRate, tickingRewards, stakedBalance, stakedEthBalance, totalStaked]);

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

      const tx = await staking.stake(parsedAmount);
      await tx.wait();
      
      // Update backend for persistence
      const current = parseFloat(stakedBalance);
      await syncWithBackend(address, { stakedRlo: current + parseFloat(amount) });
      setStakedBalance((current + parseFloat(amount)).toString());

      await sleep(2500);
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Stake RLO error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData, stakedBalance, syncWithBackend]);

  const stakeEth = useCallback(async (ethAmount, lockMonths) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: '0x000000000000000000000000000000000000dEaD',
        value: ethers.parseEther(ethAmount)
      });
      await tx.wait();
      
      const current = parseFloat(stakedEthBalance);
      const newVal = (current + parseFloat(ethAmount)).toString();
      await syncWithBackend(address, { stakedEth: parseFloat(newVal) });
      setStakedEthBalance(newVal);
      
      return tx.hash;
    } catch (error) {
      console.error('Stake ETH error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, stakedEthBalance, syncWithBackend]);

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

      const tx = await staking.stake(parsedRlo);
      await tx.wait();

      const ethTx = await signer.sendTransaction({
        to: '0x000000000000000000000000000000000000dEaD',
        value: parsedEth
      });
      await ethTx.wait();

      const curEth = parseFloat(stakedEthBalance);
      const curRlo = parseFloat(stakedBalance);
      await syncWithBackend(address, { 
        stakedEth: curEth + parseFloat(ethAmount),
        stakedRlo: curRlo + parseFloat(rloAmount)
      });
      
      setStakedEthBalance((curEth + parseFloat(ethAmount)).toString());
      setStakedBalance((curRlo + parseFloat(rloAmount)).toString());

      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Stake Pair error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData, stakedEthBalance, stakedBalance, syncWithBackend]);

  const updateRwaAllocation = useCallback(async (target, percentage) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      
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
      } catch (e) {}

      if (stakedAmt > 0n) {
        const staking = getContract('Staking', signer);
        const tx = await staking.withdraw(stakedAmt);
        await tx.wait();
        await syncWithBackend(address, { stakedEth: 0, stakedRlo: 0 });
        setStakedEthBalance('0');
        setStakedBalance('0');
        await fetchStakingData();
        return tx.hash;
      } else {
        const tx = await signer.sendTransaction({ to: address, value: 0 });
        await tx.wait();
        await syncWithBackend(address, { stakedEth: 0, stakedRlo: 0 });
        setStakedEthBalance('0');
        setStakedBalance('0');
        await fetchStakingData();
        return tx.hash;
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData, syncWithBackend]);

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

  // Deduct credits — delegated to useWallet shared deductCredits
  // Kept here for backward compatibility with any old callers
  
  return { 
    stakedBalance, 
    stakedEthBalance,
    pendingRewards, 
    tickingRewards,
    tickingCredits,
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
    claimRewards, 
    fetchStakingData,
    deductCredits
  };
}
