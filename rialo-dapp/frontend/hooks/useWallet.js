import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const [balances, setBalances] = useState({
    'ETH': 1.24,
    'RIALO': 0,
    'USDC': 1000.00,
    'USDT': 500.00
  });
  const [stakedBalance, setStakedBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Load transactions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('rialo_transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse transactions', e);
      }
    }
  }, []);

  // Sync transactions to localStorage
  useEffect(() => {
    localStorage.setItem('rialo_transactions', JSON.stringify(transactions));
    console.log('Transactions synced to localStorage:', transactions.length);
  }, [transactions]);

  const addTransaction = useCallback((tx) => {
    const newTx = {
      id: tx.txHash || `local-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: Date.now(),
      status: 'Success', // Default to success for simulation
      ...tx
    };
    console.log('Adding transaction:', newTx);
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const updateBalance = useCallback((symbol, delta) => {
    setBalances(prev => ({
      ...prev,
      [symbol]: Math.max(0, (prev[symbol] || 0) + delta)
    }));
  }, []);

  const updateStakedBalance = useCallback((delta) => {
    setStakedBalance(prev => Math.max(0, prev + delta));
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    
    // Check for MetaMask
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await ethProvider.send('eth_requestAccounts', []);
        const network = await ethProvider.getNetwork();
        setProvider(ethProvider);
        setAddress(accounts[0]);
        setChainId(Number(network.chainId));
        setConnecting(false);
        return;
      } catch (err) {
        if (err.code !== 4001) {
          console.error('Wallet connection error:', err);
        } else {
          setError('Connection rejected by user.');
          setConnecting(false);
          return;
        }
      }
    }

    // Fallback: Simulate Connection for UI Demo
    console.log('MetaMask not found or connection failed. Using simulated wallet.');
    setTimeout(() => {
      setAddress('0x712a89c32b1e4f3583921092839213f3923f392');
      setChainId(1);
      setConnecting(false);
    }, 800);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setChainId(null);
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const onAccounts = (accounts) => {
      if (accounts.length === 0) disconnect();
      else setAddress(accounts[0]);
    };
    const onChain = (id) => setChainId(parseInt(id, 16));
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [disconnect]);

  // Auto-reconnect if already connected
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts.length > 0) connect();
    });
  }, []);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const executeAiTransaction = useCallback((txType, userMsg, actionDetail) => {
    const txHash = '0x' + Math.random().toString(16).slice(2, 42);
    
    // 1. Add to history
    addTransaction({
      type: txType,
      amount: actionDetail,
      details: 'AI Optimized Strategy',
      txHash: txHash,
      source: 'AI Agent'
    });

    // 2. Update balances
    try {
      const lowerMsg = userMsg.toLowerCase();
      const amountMatch = lowerMsg.match(/[\d.]+/);
      const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
      
      if (amount > 0) {
        if (txType === "Swap") {
          const tokens = lowerMsg.match(/(?:eth|rialo|usdc|usdt)/g);
          if (tokens && tokens.length >= 2) {
            const fromToken = tokens[0].toUpperCase();
            const toToken = tokens[1].toUpperCase();
            const rate = 
              (fromToken === 'ETH' && toToken === 'RIALO') ? 2400 : 
              (fromToken === 'RIALO' && toToken === 'ETH') ? 1/2400 :
              (fromToken === 'ETH' && (toToken === 'USDC' || toToken === 'USDT')) ? 2400 :
              ((fromToken === 'USDC' || fromToken === 'USDT') && toToken === 'ETH') ? 1/2400 :
              ((fromToken === 'USDC' || fromToken === 'USDT') && toToken === 'RIALO') ? 1 :
              (fromToken === 'RIALO' && (toToken === 'USDC' || toToken === 'USDT')) ? 1 : 1;
            updateBalance(fromToken, -amount);
            updateBalance(toToken, amount * rate);
          }
        } else if (txType === "Bridge") {
          updateBalance('ETH', -amount);
          updateBalance('RIALO', amount);
        } else if (txType === "Stake") {
          const tokenMatch = lowerMsg.match(/rialo|eth|usdc|usdt/);
          const token = tokenMatch ? tokenMatch[0].toUpperCase() : 'RIALO';
          updateBalance(token, -amount);
          if (token === 'RIALO') updateStakedBalance(amount);
        }
      }
    } catch (e) {
      console.error('Failed to update balances from AI agent', e);
    }

    return txHash;
  }, [addTransaction, updateBalance, updateStakedBalance]);

  return (
    <WalletContext.Provider
      value={{ 
        address, 
        provider, 
        chainId, 
        connecting, 
        error, 
        connect, 
        disconnect, 
        shortAddress, 
        isConnected: !!address,
        balances,
        stakedBalance,
        transactions,
        updateBalance,
        updateStakedBalance,
        addTransaction,
        executeAiTransaction
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
