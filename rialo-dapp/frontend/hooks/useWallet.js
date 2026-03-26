import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const INIT_RATES = {
    'ETH': { 'RIALO': 2400, 'USDC': 2400, 'USDT': 2400 },
    'RIALO': { 'ETH': 1/2400, 'USDC': 1, 'USDT': 1 },
    'USDC': { 'ETH': 1/2400, 'RIALO': 1, 'USDT': 1 },
    'USDT': { 'ETH': 1/2400, 'RIALO': 1, 'USDC': 1 },
  };

  const [balances, setBalances] = useState({
    'ETH': 1.24,
    'RIALO': 0,
    'USDC': 1000.00,
    'USDT': 500.00
  });
  const [stakedBalance, setStakedBalance] = useState(0);
  const [transactions, setTransactions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rialo_transactions');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [globalRates, setGlobalRates] = useState(INIT_RATES);
  const [triggerOrders, setTriggerOrders] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rialo_trigger_orders');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [scheduledTxs, setScheduledTxs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rialo_scheduled_txs');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  }); // { id, type, userMsg, detail, remainingSec }
  const [toast, setToast] = useState(null); // { message, detail, type, txHash }

  // Load transactions and limit orders from localStorage on mount


  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('rialo_transactions', JSON.stringify(transactions));
    localStorage.setItem('rialo_trigger_orders', JSON.stringify(triggerOrders));
    localStorage.setItem('rialo_scheduled_txs', JSON.stringify(scheduledTxs));
  }, [transactions, triggerOrders, scheduledTxs]);

  const addTransaction = useCallback((tx) => {
    const newTx = {
      id: tx.txHash || `local-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: Date.now(),
      status: 'Success', // Default to success for simulation
      ...tx
    };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const addTriggerOrder = useCallback((order) => {
    const newOrder = {
      id: `to-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: Date.now(),
      status: 'Pending',
      ...order
    };
    setTriggerOrders(prev => [newOrder, ...prev]);
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

  // Global timer for scheduled AI transactions — persists across page navigations
  useEffect(() => {
    if (scheduledTxs.length === 0) return;

    const interval = setInterval(() => {
      setScheduledTxs(prev => {
        const next = [];
        prev.forEach(tx => {
          if (tx.remainingSec <= 1) {
            // Auto-execute when countdown reaches zero
            const txHash = executeAiTransaction(tx.type, tx.userMsg, tx.detail);
            setToast({
              message: `Auto ${tx.type} completed!`,
              detail: tx.detail,
              txHash: txHash
            });
          } else {
            next.push({ ...tx, remainingSec: tx.remainingSec - 1 });
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledTxs, executeAiTransaction]);

  const addScheduledTx = useCallback((tx) => {
    setScheduledTxs(prev => [...prev, {
      id: Math.random().toString(16).slice(2, 8),
      ...tx
    }]);
  }, []);

  const removeScheduledTx = useCallback((id) => {
    setScheduledTxs(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toastData) => {
    setToast(toastData);
  }, []);

  // Clear toast after 6 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Simulate global real-time price monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalRates(prev => {
        const next = { ...prev };
        // Randomly fluctuate ETH price by roughly ±0.5% each tick
        const fluctuation = 1 + (Math.random() * 0.01 - 0.005);
        const newEthPrice = prev['ETH']['USDC'] * fluctuation;
        
        next['ETH'] = { 'RIALO': newEthPrice, 'USDC': newEthPrice, 'USDT': newEthPrice };
        next['RIALO'] = { 'ETH': 1/newEthPrice, 'USDC': 1, 'USDT': 1 };
        next['USDC'] = { 'ETH': 1/newEthPrice, 'RIALO': 1, 'USDT': 1 };
        next['USDT'] = { 'ETH': 1/newEthPrice, 'RIALO': 1, 'USDC': 1 };
        
        return next;
      });
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  // Monitor pending trigger orders against real-time globalRates
  useEffect(() => {
    if (triggerOrders.length === 0) return;

    let updated = false;
    const newOrders = triggerOrders.map(order => {
      if (order.status !== 'Pending') return order;

      const { fromToken, toToken, targetPrice, amountIn, condition } = order;
      const currentRate = globalRates[fromToken]?.[toToken] || 1;
      
      let triggered = false;
      if (condition === '>=') triggered = currentRate >= targetPrice;
      else if (condition === '<=') triggered = currentRate <= targetPrice;

      if (triggered) {
        updated = true;
        
        const received = parseFloat(amountIn) * currentRate;
        // Balance of `fromToken` is assumed locked during `addTriggerOrder` inside UI
        updateBalance(toToken, received);
        
        addTransaction({
          type: 'Trigger Swap',
          amount: `${amountIn} ${fromToken} → ${received.toFixed(4)} ${toToken}`,
          details: `Auto Executed at ${currentRate.toFixed(4)}`,
          txHash: `0x${Math.random().toString(16).slice(2, 42)}`,
          source: 'System'
        });

        return { ...order, status: 'Executed', executedRate: currentRate, executedAt: Date.now() };
      }
      return order;
    });

    if (updated) {
      setTriggerOrders(newOrders);
    }
  }, [globalRates, triggerOrders, updateBalance, addTransaction]);

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
        globalRates,
        triggerOrders,
        updateBalance,
        updateStakedBalance,
        addTransaction,
        addTriggerOrder,
        executeAiTransaction,
        scheduledTxs,
        addScheduledTx,
        removeScheduledTx,
        toast,
        showToast
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
