import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { getContract, RLO_ADDRESS } from '../lib/ethers';

const WalletContext = createContext(null);
const SEPOLIA_CHAIN_ID = 11155111;

export function WalletProvider({ children }) {
  // Skip the very first run of the persist effect.
  // On mount, STEP 1 loads from localStorage and queues state updates,
  // but STEP 2 runs immediately after with the old zero values before
  // those updates are committed — wiping localStorage. By skipping the
  // first STEP 2 run, we let React re-render with loaded values first,
  // then STEP 2 runs correctly on the re-render.
  const skipFirstPersist = useRef(true);
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
    ETH: 3500, RIALO: 3, USDC: 1, USDT: 1
  });

  const fetchPrices = useCallback(async () => {
    try {
      const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether&vs_currencies=usd');
      const data = await resp.json();
      if (data) {
        setBasePrices(prev => ({
          ...prev,
          ETH: data.ethereum?.usd || prev.ETH,
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

  // SSR-safe default — same value on server and client to avoid hydration mismatch.
  // The real saved values are loaded from localStorage in a useEffect below.
  const [balances, setBalances] = useState({ 'ETH': 0, 'RIALO': 0, 'BTC': 0, 'SOL': 0, 'BNB': 0, 'USDC': 0, 'USDT': 0 });

  // SSR-safe defaults — same on server and client.
  const [transactions, setTransactions] = useState([]);
  const [triggerOrders, setTriggerOrders] = useState([]);
  const [scheduledTxs, setScheduledTxs] = useState([]);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', content: { raw: "Rialo AI is online. How can I optimize your on-chain operations today?" } }]);
  const [toast, setToast] = useState(null);
  
  // Track last manual update per token to prevent immediate contract sync overwrites in demo
  const [lastManualUpdates, setLastManualUpdates] = useState({});

  // STEP 1: After mount, load all saved data from localStorage into state.
  // This runs only on the client, after hydration, so there's no SSR mismatch.
  useEffect(() => {
    const savedBalances = localStorage.getItem('rialo_balances');
    if (savedBalances) setBalances(JSON.parse(savedBalances));

    const savedTxs = localStorage.getItem('rialo_transactions');
    if (savedTxs) setTransactions(JSON.parse(savedTxs));

    const savedOrders = localStorage.getItem('rialo_trigger_orders');
    if (savedOrders) setTriggerOrders(JSON.parse(savedOrders));

    const savedScheduled = localStorage.getItem('rialo_scheduled_txs');
    if (savedScheduled) setScheduledTxs(JSON.parse(savedScheduled));

    const savedMessages = localStorage.getItem('rialo_ai_messages');
    if (savedMessages) setAiMessages(JSON.parse(savedMessages));

  }, []);

  // STEP 2: Persist state to localStorage on every change.
  // Skips the FIRST run (mount) where state still has stale zero defaults.
  // On the re-render triggered by STEP 1's setState calls, this runs
  // again with the correct loaded values.
  useEffect(() => {
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    localStorage.setItem('rialo_transactions', JSON.stringify(transactions));
    localStorage.setItem('rialo_trigger_orders', JSON.stringify(triggerOrders));
    localStorage.setItem('rialo_scheduled_txs', JSON.stringify(scheduledTxs));
    localStorage.setItem('rialo_ai_messages', JSON.stringify(aiMessages));
    localStorage.setItem('rialo_balances', JSON.stringify(balances));
    if (aiPrivateKey) {
      localStorage.setItem('rialo_ai_private_key', aiPrivateKey);
    } else {
      localStorage.removeItem('rialo_ai_private_key');
    }
  }, [transactions, triggerOrders, scheduledTxs, aiMessages, balances, aiPrivateKey]);

  const simplifyError = useCallback((err) => {
    if (!err) return null;
    let msg = typeof err === 'string' ? err : err.reason || err.message || 'Transaction failed';
    
    const lower = msg.toLowerCase();
    if (lower.includes('user rejected')) return 'User rejected transaction';
    if (lower.includes('insufficient funds')) return 'Insufficient funds';
    if (lower.includes('execution reverted')) {
       const reasonMatch = msg.match(/reverted\s+with\s+reason\s+(?:"|')([^"']+)(?:"|')/i);
       if (reasonMatch) return reasonMatch[1];
       if (msg.includes('require(false)')) return 'Transaction Reverted';
       return 'Execution Reverted';
    }
    if (lower.includes('estimategas')) return 'Gas estimation failed';
    if (lower.includes('network changed')) return 'Network changed. Please refresh.';
    
    // If it's still too long, cap it
    return msg.length > 60 ? 'Transaction failed. Check console.' : msg;
  }, []);

  const addTransaction = useCallback((tx) => {
    const newTx = {
      id: tx.txHash || `local-${Math.random().toString(16).slice(2, 10)}`,
      timestamp: Date.now(),
      status: 'Success',
      ...tx
    };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const addAiMessage = useCallback((msg) => {
    setAiMessages(prev => [...prev, msg]);
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
    setLastManualUpdates(prev => ({ ...prev, [symbol]: Date.now() }));
    setBalances(prev => ({
      ...prev,
      [symbol]: Math.max(0, (prev[symbol] || 0) + delta)
    }));
  }, []);

  const setTokenBalance = useCallback((symbol, val) => {
    // Only allow contract sync to overwrite if it's been more than 60s since manual adjustment
    const lastManual = lastManualUpdates[symbol] || 0;
    if (Date.now() - lastManual < 60000) return;

    setBalances(prev => ({
      ...prev,
      [symbol]: parseFloat(val)
    }));
  }, [lastManualUpdates]);

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

  const executeAiTransaction = useCallback(async (txType, userMsg, actionDetail, isAuto = false) => {
    if (!address || !provider) throw new Error('Wallet not connected');
    try {
      let signer;
      if (aiPrivateKey) {
        // Use local AI wallet
        const wallet = new ethers.Wallet(aiPrivateKey, provider);
        signer = wallet;
      } else if (isAuto) {
        // For automated triggers, if no AI wallet is provided, we simulate the transaction 
        // silently to provide a seamless demo experience without blocking the UI with popups
        const fakeHash = 'simulated_0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        
        // Handle mock balance updates for simulated transactions
        if (txType === 'Swap') {
          const match = actionDetail.match(/([\d.]+)\s+([A-Z0-9]+)\s+->\s+([A-Z0-9]+)/i);
          if (match) {
            const amount = parseFloat(match[1]);
            const from = match[2].toUpperCase();
            const to = match[3].toUpperCase();
            const rate = globalRates[from]?.[to] || 1;
            const amountOut = amount * rate;

            if (from !== 'ETH') updateBalance(from, -amount);
            if (to !== 'ETH') updateBalance(to, amountOut);
          }
        }
        
        addTransaction({ type: txType, amount: actionDetail, details: 'AI Auto Execution (Simulated)', txHash: fakeHash, source: 'AI Agent' });
        return fakeHash;
      } else {
        // Fallback to MetaMask (will pop up)
        signer = await provider.getSigner();
      }

      let tx;
      let fromToken, toToken, amountVal;

      if (txType === 'Stake') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '10';
        if (parseFloat(amount) < 10) throw new Error('Minimum stake is 10 RIALO');
        tx = await getContract('Staking', signer).stake(ethers.parseEther(amount));
      } else if (txType === 'Bridge') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '1';
        tx = await getContract('RLO', signer).bridgeOut(ethers.parseEther(amount));
      } else if (txType === 'Swap') {
        const match = actionDetail.match(/([\d.]+)\s+([A-Z0-9]+)\s+->\s+([A-Z0-9]+)/i);
        if (match) {
          amountVal = parseFloat(match[1]);
          fromToken = match[2].toUpperCase();
          toToken = match[3].toUpperCase();
          
          if (fromToken === 'RIALO') {
            tx = await getContract('RLO', signer).transfer('0x000000000000000000000000000000000000dEaD', ethers.parseEther(amountVal.toString()));
          } else if (fromToken === 'ETH') {
            // Send to dead address to safely simulate a swap
             tx = await signer.sendTransaction({
                to: '0x000000000000000000000000000000000000dEaD',
                value: ethers.parseEther((amountVal * 1).toString()) // Changed from 0.001 to 1 for full value simulation
             });
          } else {
             // Simulated swap for non-RIALO tokens (e.g. USDC -> RIALO)
             // Send to user's own address instead of contract to avoid revert
             tx = await signer.sendTransaction({
                to: address, 
                value: 0
             });
          }
        }
      }

      if (tx) {
        // Add to history immediately for a "langsung" feel
        addTransaction({ type: txType, amount: actionDetail, details: 'AI Strategy', txHash: tx.hash, source: 'AI Agent' });

        // Resolve early so the AI Agent and Toast show success immediately
        // but still handle the wait and balance updates in background
        tx.wait().then(() => {
          if (txType === 'Swap' && fromToken && toToken) {
            const rate = globalRates[fromToken]?.[toToken] || 1;
            const amountOut = amountVal * rate;
            
            if (fromToken !== 'ETH' && fromToken !== 'RIALO') {
              updateBalance(fromToken, -amountVal);
            }
            if (toToken !== 'ETH' && toToken !== 'RIALO') {
              updateBalance(toToken, amountOut);
            }
            
            if (toToken === 'RIALO') {
              updateBalance('RIALO', amountOut);
            }
            if (toToken === 'ETH') {
              updateBalance('ETH', amountOut);
            }
          }

          if (txType === 'Bridge') {
            const amount = parseFloat(actionDetail.match(/[\d.]+/)?.[0] || '0');
            if (actionDetail.toLowerCase().includes('rialo l1') || actionDetail.toLowerCase().includes('to rialo')) {
               // Bridge Out (Deposit)
               updateBalance('ETH_RIALO', amount);
            } else {
               // Bridge In (Withdraw)
               updateBalance('ETH_RIALO', -amount);
               updateBalance('ETH', amount);
            }
          }

          if (isAuto) {
             addAiMessage({ role: 'ai', content: { raw: `Successfully confirmed background ${txType}: ${actionDetail}` } });
          }
        }).catch(err => {
          console.error("Transaction failed after wait:", err);
        });

        return tx.hash;
      }
      return '0x' + Math.random().toString(16).slice(2, 42);
    } catch (err) { throw err; }
  }, [address, provider, addTransaction, aiPrivateKey, globalRates, updateBalance, addAiMessage]);


  useEffect(() => {
    if (scheduledTxs.length === 0) return;
    const interval = setInterval(() => {
      setScheduledTxs(prev => {
        const next = [];
        prev.forEach(tx => {
          if (tx.remainingSec <= 1) {
            executeAiTransaction(tx.type, tx.userMsg, tx.detail, true).then(txHash => {
              setToast({ message: `Auto ${tx.type} completed!`, detail: tx.detail, txHash: txHash });
            }).catch(err => {
              showToast({ message: `Auto ${tx.type} failed`, detail: err, type: 'error' });
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
        executeAiTransaction('Swap', `Limit Order Triggered: ${detail}`, detail, true)
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
    const finalDetail = toastData.type === 'error' ? simplifyError(toastData.detail) : toastData.detail;
    setToast({ ...toastData, detail: finalDetail });
  }, [simplifyError]);

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
        balances, transactions, globalRates, triggerOrders, updateBalance, setTokenBalance, fetchEthBalance,
        addTransaction, addTriggerOrder, executeAiTransaction,
        scheduledTxs, addScheduledTx, removeScheduledTx, removeTriggerOrder,
        aiPrivateKey, setAiPrivateKey,
        aiMessages, addAiMessage,
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
