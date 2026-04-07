import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';
import { useWallet } from './useWallet';

export function useStaking() {
  const { address, provider, isConnected } = useWallet();
  const [stakedBalance, setStakedBalance] = useState('0');
  const [stakedEthBalance, setStakedEthBalance] = useState('0');
  const [pendingRewards, setPendingRewards] = useState('0');
  const [totalStaked, setTotalStaked] = useState('0');
  const [sfsFraction, setSfsFraction] = useState(0);
  const [rwaAllocation, setRwaAllocation] = useState(0);
  const [rwaTarget, setRwaTarget] = useState('');
  const [sponsorshipPaths, setSponsorshipPaths] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStakingData = useCallback(async () => {
    try {
      const contract = getContract('Staking', provider);
      
      const total = await contract.totalStakedRlo(); // Tracking RLO mostly, could add totalStakedEth
      setTotalStaked(ethers.formatEther(total));

      if (address) {
        const checksummed = ethers.getAddress(address);
        const stakeInfo = await contract.stakes(checksummed);
        
        let rawAmount = 0n;
        let rawEthAmount = 0n;
        let rawSfsFraction = 0n;
        let rawRwaAllocation = 0n;
        let rawRwaTarget = '';

        if (stakeInfo && typeof stakeInfo === 'object') {
          rawAmount = stakeInfo.rloAmount ?? stakeInfo[0] ?? 0n;
          rawEthAmount = stakeInfo.ethAmount ?? stakeInfo[1] ?? 0n;
          rawSfsFraction = stakeInfo.sfsFraction ?? stakeInfo[5] ?? 0n;
          rawRwaAllocation = stakeInfo.rwaAllocation ?? stakeInfo[6] ?? 0n;
          rawRwaTarget = stakeInfo.rwaTarget ?? stakeInfo[7] ?? '';
        }

        const formattedStaked = ethers.formatEther(rawAmount);
        const formattedEthStaked = ethers.formatEther(rawEthAmount);
        
        setStakedBalance(formattedStaked);
        setStakedEthBalance(formattedEthStaked);
        setSfsFraction(Number(rawSfsFraction) / 100); 
        setRwaAllocation(Number(rawRwaAllocation) / 100);
        setRwaTarget(rawRwaTarget);
        
        const rewards = await contract.calculateRewards(checksummed);
        setPendingRewards(ethers.formatEther(rewards));

        const paths = await contract.getSponsorshipPaths(checksummed);
        setSponsorshipPaths(paths.map(p => ({
            address: p.destination,
            amount: parseFloat(ethers.formatEther(p.amount))
        })));
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

      const tx = await staking.stake(parsedAmount, lockMonths);
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Stake RLO error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData]);

  const stakeEth = useCallback(async (ethAmount, lockMonths) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);

      const parsedEth = ethers.parseEther(ethAmount);

      const tx = await staking.stakeEth(lockMonths, { value: parsedEth });
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Stake ETH error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

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

      const tx = await staking.stakePair(parsedRlo, lockMonths, { value: parsedEth });
      await tx.wait();
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
      const fraction = Math.round(percentage * 100); // 50% -> 5000 bps
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

  const updateRwaAllocation = useCallback(async (target, percentage) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const fraction = Math.round(percentage * 100); // 50% -> 5000 bps
      const tx = await staking.setRwaAllocation(target, fraction);
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

  const withdraw = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const tx = await staking.withdraw();
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchStakingData]);

  const withdrawAmount = useCallback(async (rloAmt, ethAmt) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const staking = getContract('Staking', signer);
      const pRlo = ethers.parseEther(rloAmt.toString());
      const pEth = ethers.parseEther(ethAmt.toString());
      const tx = await staking.withdrawAmount(pRlo, pEth);
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
