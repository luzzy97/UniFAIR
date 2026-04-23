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
    ETH: 3500, BTC: 65000, RIALO: 1, stRLO: 1 / 0.9998, USDC: 1, USDT: 1,
    BNB: 600, SOL: 150, XRP: 0.6, DOGE: 0.15, TRX: 0.12, AVAX: 40, DOT: 8
  });

  const fetchPrices = useCallback(async () => {
    try {
      const ids = 'bitcoin,ethereum,binancecoin,solana,ripple,usd-coin,tether,dogecoin,tron,avalanche-2,polkadot';
      const cgKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-vg5m6nnVU6EsxaAwAKy7TQPv';
      const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&x_cg_demo_api_key=${cgKey}`);
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
          RIALO: 1, // Fixed project value
          stRLO: 1 / 0.9998,
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
  const [balances, setBalances] = useState({ 'ETH': 0, 'RIALO': 0, 'stRLO': 0, 'BTC': 0, 'SOL': 0, 'BNB': 0, 'USDC': 0, 'USDT': 0 });
  const [simulatedDeltas, setSimulatedDeltas] = useState({});

  // SSR-safe defaults — same on server and client.
  const [transactions, setTransactions] = useState([]);
  const [triggerOrders, setTriggerOrders] = useState([]);
  const [scheduledTxs, setScheduledTxs] = useState([]);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', content: { raw: "Welcome! To unlock automated swaps, bridges, and staking, please activate a **Secure Session** by clicking the lock icon (🔓) in the top right. This allows me to execute transactions for you without constant popups!" } }]);
  const [toast, setToast] = useState(null);

  // SHARED credits state — single source of truth across all pages
  const [tickingCredits, setTickingCredits] = useState(0);
  const [pendingCredits, setPendingCredits] = useState(0);
  const [rwaPortfolio, setRwaPortfolio] = useState(0);
  const [rloYield, setRloYield] = useState(0);
  const [stakedBalance, setStakedBalance] = useState('0');
  const [stakedEthBalance, setStakedEthBalance] = useState('0');
  const [tickingRewards, setTickingRewards] = useState(0);
  const [rewardRate, setRewardRate] = useState(0);
  const [totalStaked, setTotalStaked] = useState('0');
  const [lockEnd, setLockEnd] = useState(0);
  const [lockStart, setLockStart] = useState(0);
  const [stakingPositions, setStakingPositions] = useState([]);
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

  // Load credits, rwaPortfolio, and staked balances from localStorage when address changes
  useEffect(() => {
    if (address && typeof window !== 'undefined') {
      if (creditsInitializedForAddress.current !== address) {
        const savedCredits = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
        const savedPendingCredits = parseFloat(localStorage.getItem(`rialo_pending_credits_${address}`) || '0');
        const savedRwa = parseFloat(localStorage.getItem(`rialo_rwa_portfolio_${address}`) || '0');
        const savedRloYield = parseFloat(localStorage.getItem(`rialo_rlo_yield_${address}`) || '0');
        const savedStakedRlo = localStorage.getItem(`rialo_staked_rlo_${address}`) || '0';
        const savedStakedEth = localStorage.getItem(`rialo_staked_eth_${address}`) || '0';
        
        setTickingCredits(savedCredits);
        setPendingCredits(savedPendingCredits);
        setRwaPortfolio(savedRwa);
        setRloYield(savedRloYield);
        setStakedBalance(savedStakedRlo);
        setStakedEthBalance(savedStakedEth);
        setLockEnd(parseInt(localStorage.getItem(`rialo_lock_end_${address}`) || '0'));
        setLockStart(parseInt(localStorage.getItem(`rialo_lock_start_${address}`) || '0'));
        
        const savedPositions = localStorage.getItem(`rialo_staking_positions_${address}`);
        if (savedPositions) {
          setStakingPositions(JSON.parse(savedPositions));
        } else {
          const migratedPositions = [];
          const now = Date.now();
          const savedLockEnd = parseInt(localStorage.getItem(`rialo_lock_end_${address}`) || '0');
          const savedLockStart = parseInt(localStorage.getItem(`rialo_lock_start_${address}`) || '0') || (savedLockEnd - (30 * 24 * 60 * 60 * 1000));
          
          if (parseFloat(savedStakedRlo) > 0) {
            migratedPositions.push({
              id: `legacy-rlo-${now}`,
              amount: savedStakedRlo,
              token: 'RLO',
              lockStart: savedLockStart,
              lockEnd: savedLockEnd,
              timestamp: now
            });
          }
          if (parseFloat(savedStakedEth) > 0) {
            migratedPositions.push({
              id: `legacy-eth-${now + 1}`,
              amount: savedStakedEth,
              token: 'ETH',
              lockStart: savedLockStart,
              lockEnd: savedLockEnd,
              timestamp: now
            });
          }
          setStakingPositions(migratedPositions);
        }
        
        creditsInitializedForAddress.current = address;
      }
    } else if (!address) {
      setTickingCredits(0);
      setPendingCredits(0);
      setRwaPortfolio(0);
      setRloYield(0);
      setStakedBalance('0');
      setStakedEthBalance('0');
      setLockEnd(0);
      setLockStart(0);
      setLockStart(0);
      setStakingPositions([]);
      setTickingRewards(0);
      creditsInitializedForAddress.current = null;
    }
  }, [address]);

  // GLOBAL TICKER: Real-time Credit Generation (DISABLED by user request)
  /*
  useEffect(() => {
    const rloVal = parseFloat(stakedBalance);
    const ethVal = parseFloat(stakedEthBalance);
    
    if (address && (rloVal > 0 || ethVal > 0)) {
      const tickInterval = setInterval(() => {
        const totalRloEq = rloVal + (ethVal * 2000); // 1 ETH = 2000 RLO weight for credits
        const cps = totalRloEq / 3600;
        const increment = cps / 10; // 10 ticks per second (100ms)
        
        setTickingCredits(prev => {
          const nextVal = prev + increment;
          if (typeof window !== 'undefined' && address) {
            localStorage.setItem(`rialo_credits_${address}`, nextVal.toString());
          }
          return nextVal;
        });
      }, 100);
      return () => clearInterval(tickInterval);
    }
  }, [address, stakedBalance, stakedEthBalance]);
  */

  // GLOBAL TICKER: Real-time Reward Ticking
  useEffect(() => {
    const rloVal = parseFloat(stakedBalance);
    const ethVal = parseFloat(stakedEthBalance);
    
    if (rewardRate > 0 && tickingRewards >= 0 && (rloVal > 0 || ethVal > 0)) {
      const tickInterval = setInterval(() => {
        const totalUserStaked = rloVal + (ethVal * 1500); // ETH weighted
        const protocolTotalParsed = parseFloat(totalStaked) || 1000000;
        
        const userShare = totalUserStaked / protocolTotalParsed;
        const yieldPerSecond = rewardRate * userShare;
        const increment = yieldPerSecond / 10; 
        
        setTickingRewards(prev => prev + increment);
      }, 100);
      return () => clearInterval(tickInterval);
    }
  }, [rewardRate, tickingRewards, stakedBalance, stakedEthBalance, totalStaked]);

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
    localStorage.setItem('rialo_balances', JSON.stringify(balances));
    localStorage.setItem('rialo_simulated_deltas', JSON.stringify(simulatedDeltas));
    
    if (address) {
      localStorage.setItem(`rialo_staked_rlo_${address}`, stakedBalance);
      localStorage.setItem(`rialo_staked_eth_${address}`, stakedEthBalance);
      if (lockEnd > 0) localStorage.setItem(`rialo_lock_end_${address}`, lockEnd.toString());
      if (lockStart > 0) localStorage.setItem(`rialo_lock_start_${address}`, lockStart.toString());
      if (lockStart > 0) localStorage.setItem(`rialo_lock_start_${address}`, lockStart.toString());
      localStorage.setItem(`rialo_staking_positions_${address}`, JSON.stringify(stakingPositions));
    }
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
  }, [transactions, triggerOrders, scheduledTxs, aiMessages, balances, simulatedDeltas, aiPrivateKey, sessionActive, sessionExpiry, sessionSigner, stakingPositions]);

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
    if (!toastData) {
      setToast(null);
      return;
    }
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
    
    setSimulatedDeltas(prev => {
      const next = {
        ...prev,
        [symbol]: (prev[symbol] || 0) + d
      };
      // Synchronously update localStorage to avoid race conditions with fetchEthBalance
      if (typeof window !== 'undefined') {
        localStorage.setItem('rialo_simulated_deltas', JSON.stringify(next));
      }
      return next;
    });

    setBalances(prev => {
      const next = {
        ...prev,
        [symbol]: Math.max(0, Number(prev[symbol] || 0) + d)
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('rialo_balances', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const updateBalances = useCallback((deltas) => {
    setSimulatedDeltas(prev => {
        const next = { ...prev };
        for (const [symbol, delta] of Object.entries(deltas)) {
            next[symbol] = (next[symbol] || 0) + Number(delta);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('rialo_simulated_deltas', JSON.stringify(next));
        }
        return next;
    });

    setBalances(prev => {
      const next = { ...prev };
      for (const [symbol, delta] of Object.entries(deltas)) {
        lastManualUpdates.current[symbol] = Date.now();
        next[symbol] = Math.max(0, Number(prev[symbol] || 0) + Number(delta));
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('rialo_balances', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const setTokenBalance = useCallback((symbol, val) => {
    // Contract sync: base + persistent simulated gains
    const baseBal = parseFloat(val);

    // Read deltas from localStorage to avoid stale closure over simulatedDeltas state
    const savedDeltas = typeof window !== 'undefined' ? localStorage.getItem('rialo_simulated_deltas') : null;
    const deltas = savedDeltas ? JSON.parse(savedDeltas) : {};
    const delta = deltas[symbol] || 0;
    
    // Only allow contract sync to overwrite if it's been more than 30s since manual adjustment
    const lastManual = lastManualUpdates.current[symbol] || 0;
    if (Date.now() - lastManual < 30000) return;

    setBalances(prev => ({
      ...prev,
      [symbol]: baseBal + delta
    }));
  }, []);

  const fetchEthBalance = useCallback(async (addr, prov) => {
    try {
      const bal = await prov.getBalance(addr);
      const baseBal = parseFloat(ethers.formatEther(bal));

      setBalances(prev => {
        // Read deltas from localStorage to avoid stale closure over simulatedDeltas state
        const savedDeltas = typeof window !== 'undefined' ? localStorage.getItem('rialo_simulated_deltas') : null;
        const deltas = savedDeltas ? JSON.parse(savedDeltas) : {};
        const delta = deltas['ETH'] || 0;

        // Only allow ETH contract sync to overwrite if it's been more than 30s since manual adjustment
        const lastManual = lastManualUpdates.current['ETH'] || 0;
        if (Date.now() - lastManual < 30000) return prev; // Preserve simulated balance
        
        return { 
          ...prev, 
          'ETH': baseBal + delta  // base chain balance + persistent simulated gains
        };
      });
    } catch (err) {
      console.error('Error fetching ETH balance:', err);
    }
  }, []);

  const switchNetwork = useCallback(async (targetChainId = SEPOLIA_CHAIN_ID, chainConfig = null) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const hexChainId = '0x' + targetChainId.toString(16);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      } catch (err) {
        if (err.code === 4902) {
          try {
            const defaultConfig = {
              chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16),
              chainName: 'Sepolia Test Network',
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            };
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig || defaultConfig],
            });
          } catch (addError) {
            console.error('Error adding chain:', addError);
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
      const message = `Authorize UniFAIR AI Session\n\n` +
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
    // Silently check if already authorized — MetaMask can throw if locked/unavailable
    window.ethereum.request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (accounts.length > 0) connect();
      })
      .catch((err) => {
        // Swallow MetaMask extension errors (e.g. "Failed to connect to MetaMask")
        // so they don't surface as unhandled runtime errors in the Next.js overlay
        console.warn('[useWallet] Auto-connect skipped:', err?.message || err);
      });
  }, []);

  const executeAiTransaction = useCallback(async (txType, userMsg, actionDetail, isAuto = false, gasType = 'ETH') => {
    if (!address || !provider) throw new Error('Wallet not connected');
    try {
      // Parse swap details BEFORE branching so all code paths share the same variables
      let parsedFromToken = null, parsedToToken = null, parsedAmountVal = null, parsedAmountOut = null;
      let displayAmount = actionDetail; // Use original by default
      if (txType === 'Swap') {
        const match = actionDetail.match(/([\d.]+)\s+([A-Z0-9]+)\s+(?:->|to)\s+(?:[\d.]+\s+)?([A-Z0-9]+)/i);
        if (match) {
          parsedAmountVal = parseFloat(match[1]);
          parsedFromToken = match[2].toUpperCase();
          parsedToToken   = match[3].toUpperCase();
          const rate = globalRates[parsedFromToken]?.[parsedToToken] || 1;
          parsedAmountOut = parsedAmountVal * rate;
          displayAmount = `${parsedAmountVal} ${parsedFromToken} -> ${parseFloat(parsedAmountOut.toFixed(4))} ${parsedToToken}`;
        }
      } else if (txType === 'Send') {
        const match = actionDetail.match(/([\d.]+)\s+([A-Z0-9]+)\s+to\s+(0x[a-fA-F0-9]+)/i);
        if (match) {
          parsedAmountVal = parseFloat(match[1]);
          parsedFromToken = match[2].toUpperCase();
          displayAmount = `${parsedAmountVal} ${parsedFromToken} to ${match[3].slice(0, 6)}...`;
        }
      } else {
         const match = actionDetail.match(/[\d.]+/);
         if (match) parsedAmountVal = parseFloat(match[0]);
      }

      // Handling Credit Gas Logic
      // NOTE: When isAuto === true (scheduled tx or trigger order firing), credits were already
      // charged upfront at scheduling time (5 chat + 5 automation = 10 total). We only deduct
      // the extra 5 here for direct, user-initiated credit-gas actions (isAuto === false).
      let paidWithCredits = false;
      if (gasType === 'CREDIT') {
         if (!isAuto) {
           // Only deduct if NOT an automated event — avoids double-charging the 10-credit fee
           const creditCost = 5; // 5 Credits per direct AI action
           const currentCredits = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
           if (currentCredits < creditCost) {
              throw new Error(`Insufficient Service Credits. Required: ${creditCost} Credits, Available: ${Math.floor(currentCredits)} Credits`);
           }
           await deductCredits(creditCost);
         }
         paidWithCredits = true; // Always mark for correct tx labelling
         // Do NOT return early. Continue to attempt on-chain signal if possible.
      }

      let signer;
      let isOnChain = false;

      // Prefer Session Signer for autonomous or credit-based actions
      if (sessionActive && sessionSigner && sessionExpiry && Date.now() < sessionExpiry) {
        const sessionBal = await provider.getBalance(sessionSigner.address);
        if (sessionBal > ethers.parseEther('0.0005')) { // Lowered min for signal tx
          signer = sessionSigner;
          isOnChain = true;
        }
      }

      // Fallback/Logic for CREDIT payments
      if (paidWithCredits && !signer) {
         // If no session wallet with ETH is available, we must fallback to simulation
         if (txType === 'Swap' && parsedFromToken && parsedToToken) {
           updateBalances({ [parsedFromToken]: -parsedAmountVal, [parsedToToken]: parsedAmountOut });
         } else if (txType === 'Stake' || txType === 'Bridge') {
           const token = txType === 'Stake' ? 'RIALO' : (actionDetail.toUpperCase().includes('ETH') ? 'ETH' : 'RIALO');
           updateBalance(token, -parsedAmountVal);
           if (txType === 'Bridge') updateBalance(token === 'ETH' ? 'RIALO' : 'ETH', parsedAmountVal);
         }
         const simulatedHash = 'simulated_' + Date.now();
         addTransaction({ type: txType, amount: displayAmount, details: 'AI Strategy (Credits)', txHash: simulatedHash, source: 'AI Agent' });
         return { hash: simulatedHash, detail: displayAmount };
      }

      if (!signer && isAuto) {
        if (txType === 'Swap' && parsedFromToken && parsedToToken && parsedAmountVal) {
          updateBalances({ [parsedFromToken]: -parsedAmountVal, [parsedToToken]: parsedAmountOut });
        }
        const simulatedHash = 'simulated_' + Date.now();
        addTransaction({ type: txType, amount: displayAmount, details: `AI Strategy Execution (Sim)`, txHash: simulatedHash, source: 'AI Agent' });
        return { hash: simulatedHash, detail: displayAmount };
      } else if (!signer) {
        signer = await provider.getSigner();
        isOnChain = true;
      }

      let tx;
      // For CREDIT payments, we ALWAYS use Signal Transaction to ensure recording on-chain
      if (paidWithCredits || (signer === sessionSigner)) {
         tx = await signer.sendTransaction({
            to: '0x000000000000000000000000000000000000dEaD',
            value: 0
         });
      } else if (txType === 'Stake') {
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
      } else if (txType === 'Send') {
        if (parsedAmountVal && parsedFromToken) {
          if (signer === sessionSigner || paidWithCredits) {
            tx = await signer.sendTransaction({ to: '0x000000000000000000000000000000000000dEaD', value: 0 });
          } else if (parsedFromToken === 'ETH') {
            tx = await signer.sendTransaction({ to: '0x000000000000000000000000000000000000dEaD', value: ethers.parseEther(parsedAmountVal.toString()) });
          } else {
             tx = await signer.sendTransaction({ to: address, value: 0 });
          }
        }
      }

      if (tx) {
        // Add to history immediately for instant feedback
        // Determine label based on gas type
        const txDetails = paidWithCredits ? 'AI Strategy (Credits)' : 'AI Strategy';
        addTransaction({ type: txType, amount: displayAmount, details: txDetails, txHash: tx.hash, source: 'AI Agent' });

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

        if (txType === 'Stake' && parsedAmountVal) {
          const isEth = displayAmount.toUpperCase().includes('ETH');
          updateBalance(isEth ? 'ETH' : 'RIALO', -parsedAmountVal);
        }

        if (txType === 'Send' && parsedAmountVal && parsedFromToken) {
          updateBalance(parsedFromToken, -parsedAmountVal);
        }

        // Wait for actual chain confirmation softly in the background
        tx.wait().then(() => {
          if (isAuto) {
            addAiMessage({ 
              role: 'ai', 
              content: { 
                raw: `Successfully confirmed background ${txType} on-chain: ${displayAmount}`,
                hash: tx.hash 
              } 
            });
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
      return { hash: 'simulated_' + Date.now(), detail: displayAmount };
    } catch (err) { throw err; }
  }, [address, provider, addTransaction, updateBalances, aiPrivateKey, globalRates, updateBalance, addAiMessage]);


  useEffect(() => {
    if (scheduledTxs.length === 0) return;
    const interval = setInterval(() => {
      // 1. Identify tasks that reached execution time
      const readyToExecute = scheduledTxs.filter(tx => tx.remainingSec <= 1);
      
      if (readyToExecute.length > 0) {
        // 2. Remove them from state FIRST
        setScheduledTxs(prev => prev.filter(tx => tx.remainingSec > 1));
        
        // 3. Execute them sequentially
        readyToExecute.forEach(tx => {
          executeAiTransaction(tx.type, tx.userMsg, tx.detail, true, tx.gasType || 'ETH')
            .then(res => {
              showToast({ 
                message: "Blockchain operation successful!", 
                detail: `${tx.type}: ${res.detail || tx.detail}`,
                txHash: res.hash
              });
            })
            .catch(err => {
              // Extract the most readable error message
              const errorDetail = err.reason || err.message || "Unknown error";
              showToast({ 
                message: `Auto ${tx.type} failed`, 
                detail: errorDetail, 
                type: 'error' 
              });
            });
        });
      } else {
        // Just tick the countdown for others
        setScheduledTxs(prev => 
          prev.map(tx => ({ ...tx, remainingSec: Math.max(0, tx.remainingSec - 1) }))
        );
      }
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

  // Shared addCredits — adds credits earned from staking yield router
  const addCredits = useCallback(async (amount) => {
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0 || !address) return;

    setTickingCredits(prev => {
      const next = prev + addAmt;
      localStorage.setItem(`rialo_credits_${address}`, next.toString());
      return next;
    });

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const storedVal = parseFloat(localStorage.getItem(`rialo_credits_${address}`) || '0');
      await fetch(`${baseUrl}/api/user-staking/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: storedVal })
      });
    } catch (e) {
      console.warn('[WalletProvider] Credit addition backend sync failed:', e);
    }
  }, [address]);

  const addPendingCredits = useCallback((amount) => {
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0 || !address) return;

    setPendingCredits(prev => {
      const next = prev + addAmt;
      localStorage.setItem(`rialo_pending_credits_${address}`, next.toString());
      return next;
    });
  }, [address]);

  const claimCredits = useCallback(async () => {
    if (!address || pendingCredits <= 0) return;

    const amount = pendingCredits;
    // Reset pending immediately for UI snappiness
    setPendingCredits(0);
    localStorage.removeItem(`rialo_pending_credits_${address}`);

    // Add to main balance
    await addCredits(amount);
    
    return amount;
  }, [address, pendingCredits, addCredits]);

  // Shared addRwaPortfolio — accumulates RWA yield earned from Payout in RWA staking
  const addRwaPortfolio = useCallback((amount) => {
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0 || !address) return;
    setRwaPortfolio(prev => {
      const next = prev + addAmt;
      localStorage.setItem(`rialo_rwa_portfolio_${address}`, next.toString());
      return next;
    });
  }, [address]);

  // Shared addRloYield — accumulates RLO yield earned from Payout in RLO staking
  const addRloYield = useCallback((amount) => {
    const addAmt = parseFloat(amount);
    if (isNaN(addAmt) || addAmt <= 0 || !address) return;
    setRloYield(prev => {
      const next = prev + addAmt;
      localStorage.setItem(`rialo_rlo_yield_${address}`, next.toString());
      return next;
    });
  }, [address]);

  // Purchase AI Access — deducts 5 credits for 7 days
  const purchaseAiAccess = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    const cost = 5;
    // Deprecated for Pay-per-Chat
    return true;
  }, []);

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
        tickingCredits, setTickingCredits,
        pendingCredits,
        addCredits,
        addPendingCredits,
        claimCredits,
        deductCredits,
        rwaPortfolio, addRwaPortfolio,
        rloYield, addRloYield,
        stakedBalance, setStakedBalance, stakedEthBalance, setStakedEthBalance, 
        tickingRewards, setTickingRewards, rewardRate, setRewardRate, totalStaked, setTotalStaked,
        lockEnd, setLockEnd, lockStart, setLockStart,
        stakingPositions, setStakingPositions
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
