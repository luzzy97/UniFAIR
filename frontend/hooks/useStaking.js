import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';
import { useWallet } from './useWallet';

export function useStaking() {
  const { 
    address, provider, isConnected, 
    tickingCredits, setTickingCredits, deductCredits,
    stakedBalance, setStakedBalance, 
    stakedEthBalance, setStakedEthBalance,
    tickingRewards, setTickingRewards,
    rewardRate, setRewardRate,
    totalStaked, setTotalStaked,
    lockEnd, setLockEnd,
    lockStart, setLockStart,
    stakingPositions, setStakingPositions
  } = useWallet();
  
  const [pendingRewards, setPendingRewards] = useState('0');
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
          const rawLockEnd = (stakeInfo.lockEnd !== undefined ? stakeInfo.lockEnd : stakeInfo[1]) ?? 0n;
          const rawLockStart = (stakeInfo.startTime !== undefined ? stakeInfo.startTime : stakeInfo[2]) ?? 0n;
          const rawSfsFraction = (stakeInfo.sfsFraction !== undefined ? stakeInfo.sfsFraction : stakeInfo[3]) ?? 0n;
          const realRlo = parseFloat(ethers.formatEther(rawAmount));
          
          console.log(`[useStaking] Contract Data: RLO=${realRlo}, Simulation=${simRlo}`);
          
          // Use the higher value or the contract value if non-zero
          const finalRlo = Math.max(realRlo, simRlo);
          setStakedBalance(finalRlo.toString());
          setSfsFraction(Number(rawSfsFraction) / 100);
          
          if (rawLockEnd > 0n) setLockEnd(Number(rawLockEnd) * 1000); // to ms
          if (rawLockStart > 0n) setLockStart(Number(rawLockStart) * 1000); // to ms
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

  // Sync whenever address or provider changes
  useEffect(() => {
    if (isConnected && address) {
      fetchStakingData();
      const interval = setInterval(fetchStakingData, 15000); // Poll contract/backend every 15s
      return () => clearInterval(interval);
    }
  }, [isConnected, address, fetchStakingData]);

  // BACKGROUND SYNC: Save credits to backend every 30s
  useEffect(() => {
    if (isConnected && address && tickingCredits > 0) {
      const syncInterval = setInterval(() => {
        syncWithBackend(address, { credits: tickingCredits });
      }, 10000);
      return () => clearInterval(syncInterval);
    }
  }, [isConnected, address, tickingCredits, syncWithBackend]);

  // Global tickers managed in useWallet.js for cross-page sync.

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
      const now = Date.now();
      const end = now + (Number(lockMonths) * 30 * 24 * 60 * 60 * 1000);
      
      const newPosition = {
        id: `stake-rlo-${tx.hash}`,
        amount: amount,
        token: 'RLO',
        lockStart: now,
        lockEnd: end,
        timestamp: now,
        txHash: tx.hash
      };

      setStakingPositions(prev => [newPosition, ...prev]);
      
      await syncWithBackend(address, { 
        stakedRlo: (parseFloat(stakedBalance) + parseFloat(amount)).toString(),
        lockEnd: end,
        lockStart: now
      });
      
      setStakedBalance((current + parseFloat(amount)).toString());
      setLockEnd(end);
      setLockStart(now);

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
      const now = Date.now();
      const end = now + (Number(lockMonths) * 30 * 24 * 60 * 60 * 1000);

      const newPosition = {
        id: `stake-eth-${tx.hash}`,
        amount: ethAmount,
        token: 'ETH',
        lockStart: now,
        lockEnd: end,
        timestamp: now,
        txHash: tx.hash
      };

      setStakingPositions(prev => [newPosition, ...prev]);

      await syncWithBackend(address, { 
        stakedEth: newVal,
        lockEnd: end,
        lockStart: now
      });
      setStakedEthBalance(newVal);
      setLockEnd(end);
      setLockStart(now);
      
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
      const now = Date.now();
      const end = now + (Number(lockMonths) * 30 * 24 * 60 * 60 * 1000);

      const newPairPos = {
        id: `stake-pair-${tx.hash}`,
        amount: rloAmount,
        ethAmount: ethAmount,
        token: 'PAIR',
        lockStart: now,
        lockEnd: end,
        timestamp: now,
        txHash: tx.hash
      };

      setStakingPositions(prev => [newPairPos, ...prev]);

      await syncWithBackend(address, { 
        stakedEth: (curEth + parseFloat(ethAmount)).toString(),
        stakedRlo: (curRlo + parseFloat(rloAmount)).toString(),
        lockEnd: end,
        lockStart: now
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

  const withdraw = useCallback(async (positionId, amount, token) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      
      // If it's an ETH position, we just "send it back" (demo logic)
      // If it's RLO, we call the contract's withdraw/unstake
      let tx;
      if (token === 'ETH') {
        tx = await signer.sendTransaction({ to: address, value: 0 }); // Placeholder for ETH withdrawal logic
        await tx.wait();
      } else {
        const staking = getContract('Staking', signer);
        tx = await staking.withdraw(ethers.parseEther(amount.toString()));
        await tx.wait();
      }
      
      if (positionId) {
        setStakingPositions(prev => prev.filter(p => p.id !== positionId));
      }

      if (token === 'ETH') {
        const newVal = (parseFloat(stakedEthBalance) - parseFloat(amount)).toString();
        setStakedEthBalance(newVal);
        await syncWithBackend(address, { stakedEth: newVal });
      } else if (token === 'PAIR') {
        // Assume amount here was RLO for calculation
        // We'll find the specific position to get the ETH amount
        const pos = stakingPositions.find(p => p.id === positionId);
        const eAmt = pos?.ethAmount || '0';
        const rAmt = pos?.amount || amount;
        
        const nextEth = (parseFloat(stakedEthBalance) - parseFloat(eAmt)).toString();
        const nextRlo = (parseFloat(stakedBalance) - parseFloat(rAmt)).toString();
        
        setStakedEthBalance(nextEth);
        setStakedBalance(nextRlo);
        await syncWithBackend(address, { stakedEth: nextEth, stakedRlo: nextRlo });
      } else {
        const newVal = (parseFloat(stakedBalance) - parseFloat(amount)).toString();
        setStakedBalance(newVal);
        await syncWithBackend(address, { stakedRlo: newVal });
      }

      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData, syncWithBackend, stakingPositions, setStakingPositions, stakedBalance, stakedEthBalance]);

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
    deductCredits,
    lockEnd,
    lockStart,
    stakingPositions
  };
}
