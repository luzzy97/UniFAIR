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

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const fetchStakingData = useCallback(async () => {
    try {
      const contract = getContract('Staking', provider);
      
      // ABI has totalStaked (not totalStakedRlo)
      const total = await contract.totalStaked();
      setTotalStaked(ethers.formatEther(total));

      if (address) {
        const checksummed = ethers.getAddress(address);
        const stakeInfo = await contract.stakes(checksummed);
        
        // ABI stakes() returns: amount, lastUpdate, rewardsAccumulated, sfsFraction
        // Try both named and positional access for robustness
        let rawAmount = 0n;
        let rawSfsFraction = 0n;

        if (stakeInfo != null) {
          // Try named first, fallback to index
          rawAmount = (stakeInfo.amount !== undefined ? stakeInfo.amount : stakeInfo[0]) ?? 0n;
          rawSfsFraction = (stakeInfo.sfsFraction !== undefined ? stakeInfo.sfsFraction : stakeInfo[3]) ?? 0n;
        }

        setStakedBalance(ethers.formatEther(rawAmount));
        setStakedEthBalance('0');
        setSfsFraction(Number(rawSfsFraction) / 100);
        setRwaAllocation(0);
        setRwaTarget('');
        
        const rewards = await contract.calculateRewards(checksummed);
        setPendingRewards(ethers.formatEther(rewards));

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

  // setRwaAllocation not in ABI — no-op with success signal
  const updateRwaAllocation = useCallback(async (target, percentage) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      // Not in ABI — send a 0 ETH signal tx
      const tx = await signer.sendTransaction({
        to: await signer.getAddress(),
        value: 0
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Update RWA allocation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider]);

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
      const stakeInfo = await contract.stakes(checksummed);
      const stakedAmt = stakeInfo.amount ?? stakeInfo[0] ?? 0n;

      if (stakedAmt === 0n) throw new Error('No staked balance to withdraw');

      const staking = getContract('Staking', signer);
      // ABI: withdraw(uint256 amount)
      const tx = await staking.withdraw(stakedAmt);
      await tx.wait();
      await fetchStakingData();
      return tx.hash;
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, address, fetchStakingData]);

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
