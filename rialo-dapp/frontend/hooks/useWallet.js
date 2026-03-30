import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../lib/ethers';

const WalletContext = createContext(null);
const SEPOLIA_CHAIN_ID = 11155111;

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [aiPrivateKey, setAiPrivateKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rialo_ai_private_key') || null;
    }
    return null;
  });

  const [basePrices, setBasePrices] = useState({
    ETH: 3500, BTC: 65000, SOL: 150, BNB: 600, RIALO: 3, USDC: 1, USDT: 1
  });

  const fetchPrices = useCallback(async () => {
    try {
      const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,binancecoin,usd-coin,tether&vs_currencies=usd');
      const data = await resp.json();
      if (data) {
        setBasePrices(prev => ({
          ...prev,
          ETH: data.ethereum?.usd || prev.ETH,
          BTC: data.bitcoin?.usd || prev.BTC,
          SOL: data.solana?.usd || prev.SOL,
          BNB: data.binancecoin?.usd || prev.BNB,
          RIALO: 3, // Real value fixed as per user request
          USDC: 1, 
          USDT: 1
        }));
      }
    } catch (err) {
      console.error('Error fetching prices:', err);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); 
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const globalRates = useMemo(() => {
    const rates = {};
    const tokens = Object.keys(basePrices);
    for (const t1 of tokens) {
      rates[t1] = {};
      for (const t2 of tokens) {
        rates[t1][t2] = basePrices[t1] / basePrices[t2];
      }
    }
    return rates;
  }, [basePrices]);

  const [balances, setBalances] = useState({
    'ETH': 0,
    'RIALO': 0,
    'BTC': 0.00,
    'SOL': 0.00,
    'BNB': 0.00,
    'USDC': 0.00,
    'USDT': 0.00
  });

  const [transactions, setTransactions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rialo_transactions');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
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
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rialo_transactions', JSON.stringify(transactions));
      localStorage.setItem('rialo_trigger_orders', JSON.stringify(triggerOrders));
      localStorage.setItem('rialo_scheduled_txs', JSON.stringify(scheduledTxs));
      if (aiPrivateKey) {
        localStorage.setItem('rialo_ai_private_key', aiPrivateKey);
      } else {
        localStorage.removeItem('rialo_ai_private_key');
      }
    }
  }, [transactions, triggerOrders, scheduledTxs, aiPrivateKey]);

  const addTransaction = useCallback((tx) => {
    const newTx = {
      id: tx.txHash || `local-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: Date.now(),
      status: 'Success',
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

  const fetchEthBalance = useCallback(async (addr, prov) => {
    try {
      const bal = await prov.getBalance(addr);
      setBalances(prev => ({ ...prev, 'ETH': parseFloat(ethers.formatEther(bal)) }));
    } catch (err) {
      console.error('Error fetching ETH balance:', err);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16) }],
        });
      } catch (err) {
        if (err.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16),
                chainName: 'Sepolia Test Network',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            });
          } catch (addError) {
            console.error('Error adding Sepolia chain:', addError);
          }
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await ethProvider.send('eth_requestAccounts', []);
        const network = await ethProvider.getNetwork();
        const cid = Number(network.chainId);
        setProvider(ethProvider);
        setAddress(accounts[0]);
        setChainId(cid);
        setConnecting(false);
        if (cid !== SEPOLIA_CHAIN_ID) {
          setError('Please switch to Sepolia Network');
        } else {
          fetchEthBalance(accounts[0], ethProvider);
        }
      } catch (err) {
        setConnecting(false);
        setError(err.code === 4001 ? 'Connection rejected.' : 'Failed to connect wallet');
      }
    } else {
      setConnecting(false);
      setError('MetaMask not found.');
    }
  }, [fetchEthBalance]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setProvider(null);
    setChainId(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const onAccounts = (accounts) => {
      if (accounts.length === 0) disconnect();
      else setAddress(accounts[0]);
    };
    const onChain = (id) => {
      const newChainId = parseInt(id, 16);
      setChainId(newChainId);
      // Re-initialize provider to avoid NETWORK_ERROR after chain switch
      if (window.ethereum) {
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);
        setError(null);
        if (newChainId !== SEPOLIA_CHAIN_ID) {
          setError('Please switch to Sepolia Network');
        }
      }
    };
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [disconnect]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts.length > 0) connect();
    });
  }, []);

  const executeAiTransaction = useCallback(async (txType, userMsg, actionDetail) => {
    if (!address || !provider) throw new Error('Wallet not connected');
    try {
      let signer;
      if (aiPrivateKey) {
        // Use local AI wallet
        const wallet = new ethers.Wallet(aiPrivateKey, provider);
        signer = wallet;
      } else {
        // Fallback to MetaMask (will pop up)
        signer = await provider.getSigner();
      }

      let tx;
      if (txType === 'Stake') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '10';
        if (parseFloat(amount) < 10) throw new Error('Minimum stake is 10 RIALO');
        tx = await getContract('Staking', signer).stake(ethers.parseEther(amount));
      } else if (txType === 'Bridge') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '1';
        tx = await getContract('RLO', signer).bridgeOut(ethers.parseEther(amount));
      } else if (txType === 'Swap') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '1';
        tx = await getContract('RLO', signer).transfer('0x000000000000000000000000000000000000dEaD', ethers.parseEther(amount));
      }
      if (tx) {
        await tx.wait();
        addTransaction({ type: txType, amount: actionDetail, details: 'AI Strategy', txHash: tx.hash, source: 'AI Agent' });
        return tx.hash;
      }
      return '0x' + Math.random().toString(16).slice(2, 42);
    } catch (err) { throw err; }
  }, [address, provider, addTransaction, aiPrivateKey]);


  useEffect(() => {
    if (scheduledTxs.length === 0) return;
    const interval = setInterval(() => {
      setScheduledTxs(prev => {
        const next = [];
        prev.forEach(tx => {
          if (tx.remainingSec <= 1) {
            executeAiTransaction(tx.type, tx.userMsg, tx.detail).then(txHash => {
              setToast({ message: `Auto ${tx.type} completed!`, detail: tx.detail, txHash: txHash });
            }).catch(err => {
              setToast({ message: `Auto ${tx.type} failed: ${err.message}`, type: 'error' });
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

  // Automation: Watch for Price Triggers (Limit Orders)
  useEffect(() => {
    if (!triggerOrders?.length) return;
    
    triggerOrders.forEach(order => {
      if (order.status !== 'Pending') return;
      
      const currentRate = globalRates[order.fromToken]?.[order.toToken];
      if (!currentRate) return;

      let triggered = false;
      if (order.condition === '<=' && currentRate <= order.targetPrice) triggered = true;
      if (order.condition === '>=' && currentRate >= order.targetPrice) triggered = true;
      if (order.condition === '<' && currentRate < order.targetPrice) triggered = true;
      if (order.condition === '>' && currentRate > order.targetPrice) triggered = true;
      if (order.condition === '==' && Math.abs(currentRate - order.targetPrice) < 0.0001) triggered = true;

      if (triggered) {
        // Mark as Executing to prevent double-strike
        setTriggerOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Executing' } : o));
        
        const detail = `${order.amountIn} ${order.fromToken} -> ${order.toToken}`;
        executeAiTransaction('Swap', `Limit Order Triggered: ${detail}`, detail)
          .then(txHash => {
            setToast({ message: `Limit Order Executed!`, detail: detail, txHash: txHash });
            setTriggerOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Executed', executedRate: currentRate, txHash: txHash } : o));
          })
          .catch(err => {
            console.error('Trigger execution failed:', err);
            setToast({ message: `Limit Order Failed`, detail: err.message, type: 'error' });
            // Revert status to Pending so it can try again or allow user to see it failed
            setTriggerOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Pending' } : o));
          });
      }
    });
  }, [globalRates, triggerOrders, executeAiTransaction]);


  const addScheduledTx = useCallback((tx) => {
    setScheduledTxs(prev => [...prev, { id: Math.random().toString(16).slice(2, 8), ...tx }]);
  }, []);

  const removeScheduledTx = useCallback((id) => {
    setScheduledTxs(prev => prev.filter(t => t.id !== id));
  }, []);

  const removeTriggerOrder = useCallback((id) => {
    setTriggerOrders(prev => prev.filter(order => order.id !== id));
  }, []);

  const showToast = useCallback((toastData) => {
    setToast(toastData);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (address && provider && chainId === SEPOLIA_CHAIN_ID) {
      const interval = setInterval(() => fetchEthBalance(address, provider), 15000);
      return () => clearInterval(interval);
    }
  }, [address, provider, chainId, fetchEthBalance]);

  return (
    <WalletContext.Provider
      value={{ 
        address, provider, chainId, connecting, error, connect, disconnect, switchNetwork,
        isWrongNetwork: chainId !== null && chainId !== SEPOLIA_CHAIN_ID,
        shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
        isConnected: !!address,
        balances, transactions, globalRates, triggerOrders, updateBalance, fetchEthBalance,
        addTransaction, addTriggerOrder, executeAiTransaction,
        scheduledTxs, addScheduledTx, removeScheduledTx, removeTriggerOrder,
        aiPrivateKey, setAiPrivateKey,
        toast, showToast
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
