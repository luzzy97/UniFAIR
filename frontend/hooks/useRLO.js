import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';
import { useWallet } from './useWallet';

export function useRLO() {
  const { address, provider, isConnected, setTokenBalance } = useWallet();
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    try {
      const contract = getContract('RLO', provider);
      const bal = await contract.balanceOf(address);
      const formatted = ethers.formatEther(bal);
      setBalance(formatted);
      if (setTokenBalance) setTokenBalance('RIALO', formatted);
    } catch (error) {
      console.error('Error fetching RLO balance:', error);
    }
  }, [address, provider]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const claimFaucet = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      // Re-create signer from latest provider to avoid stale provider after chain switch
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await freshProvider.getSigner();
      const contract = getContract('RLO', signer);
      const tx = await contract.claimFaucet();
      await tx.wait();
      await fetchBalance();
      return tx.hash;
    } catch (error) {
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('network changed')) {
        throw new Error('Network changed. Please wait a moment and try again.');
      }
      console.error('Faucet claim error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchBalance]);

  const transfer = useCallback(async (to, amount) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = getContract('RLO', signer);
      const tx = await contract.transfer(to, ethers.parseEther(amount));
      await tx.wait();
      await fetchBalance();
      return tx.hash;
    } catch (error) {
      console.error('Transfer error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchBalance]);

  const bridgeOut = useCallback(async (amount) => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = getContract('RLO', signer);
      const tx = await contract.bridgeOut(ethers.parseEther(amount));
      await tx.wait();
      await fetchBalance();
      return tx.hash;
    } catch (error) {
      console.error('Bridge out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, fetchBalance]);

  return { balance, loading, claimFaucet, transfer, bridgeOut, fetchBalance };
}
