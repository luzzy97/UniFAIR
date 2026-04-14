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
  const [aiPrivateKey, setAiPrivateKey] = useState(null); // Deprecated in favor of Session Keys
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [sessionSigner, setSessionSigner] = useState(null);

  const [basePrices, setBasePrices] = useState({
    ETH: 3500, BTC: 65000, RIALO: 3, USDC: 1, USDT: 1,
    BNB: 600, SOL: 150, XRP: 0.6, DOGE: 0.15, TRX: 0.12, AVAX: 40, DOT: 8
  });

  const fetchPrices = useCallback(async () => {
    try {
      const ids = 'bitcoin,ethereum,binancecoin,solana,ripple,usd-coin,tether,dogecoin,tron,avalanche-2,polkadot';
      const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const data = await resp.json();
      if (data) {
        setBasePrices(prev => ({
          ...prev,
          BTC: data.bitcoin?.usd || prev.BTC,
          ETH: data.ethereum?.usd || prev.ETH,
          BNB: data.binancecoin?.usd || prev.BNB,
          SOL: data.solana?.usd || prev.SOL,
          XRP: data.ripple?.usd || prev.XRP,
          DOGE: data.dogecoin?.usd || prev.DOGE,
          TRX: data.tron?.usd || prev.TRX,
          AVAX: data['avalanche-2']?.usd || prev.AVAX,
          DOT: data.polkadot?.usd || prev.DOT,
          RIALO: 3, // Fixed project value
          USDC: 1, 
          USDT: 1
        }));
      }
    } catch (err) {
      console.error('Error fetching prices from CoinGecko:', err);
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
  const [simulatedDeltas, setSimulatedDeltas] = useState({});

  // SSR-safe defaults — same on server and client.
  const [transactions, setTransactions] = useState([]);
  const [triggerOrders, setTriggerOrders] = useState([]);
  const [scheduledTxs, setScheduledTxs] = useState([]);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', content: { raw: "Rialo AI is online. How can I optimize your on-chain operations today?" } }]);
  const [toast, setToast] = useState(null);

  // SHARED credits state — single source of truth across all pages
  const [tickingCredits, setTickingCredits] = useState(0);
  const creditsInitializedForAddress = useRef(null);
  
  // Track last manual update per token to prevent immediate contract sync overwrites in demo
  const lastManualUpdates = useRef({});

  // STEP 1: After mount, load all saved data from localStorage into state.
  // This runs only on the client, after hydration, so there's no SSR mismatch.
  useEffect(() => {
    const savedBalances = localStorage.getItem('rialo_balances');
    if (savedBalances) setBalances(JSON.parse(savedBalances));

    const savedDeltas = localStorage.getItem('rialo_simulated_deltas');
    if (savedDeltas) setSimulatedDeltas(JSON.parse(savedDeltas));

    const savedTxs = localStorage.getItem('rialo_transactions');
    if (savedTxs) setTransactions(JSON.parse(savedTxs));

    const savedOrders = localStorage.getItem('rialo_trigger_orders');
    if (savedOrders) setTriggerOrders(JSON.parse(savedOrders));

    const savedScheduled = localStorage.getItem('rialo_scheduled_txs');
    if (savedScheduled) setScheduledTxs(JSON.parse(savedScheduled));

    const savedMessages = localStorage.getItem('rialo_ai_messages');
    if (savedMessages) setAiMessages(JSON.parse(savedMessages));

    const savedSessionActive = localStorage.getItem('rialo_session_active');
    const savedSessionExpiry = localStorage.getItem('rialo_session_expiry');
    const savedSessionKey    = localStorage.getItem('rialo_session_key');

    if (savedSessionActive === 'true' && savedSessionExpiry && savedSessionKey) {
      const expiry = parseInt(savedSessionExpiry);
      if (expiry > Date.now()) {
        setSessionActive(true);
        setSessionExpiry(expiry);
        // Regenerate signer on next tick once provider is ready or wait
      } else {
        localStorage.removeItem('rialo_session_active');
        localStorage.removeItem('rialo_session_expiry');
        localStorage.removeItem('rialo_session_key');
      }
    }

  }, []);

  // Load credits from localStorage when address changes
  useEffect(() => {
    if (address && typeof window !== 'undefined') {
      if (creditsInitializedForAddress.current !== address) {
        const saved = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
        setTickingCredits(saved);
        creditsInitializedForAddress.current = address;
      }
    } else if (!address) {
      setTickingCredits(0);
      creditsInitializedForAddress.current = null;
    }
  }, [address]);

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
    localStorage.setItem('rialo_simulated_deltas', JSON.stringify(simulatedDeltas));
    // Note: aiPrivateKey is no longer persisted as we moved to ephemeral Session Keys
    // Session Persistence
    if (sessionActive && sessionExpiry && sessionSigner) {
      localStorage.setItem('rialo_session_active', 'true');
      localStorage.setItem('rialo_session_expiry', sessionExpiry.toString());
      localStorage.setItem('rialo_session_key', sessionSigner.privateKey);
    } else if (!sessionActive) {
      localStorage.removeItem('rialo_session_active');
      localStorage.removeItem('rialo_session_expiry');
      localStorage.removeItem('rialo_session_key');
    }
  }, [transactions, triggerOrders, scheduledTxs, aiMessages, balances, simulatedDeltas, aiPrivateKey, sessionActive, sessionExpiry, sessionSigner]);

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
    const d = Number(delta);
    lastManualUpdates.current[symbol] = Date.now();
    
    setSimulatedDeltas(prev => ({
      ...prev,
      [symbol]: (prev[symbol] || 0) + d
    }));

    setBalances(prev => ({
      ...prev,
      [symbol]: Math.max(0, Number(prev[symbol] || 0) + d)
    }));
  }, []);

  const updateBalances = useCallback((deltas) => {
    setSimulatedDeltas(prev => {
        const next = { ...prev };
        for (const [symbol, delta] of Object.entries(deltas)) {
            next[symbol] = (next[symbol] || 0) + Number(delta);
        }
        return next;
    });

    setBalances(prev => {
      const next = { ...prev };
      for (const [symbol, delta] of Object.entries(deltas)) {
        lastManualUpdates.current[symbol] = Date.now();
        next[symbol] = Math.max(0, Number(prev[symbol] || 0) + Number(delta));
      }
      return next;
    });
  }, []);

  const setTokenBalance = useCallback((symbol, val) => {
    // Contract sync: base + persistent simulated gains
    const baseBal = parseFloat(val);
    const delta = simulatedDeltas[symbol] || 0;
    
    // Only allow contract sync to overwrite if it's been more than 30s since manual adjustment
    const lastManual = lastManualUpdates.current[symbol] || 0;
    if (Date.now() - lastManual < 30000) return;

    setBalances(prev => ({
      ...prev,
      [symbol]: baseBal + delta
    }));
  }, [simulatedDeltas]);

  const fetchEthBalance = useCallback(async (addr, prov) => {
    try {
      const bal = await prov.getBalance(addr);
      
      setBalances(prev => {
        const delta = simulatedDeltas['ETH'] || 0;
        const baseBal = parseFloat(ethers.formatEther(bal));

        // Only allow ETH contract sync to overwrite if it's been more than 30s since manual adjustment
        const lastManual = lastManualUpdates.current['ETH'] || 0;
        if (Date.now() - lastManual < 30000) return prev; // Preserve simulated balance
        
        return { 
          ...prev, 
          'ETH': baseBal + delta
        };
      });
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

  const activateSession = useCallback(async (durationHours = 1) => {
    if (!address || !provider) throw new Error('Wallet not connected');
    
    try {
      // 1. Recover or Generate Ephemeral Session Key
      let ephemeralWallet;
      const savedKey = localStorage.getItem('rialo_session_key');
      if (savedKey) {
        try {
          ephemeralWallet = new ethers.Wallet(savedKey, provider);
        } catch (e) {
          console.error("Failed to recover saved session key:", e);
          ephemeralWallet = ethers.Wallet.createRandom().connect(provider);
        }
      } else {
        ephemeralWallet = ethers.Wallet.createRandom().connect(provider);
      }
      
      // 2. Request Authorization Signature (EIP-191)
      const signer = await provider.getSigner();
      const message = `Authorize Rialo AI Session\n\n` +
                      `Duration: ${durationHours} Hour(s)\n` +
                      `Scope: Swap, Bridge, Stake\n` +
                      `Session Wallet: ${ephemeralWallet.address}\n\n` +
                      `This allows AI to execute transactions without popups and maintains your gas balance.`;
      
      await signer.signMessage(message);
      
      // 3. Activate
      const expiry = Date.now() + (durationHours * 3600 * 1000);
      setSessionSigner(ephemeralWallet);
      setSessionActive(true);
      setSessionExpiry(expiry);
      
      // Persist for restoration
      localStorage.setItem('rialo_session_key', ephemeralWallet.privateKey);
      localStorage.setItem('rialo_session_expiry', expiry.toString());
      localStorage.setItem('rialo_session_active', 'true');
      
      return { address: ephemeralWallet.address, expiry };
    } catch (err) {
      console.error('Session activation failed:', err);
      throw err;
    }
  }, [address, provider]);

  const seedSession = useCallback(async (amountEth = '0.01') => {
    if (!address || !sessionSigner || !provider) throw new Error('Session not active');
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({
      to: sessionSigner.address,
      value: ethers.parseEther(amountEth)
    });
    return tx.wait();
  }, [address, sessionSigner, provider]);

  const withdrawSessionBalance = useCallback(async () => {
    if (!sessionSigner || !address || !provider) throw new Error('No active session or session wallet');
    
    try {
      const balance = await provider.getBalance(sessionSigner.address);
      const gasLimit = 21000n;
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
      const totalGasCost = gasLimit * gasPrice;
      
      if (balance <= totalGasCost) {
        throw new Error('Insufficient balance to cover gas for withdrawal');
      }

      const sweepAmount = balance - totalGasCost;
      const sweepTx = await sessionSigner.sendTransaction({
        to: address,
        value: sweepAmount,
        gasLimit: gasLimit,
        gasPrice: gasPrice
      });

      showToast({ 
        message: "Withdrawing Funds...", 
        detail: `${ethers.formatEther(sweepAmount).slice(0, 7)} ETH returning to your main wallet.`,
        txHash: sweepTx.hash 
      });

      return sweepTx.wait();
    } catch (err) {
      console.error('Withdrawal failed:', err);
      throw err;
    }
  }, [sessionSigner, address, provider, showToast]);

  const deactivateSession = useCallback(async () => {
    setSessionActive(false);
    setSessionExpiry(null);
    setSessionSigner(null);
    localStorage.removeItem('rialo_session_active');
    localStorage.removeItem('rialo_session_expiry');
    // We intentionally DO NOT remove 'rialo_session_key' here to allow balance persistence for next time
  }, []);

  // Restore Session Signer once provider is available
  useEffect(() => {
    if (provider && !sessionSigner) {
      const savedKey = localStorage.getItem('rialo_session_key');
      const savedExt = localStorage.getItem('rialo_session_expiry');
      if (savedKey && savedExt && parseInt(savedExt) > Date.now()) {
        try {
          const wallet = new ethers.Wallet(savedKey, provider);
          setSessionSigner(wallet);
          setSessionActive(true);
          setSessionExpiry(parseInt(savedExt));
        } catch (e) {
          console.error("Failed to restore session signer:", e);
        }
      }
    }
  }, [provider, sessionSigner]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts.length > 0) connect();
    });
  }, []);

  const executeAiTransaction = useCallback(async (txType, userMsg, actionDetail, isAuto = false, gasType = 'ETH') => {
    if (!address || !provider) throw new Error('Wallet not connected');
    try {
      // Parse swap details BEFORE branching so all code paths share the same variables
      let parsedFromToken = null, parsedToToken = null, parsedAmountVal = null, parsedAmountOut = null;
      let displayAmount = actionDetail; // Use original by default
      if (txType === 'Swap') {
        const match = actionDetail.match(/([\d.]+)\s+([A-Z0-9]+)\s+->\s+(?:[\d.]+\s+)?([A-Z0-9]+)/i);
        if (match) {
          parsedAmountVal = parseFloat(match[1]);
          parsedFromToken = match[2].toUpperCase();
          parsedToToken   = match[3].toUpperCase();
          const rate = globalRates[parsedFromToken]?.[parsedToToken] || 1;
          parsedAmountOut = parsedAmountVal * rate;
          displayAmount = `${parsedAmountVal} ${parsedFromToken} -> ${parseFloat(parsedAmountOut.toFixed(4))} ${parsedToToken}`;
        }
      } else {
         const match = actionDetail.match(/[\d.]+/);
         if (match) parsedAmountVal = parseFloat(match[0]);
      }

      // Handling Credit Gas Logic
      if (gasType === 'CREDIT') {
         const creditCost = 0.05; // Flat fee per swap as requested
         const currentCredits = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
         if (currentCredits < creditCost) {
            throw new Error(`Insufficient Service Credits. Required: ${creditCost} ϕ, Available: ${currentCredits.toFixed(2)} ϕ`);
         }
         
         await deductCredits(creditCost);
         
         if (txType === 'Swap' && parsedFromToken && parsedToToken) {
           updateBalances({ [parsedFromToken]: -parsedAmountVal, [parsedToToken]: parsedAmountOut });
         } else if (txType === 'Stake' || txType === 'Bridge') {
           const token = txType === 'Stake' ? 'RIALO' : (actionDetail.toUpperCase().includes('ETH') ? 'ETH' : 'RIALO');
           updateBalance(token, -parsedAmountVal);
           if (txType === 'Bridge') updateBalance(token === 'ETH' ? 'RIALO' : 'ETH', parsedAmountVal);
         }

         addTransaction({ type: txType, amount: displayAmount, details: `AI Strategy (Paid with Credits)`, txHash: null, source: 'AI Agent' });
         
         if (txType === 'Stake') {
            const isEth = displayAmount.toUpperCase().includes('ETH');
            const key = isEth ? 'rialo_staked_eth' : 'rialo_staked_rlo';
            const current = parseFloat(localStorage.getItem(key) || '0');
            localStorage.setItem(key, (current + parsedAmountVal).toString());
         }
         return { hash: null, detail: displayAmount };
      }

      let signer;
      let isOnChain = false;

      if (sessionActive && sessionSigner && sessionExpiry && Date.now() < sessionExpiry) {
        const sessionBal = await provider.getBalance(sessionSigner.address);
        if (sessionBal > ethers.parseEther('0.001')) {
          signer = sessionSigner;
          isOnChain = true;
        }
      }

      if (!signer && isAuto) {
        if (txType === 'Swap' && parsedFromToken && parsedToToken && parsedAmountVal) {
          updateBalances({ [parsedFromToken]: -parsedAmountVal, [parsedToToken]: parsedAmountOut });
        }
        addTransaction({ type: txType, amount: displayAmount, details: `AI Strategy Execution`, txHash: null, source: 'AI Agent' });
        return { hash: null, detail: displayAmount };
      } else if (!signer) {
        signer = await provider.getSigner();
        isOnChain = true;
      }

      let tx;
      if (txType === 'Stake') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '10';
        if (parseFloat(amount) < 10) throw new Error('Minimum stake is 10 RIALO');
        
        if (signer === sessionSigner) {
          tx = await signer.sendTransaction({ to: '0x000000000000000000000000000000000000dEaD', value: 0 });
        } else {
          tx = await getContract('Staking', signer).stake(ethers.parseEther(amount));
        }
      } else if (txType === 'Bridge') {
        const amount = actionDetail.match(/[\d.]+/)?.[0] || '1';
        
        if (signer === sessionSigner) {
          // AI Signal Transaction
          tx = await signer.sendTransaction({
            to: '0x000000000000000000000000000000000000dEaD',
            value: 0
          });
        } else {
          tx = await getContract('RLO', signer).bridgeOut(ethers.parseEther(amount));
        }
      } else if (txType === 'Swap') {
        if (parsedFromToken && parsedToToken && parsedAmountVal !== null) {
          if (signer === sessionSigner) {
            // AI Signal Transaction for ALL swaps to guarantee success and real hash
            tx = await signer.sendTransaction({
              to: '0x000000000000000000000000000000000000dEaD',
              value: 0
            });
          } else if (parsedFromToken === 'RIALO') {
            tx = await getContract('RLO', signer).transfer(
              '0x000000000000000000000000000000000000dEaD',
              ethers.parseEther(parsedAmountVal.toString())
            );
          } else if (parsedFromToken === 'ETH') {
            tx = await signer.sendTransaction({
              to: '0x000000000000000000000000000000000000dEaD',
              value: ethers.parseEther(parsedAmountVal.toString())
            });
          } else {
            tx = await signer.sendTransaction({
              to: address,
              value: 0
            });
          }
        } else {
          tx = await signer.sendTransaction({ to: address, value: 0 });
        }
      }

      if (tx) {
        // Add to history immediately for instant feedback
        addTransaction({ type: txType, amount: displayAmount, details: 'AI Strategy', txHash: tx.hash, source: 'AI Agent' });

        // Optimistically update balances immediately for a snappy UX
        if (txType === 'Swap' && parsedFromToken && parsedToToken && parsedAmountVal !== null) {
          updateBalances({
            [parsedFromToken]: -parsedAmountVal,
            [parsedToToken]:   parsedAmountOut
          });
        }
        if (txType === 'Bridge' && actionDetail) {
          const amount = parseFloat(actionDetail.match(/[\d.]+/)?.[0] || '0');
          const detailLower = actionDetail.toLowerCase();
          if (detailLower.includes('rialo l1') || detailLower.includes('to rialo')) {
            updateBalances({ 'ETH': -amount, 'ETH_RIALO': amount });
          } else if (detailLower.includes('from rialo') || detailLower.includes('to eth')) {
            updateBalances({ 'ETH_RIALO': -amount, 'ETH': amount });
          }
        }

        // Wait for actual chain confirmation softly in the background
        tx.wait().then(() => {
          if (isAuto) {
            addAiMessage({ role: 'ai', content: { raw: `Successfully confirmed background ${txType} on-chain: ${displayAmount}` } });
          }
          
          // Persistence for simulated stakes (especially for AI signal txs)
          if (txType === 'Stake') {
            const amountStr = displayAmount.match(/[\d.]+/)?.[0] || '10';
            const amountFloat = parseFloat(amountStr);
            const isEth = displayAmount.toUpperCase().includes('ETH');
            const key = isEth ? 'rialo_staked_eth' : 'rialo_staked_rlo';
            const current = parseFloat(localStorage.getItem(key) || '0');
            localStorage.setItem(key, (current + amountFloat).toString());
          }
        }).catch(err => {
          console.error('Transaction failed after wait:', err);
        });

        return { hash: tx.hash, detail: displayAmount };
      }
      return { hash: null, detail: displayAmount };
    } catch (err) { throw err; }
  }, [address, provider, addTransaction, updateBalances, aiPrivateKey, globalRates, updateBalance, addAiMessage]);


  useEffect(() => {
    if (scheduledTxs.length === 0) return;
    const interval = setInterval(() => {
      setScheduledTxs(prev => {
        const next = [];
        prev.forEach(tx => {
          if (tx.remainingSec <= 1) {
            executeAiTransaction(tx.type, tx.userMsg, tx.detail, true).then(res => {
              setToast({ message: `Auto ${tx.type} completed!`, detail: res.detail, txHash: res.hash });
            }).catch(err => {
              showToast({ message: `Auto ${tx.type} failed`, detail: err.message, type: 'error' });
            });
          } else {
            next.push({ ...tx, remainingSec: tx.remainingSec - 1 });
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [scheduledTxs, executeAiTransaction, showToast]);

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
          .then(res => {
            setToast({ message: `Limit Order Executed!`, detail: res.detail, txHash: res.hash });
            setTriggerOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'Executed', executedRate: currentRate, txHash: res.hash } : o));
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

  useEffect(() => {
    if (address && provider && chainId === SEPOLIA_CHAIN_ID) {
      const interval = setInterval(() => fetchEthBalance(address, provider), 15000);
      return () => clearInterval(interval);
    }
  }, [address, provider, chainId, fetchEthBalance]);

  // Shared deductCredits — updates the global tickingCredits state and persists to storage+backend
  const deductCredits = useCallback(async (amount) => {
    const deductAmt = parseFloat(amount);
    if (isNaN(deductAmt) || deductAmt <= 0 || !address) return;

    setTickingCredits(prev => {
      const next = Math.max(0, prev - deductAmt);
      localStorage.setItem(`rialo_credits_${address}`, next.toString());
      return next;
    });

    // Sync to backend after a short delay to let state settle
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      // Read updated value directly from localStorage (it was already updated with deduction)
      const storedVal = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
      await fetch(`${baseUrl}/api/user-staking/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: storedVal })
      });
    } catch (e) {
      console.warn('[WalletProvider] Credit deduction backend sync failed:', e);
    }
  }, [address]);

  return (
    <WalletContext.Provider
      value={{ 
        address, provider, chainId, connecting, error, connect, disconnect, switchNetwork,
        isWrongNetwork: chainId !== null && chainId !== SEPOLIA_CHAIN_ID,
        shortAddress: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
        isConnected: !!address,
        balances, transactions, globalRates, triggerOrders, updateBalance, updateBalances, setTokenBalance, fetchEthBalance,
        addTransaction, addTriggerOrder, executeAiTransaction,
        scheduledTxs, addScheduledTx, removeScheduledTx, removeTriggerOrder,
        aiPrivateKey, setAiPrivateKey,
        sessionActive, sessionExpiry, sessionSigner, activateSession, deactivateSession, seedSession, withdrawSessionBalance,
        aiMessages, addAiMessage,
        toast, showToast,
        tickingCredits, setTickingCredits, deductCredits
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
