"use client";

import { useState, useEffect } from "react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import { useRouter } from 'next/router';
import { Droplet, Info, Route, Plus, Activity, Loader2, CheckCircle2, AlertCircle, CreditCard, Landmark, Building2, ArrowRight, ArrowUpDown, Flame } from "lucide-react";
import { ethers } from "ethers";
import deployedContracts from '../lib/contracts/deployedContracts.json';

// ── XAUt Contract Config (from deployedContracts.json) ────────────────────────â”€
const XAUT_ADDRESS: string = deployedContracts.address.XAUt;
const XAUT_ABI = deployedContracts.abi.XAUt;

// ── Mock live gold price (1 troy oz in USD) â€” replace with Chainlink feed on mainnet ──
const LIVE_GOLD_PRICE_USD = 2340.50;

type Path = {
  address: string;
  amount: number;
};

type AssetType = 'solo_rlo' | 'pair' | 'solo_eth';
type PayoutType = 'rlo' | 'rwa';

interface StakingPosition {
  id: string;
  assetType: AssetType;
  amountRlo: number;
  amountEth: number;
  startTime: number;
  lockDuration: number;
  lockEnd: number;
  txHash: string | null;
}


export default function Home() {
  const router = useRouter();
  const { isConnected, address, provider, connect, balances: walletBalances, addTransaction, fetchEthBalance, updateBalance, addCredits, addPendingCredits } = useWallet();
  const { balance: rloBal, fetchBalance: fetchRloBalance } = useRLO();
  const {
    stakedBalance: stakedBalStr,
    stakedEthBalance: stakedEthBalStr,
    pendingRewards: pendingRewStr,
    totalStaked: totalProtStakedStr,
    sfsFraction: contractSfsFraction,
    rwaAllocation: contractRwaAllocation,
    rwaTarget: contractRwaTarget,
    loading: stakingLoading,
    stakeRlo,
    stakeEth,
    stakePair,
    withdraw,
    withdrawAmount,
    claimRewards: claimAction,
    updateSfsFraction,
    updateRwaAllocation,
    fetchStakingData,
    setGlobalRwaYieldUsd,
  } = useStaking();

  const { sessionActive, activateSession, seedSession, showToast: walletToast } = useWallet();

  const [rloAmount, setRloAmount] = useState<string>("");
  const [ethAmount, setEthAmount] = useState<string>("0");
  const [assetType, setAssetType] = useState<AssetType>('solo_rlo');
  const [payoutType, setPayoutType] = useState<PayoutType>('rlo');
  const [sfsFraction, setSfsFraction] = useState<number>(50);
  const [lockDuration, setLockDuration] = useState<number>(1);
  const [isStaking, setIsStaking] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'stake' | 'rwa'>('stake');
  const [rwaRouter, setRwaRouter] = useState<number>(0);
  const [rwaTarget, setRwaTarget] = useState<string>('treasury');
  const [selectedRwaTarget, setSelectedRwaTarget] = useState('gold');
  const [rwaStats, setRwaStats] = useState({ total: 0, apy: 0 });
  const [isSavingRoute, setIsSavingRoute] = useState<boolean>(false);
  const [routeSaved, setRouteSaved] = useState<boolean>(false);
  const [liveEthPrice, setLiveEthPrice] = useState<number>(3000);

  useEffect(() => {
    let isMounted = true;
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
        if (!response.ok) throw new Error('API fetch error');
        const result = await response.json();

        if (isMounted && result.data && result.data.amount) {
          setLiveEthPrice(parseFloat(result.data.amount));
        }
      } catch (err) {
        console.log('Gagal narik harga ETH. Pakai harga fallback $3000', err);
        if (isMounted) setLiveEthPrice(3000);
      }
    };

    fetchEthPrice();
    const priceInterval = setInterval(fetchEthPrice, 30000);

    return () => {
      isMounted = false;
      clearInterval(priceInterval);
    };
  }, []);

  // Real values mapping
  const realStakedBalance = parseFloat(stakedBalStr || '0');
  const realPendingRewards = parseFloat(pendingRewStr || '0');
  const realTotalProtocolStaked = parseFloat(totalProtStakedStr || '1450200');

  useEffect(() => {
    if (contractSfsFraction > 0) {
      setSfsFraction(contractSfsFraction * 100);
    }
  }, [contractSfsFraction]);

  // Enforce Solo ETH constraints
  useEffect(() => {
    if (assetType === 'solo_eth') {
      setPayoutType('rlo');
    }
  }, [assetType]);

  // Flexible stakes can also use RWA payout

  // Interactive States
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const totalStaked = realTotalProtocolStaked;

  // RWA LIVE PRICES STATE
  const [rwaPrices, setRwaPrices] = useState({
    gold: 2340.50,
    goldChange: 1.2,
    treasury: 1.02,
    treasuryChange: 0.01,
    realEstate: 50.25,
    realEstateChange: 0.4
  });

  const realStakedEthBalance = parseFloat(stakedEthBalStr || '0');

  useEffect(() => {
    if (contractRwaAllocation > 0) {
      setRwaRouter(contractRwaAllocation * 100);
      if (contractRwaTarget) {
        setRwaTarget(contractRwaTarget);
      }
    }
  }, [contractRwaAllocation, contractRwaTarget]);

  // Simplify Actions State
  const [isExploringRwa, setIsExploringRwa] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; detail?: string; type: 'success' | 'error' | 'loading' | 'info'; txHash: string | null } | null>(null);

  // --- Staking History & Countdown Logic ---
  const [stakingHistory, setStakingHistory] = useState<StakingPosition[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update ticker every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load and Migrate History
  useEffect(() => {
    if (typeof window !== 'undefined' && address) {
      const historyKey = `rialo_staking_history_${address}`;
      const saved = localStorage.getItem(historyKey);
      
      if (saved) {
        setStakingHistory(JSON.parse(saved));
      } else {
        // Migration: If no history exists but we have total balances, create a legacy record
        const oldRlo = parseFloat(localStorage.getItem('rialo_staked_rlo') || '0');
        const oldEth = parseFloat(localStorage.getItem('rialo_staked_eth') || '0');
        const oldLockEnd = parseInt(localStorage.getItem(`rialo_lock_end_${address}`) || '0');

        if (oldRlo > 0 || oldEth > 0) {
          const legacyRecord: StakingPosition = {
            id: 'legacy-' + Date.now(),
            assetType: oldRlo > 0 && oldEth > 0 ? 'pair' : (oldEth > 0 ? 'solo_eth' : 'solo_rlo'),
            amountRlo: oldRlo,
            amountEth: oldEth,
            startTime: Date.now() - (oldLockEnd ? 30 * 24 * 60 * 60 * 1000 : 0),
            lockDuration: 1, // Assume 1 month for legacy
            lockEnd: oldLockEnd || Date.now(),
            txHash: null
          };
          const newHistory = [legacyRecord];
          setStakingHistory(newHistory);
          localStorage.setItem(historyKey, JSON.stringify(newHistory));
        }
      }
    }
  }, [address]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleStake = async () => {
    if (!isConnected) { connect(); return; }

    setIsSimulating(true);
    try {
      if (isStaking) {
        let lastTxHash = null;
        if (assetType === 'solo_rlo') {
          if (numRlo < 10) { setToast({ message: "Min 10 RLO", type: "error", txHash: null }); setIsSimulating(false); return; }
          lastTxHash = await stakeRlo(numRlo.toString(), lockDuration);
          addTransaction({ type: 'Stake', amount: `${numRlo.toLocaleString('en-US')} RLO`, details: 'Staked RLO (Solo)', txHash: lastTxHash });
        } else if (assetType === 'solo_eth') {
          if (numEth <= 0) { setToast({ message: "Invalid ETH Amount", type: "error", txHash: null }); setIsSimulating(false); return; }
          lastTxHash = await stakeEth(numEth.toString(), lockDuration);
          addTransaction({ type: 'Stake', amount: `${numEth} ETH`, details: 'Staked ETH (Solo)', txHash: lastTxHash });
        } else if (assetType === 'pair') {
          if (numRlo < 10 || numEth <= 0) { setToast({ message: "Invalid Pair Amount", type: "error", txHash: null }); setIsSimulating(false); return; }
          lastTxHash = await stakePair(numRlo.toString(), numEth.toString(), lockDuration);
          addTransaction({ type: 'Stake', amount: 'LP Pair', details: `Staked ${numRlo} RLO + ${numEth} ETH`, txHash: lastTxHash });
        }
        
        const creditsToAward = Math.floor(rawYieldToServiceCredits);
        if (creditsToAward > 0) {
          addPendingCredits(creditsToAward);
          addTransaction({
            type: 'Credits',
            amount: `+${creditsToAward.toLocaleString('en-US')} Credits`,
            details: `Pending AI Credit Allocation (${sfsFraction}% of yield × 1000)`,
            txHash: null
          });
          setToast({ 
            message: `✅ ${creditsToAward.toLocaleString('en-US')} Credits are now available to claim in Rewards!`, 
            type: 'success',
            txHash: lastTxHash 
          });
        } else {
          setToast({ message: `Successfully staked assets!`, type: "success", txHash: lastTxHash });
        }

        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const lockMs = lockDuration * 30 * 24 * 60 * 60 * 1000;
        const newPosition: StakingPosition = {
          id: 'stake-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          assetType,
          amountRlo: assetType === 'solo_eth' ? 0 : parseFloat(rloAmount || '0'),
          amountEth: assetType === 'solo_rlo' ? 0 : parseFloat(ethAmount || '0'),
          startTime: Date.now(),
          lockDuration,
          lockEnd: Date.now() + (lockDuration === 0 ? thirtyDays : lockMs),
          txHash: lastTxHash
        };

        const updatedHistory = [...stakingHistory, newPosition];
        setStakingHistory(updatedHistory);
        if (address) localStorage.setItem(`rialo_staking_history_${address}`, JSON.stringify(updatedHistory));

        if (payoutType === 'rwa') {
          setRemainingPortfolio(estimatedRwaYieldUsd);
          setActiveView('rwa');
        }
        setRloAmount("");
        setEthAmount("0");
      } else {
        if (realStakedBalance <= 0 && realStakedEthBalance <= 0) {
          setToast({ message: "No balanced staked to unstake.", type: "error", txHash: null });
          setIsSimulating(false);
          return;
        }

        const storedLockEnd = parseInt(localStorage.getItem(`rialo_lock_end_${address}`) || '0');
        const now = Date.now();
        if (now < storedLockEnd) {
          const diff = storedLockEnd - now;
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          setToast({
            message: `Locked! Assets mature in ${days} days.`,
            detail: "Use individual Unstake buttons in Staking History for granular withdrawal.",
            type: "error",
            txHash: null
          });
          setIsSimulating(false);
          return;
        }

        const hash = await withdraw();
        addTransaction({ type: 'Unstake', amount: 'All Assets', details: 'Unstaked RLO/ETH + Cash Yield distributed', txHash: hash });
        setToast({ message: `Success! Principal and final Cash Yield have been returned to your wallet.`, type: "success", txHash: hash });
      }

      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
        fetchStakingData();
      }
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes('user rejected') || msg.includes('4001')) {
        setToast({ message: "Transaction rejected in MetaMask.", type: "error", txHash: null });
      } else {
        setToast({ message: `${isStaking ? 'Staking' : 'Unstaking'} failed. ${msg.slice(0, 60)}${msg.length > 60 ? '...' : ''}`, type: "error", txHash: null });
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUnstakePosition = async (positionId: string) => {
    if (!isConnected) { connect(); return; }
    
    const position = stakingHistory.find(p => p.id === positionId);
    if (!position) return;

    setIsSimulating(true);
    try {
      const hash = await withdraw();
      
      addTransaction({ 
        type: 'Unstake', 
        amount: position.assetType === 'pair' ? 'RLO + ETH Pair' : (position.amountRlo > 0 ? `${position.amountRlo} RLO` : `${position.amountEth} ETH`), 
        details: 'Position Mature - Principal & Yield unlocked', 
        txHash: hash 
      });

      const updatedHistory = stakingHistory.filter(p => p.id !== positionId);
      setStakingHistory(updatedHistory);
      if (address) localStorage.setItem(`rialo_staking_history_${address}`, JSON.stringify(updatedHistory));

      setToast({ message: `Successfully unstaked position!`, detail: "Principal and yield distributed.", type: "success", txHash: hash });
    } catch (e: any) {
      setToast({ message: "Unstake failed", detail: e.message, type: "error", txHash: null });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateRwa = async () => {
    if (!isConnected) { connect(); return; }
    setIsSavingRoute(true);
    try {
      await updateRwaAllocation(rwaTarget, rwaRouter / 100);
      setToast({ message: `RWA Yield routing saved!`, type: "success", txHash: null });
      setRouteSaved(true);
    } catch (e) {
      setToast({ message: `Failed to save RWA route.`, type: "error", txHash: null });
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleClaim = async () => {
    if (!isConnected) { connect(); return; }
    if (realPendingRewards <= 0) {
      setToast({ message: "No rewards to claim", type: "error", txHash: null });
      return;
    }
    try {
      const hash = await claimAction();
      setToast({ message: "Rewards claimed successfully!", type: "success", txHash: hash });
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
        fetchStakingData();
      }
    } catch (e) {
      setToast({ message: "Claim failed", type: "error", txHash: null });
    }
  };

  const handleConfigureAI = async () => {
    if (!isConnected) { connect(); return; }
    try {
      setToast({ message: "Activating AI Session...", type: "info", txHash: null });
      await activateSession(24);
      setToast({ message: "AI Agent Session Active!", type: "success", txHash: null });
    } catch (e) {
      setToast({ message: "Failed to activate AI session", type: "error", txHash: null });
    }
  };

  const handleExploreRwa = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setActiveView('rwa');
  };

  const rwaNameMap: Record<string, string> = {
    treasuries: 'US Treasuries',
    realEstate: 'Real Estate',
    gold: 'Tokenized Gold',
  };

  const handleRloInput = (val: string) => {
    setRloAmount(val);
    if (assetType === 'pair') {
      const valNum = parseFloat(val) || 0;
      const ethCalc = (valNum * 1) / liveEthPrice;
      setEthAmount(val === "" ? "" : Number(ethCalc.toFixed(6)).toString());
    }
  };

  const handleEthInput = (val: string) => {
    setEthAmount(val);
    if (assetType === 'pair') {
      const valNum = parseFloat(val) || 0;
      const rloCalc = (valNum * liveEthPrice) / 1;
      setRloAmount(val === "" ? "" : Number(rloCalc.toFixed(6)).toString());
    }
  };

  const numRlo = parseFloat(rloAmount) || 0;
  const numEth = parseFloat(ethAmount) || 0;
  const ethToRloRatio = liveEthPrice;

  let effectivePrincipal = numRlo;
  if (assetType === 'pair') effectivePrincipal = numRlo + (numEth * ethToRloRatio);
  else if (assetType === 'solo_eth') effectivePrincipal = numEth * ethToRloRatio;

  const baseApy = payoutType === 'rwa' ? 0.08 : 0.15;

  let assetMultiplier = 1; let creditsMultiplier = 1;
  if (assetType === 'solo_rlo') { assetMultiplier = 1; creditsMultiplier = 1; }
  else if (assetType === 'pair') { assetMultiplier = 0.75; creditsMultiplier = 0.6; }
  else if (assetType === 'solo_eth') { assetMultiplier = 0.3; creditsMultiplier = 0.2; }

  const networkApy = lockDuration === 0
    ? 0.03 * assetMultiplier
    : (baseApy + ((lockDuration - 1) / 47) * 0.10) * assetMultiplier;
  const timeMultiplier = lockDuration === 0 ? (1 / 12) : (lockDuration / 12);
  const totalYield = (effectivePrincipal * networkApy) * timeMultiplier;

  const yieldAllocatedToSfS = totalYield * (sfsFraction / 100) * creditsMultiplier;
  const rawYieldToServiceCredits = yieldAllocatedToSfS * 1000;
  const yieldToWallet = totalYield - yieldAllocatedToSfS;
  const availableServiceCredits = Math.max(0, rawYieldToServiceCredits);
  const estimatedRwaYieldUsd = payoutType === 'rwa' ? yieldToWallet : 0;

  const [allocationPercent, setAllocationPercent] = useState<number>(100);
  const [remainingPortfolio, setRemainingPortfolio] = useState<number>(0);

  useEffect(() => {
    setGlobalRwaYieldUsd(estimatedRwaYieldUsd);
  }, [Math.round(estimatedRwaYieldUsd * 100)]);

  const allocatedUsd = (remainingPortfolio * allocationPercent) / 100;

  const handleConfirmAllocation = async () => {
    if (!isConnected) { connect(); return; }
    if (!provider) {
      setToast({ message: 'No wallet provider found. Please reconnect.', type: 'error', txHash: null });
      return;
    }
    if (remainingPortfolio <= 0) {
      setToast({ message: 'No portfolio balance remaining to allocate.', type: 'error', txHash: null });
      return;
    }
    if (selectedRwaTarget !== 'gold') {
      setToast({ message: 'This vault is Coming Soon. Only Tokenized Gold (XAUt) is available now.', type: 'error', txHash: null });
      return;
    }

    setIsSigning(true);
    try {
      const signer = await provider.getSigner();
      const recipientAddress = await signer.getAddress();
      const xautAmount = allocatedUsd / LIVE_GOLD_PRICE_USD;
      const xautAmountWei = ethers.parseUnits(xautAmount.toFixed(18), 18);
      const xautContract = new ethers.Contract(XAUT_ADDRESS, XAUT_ABI, signer);

      setToast({ message: 'Confirm the mint transaction in MetaMask...', type: 'success', txHash: null });
      const mintTx = await xautContract.mintAllocation(recipientAddress, xautAmountWei);
      setToast({ message: 'Minting XAUt Token... Waiting for confirmation 🧭', type: 'success', txHash: null });
      const receipt = await mintTx.wait();
      const txHash: string = receipt.hash || (mintTx ? mintTx.hash : '');

      addTransaction({
        type: 'RWA Allocation',
        amount: `${xautAmount.toFixed(6)} XAUt (~$${allocatedUsd.toFixed(2)})`,
        details: `Minted Tokenized Gold at $${LIVE_GOLD_PRICE_USD.toLocaleString()} / oz`,
        txHash,
      });

      setToast({
        message: `✅ ${xautAmount.toFixed(6)} XAUt minted to your wallet!`,
        type: 'success',
        txHash,
      });

      setRemainingPortfolio(prev => Math.max(0, prev - allocatedUsd));
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('user rejected') || msg.includes('4001') || e?.code === 'ACTION_REJECTED') {
        setToast({ message: 'Transaction rejected in MetaMask.', type: 'error', txHash: null });
      } else {
        setToast({ message: `Mint failed. ${msg.slice(0, 80)}${msg.length > 80 ? '...' : ''}`, type: 'error', txHash: null });
      }
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 font-body antialiased selection:bg-primary/30 flex flex-col relative">

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <Navbar />

      <div className="max-w-7xl mx-auto flex-grow w-full mt-10 md:mt-16 px-4 mb-24">
        {activeView === 'stake' ? (
          <>
            {/* Main Grid: 2 Columns for headers and cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 lg:gap-y-0 items-stretch">

              {/* Header 1 (Stake Assets) */}
              <div className="lg:col-start-1 lg:row-start-1 text-center mb-6 lg:mb-12 min-h-[auto] lg:min-h-[120px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-slate-900">Stake Assets</h1>
                <p className="text-slate-500 max-w-xl mx-auto font-medium">Stake RLO or ETH to mint yield-bearing assets and auto-generate credits for a completely gasless experience.</p>
              </div>

              {/* Header 2 (Paymaster) */}
              <div className="lg:col-start-2 lg:row-start-1 text-center mb-6 lg:mb-12 min-h-[auto] lg:min-h-[120px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-slate-900">Paymaster</h1>
                <p className="text-slate-500 max-w-xl mx-auto font-medium">Power your on-chain experience with automated gas routing and AI credits.</p>
              </div>

              {/* Card 1 (Stake Assets Card) */}
              <div className="lg:col-start-1 lg:row-start-2 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150 mb-12 lg:mb-0">
                <div className="bg-[#0c0c0c] rounded-2xl p-5 md:p-6 shadow-2xl border border-white/5 relative overflow-hidden group/card transition-all duration-500 h-full flex flex-col text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-90"></div>

                  {/* Tab Toggle Container */}
                  <div className="flex bg-[#161616] rounded-2xl p-1 mb-4 border border-white/5 shadow-inner relative">
                    <button
                      onClick={() => setIsStaking(true)}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all z-10 ${isStaking ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                    >
                      Stake
                    </button>
                    <button
                      onClick={() => setIsStaking(false)}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all z-10 ${!isStaking ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                    >
                      Unstake
                    </button>
                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#222222] border border-white/10 rounded-xl transition-transform duration-300 ease-out shadow-md ${isStaking ? 'left-1 translate-x-0' : 'left-1 translate-x-full ml-1'}`}></div>
                  </div>

                  {isStaking ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* Asset Selection */}
                      <div className="mb-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 font-label mb-3 block">Select Asset Tier</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Card 1 */}
                          <button
                            onClick={() => setAssetType('solo_rlo')}
                            className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 ${assetType === 'solo_rlo' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                          >
                            <span className={`font-bold text-xs ${assetType === 'solo_rlo' ? 'text-white' : 'text-white/40'}`}>Single RLO</span>
                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-wider">Max Yield</span>
                          </button>

                          {/* Card 2 */}
                          <button
                            onClick={() => setAssetType('pair')}
                            className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 ${assetType === 'pair' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                          >
                            <span className={`font-bold text-xs ${assetType === 'pair' ? 'text-white' : 'text-white/40'}`}>Pair (RLO+ETH)</span>
                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-wider">Balanced</span>
                          </button>

                          {/* Card 3 */}
                          <button
                            onClick={() => setAssetType('solo_eth')}
                            className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 ${assetType === 'solo_eth' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                          >
                            <span className={`font-bold text-xs ${assetType === 'solo_eth' ? 'text-white' : 'text-white/40'}`}>Single ETH</span>
                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-wider">Base Tier</span>
                          </button>
                        </div>
                      </div>

                      {/* Amount Inputs */}
                      <div className={`grid gap-2 mb-3 ${assetType === 'pair' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {assetType !== 'solo_eth' && (
                          <div className="bg-[#161616] rounded-2xl p-4 border border-white/5 shadow-inner transition-all">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 font-label">RLO Amount</span>
                              <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">Balance: {parseFloat(rloBal || '0').toLocaleString('en-US')}</span>
                            </div>
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                              <div className="w-full">
                                <input
                                  type="number"
                                  value={rloAmount}
                                  onChange={(e) => handleRloInput(e.target.value)}
                                  className="bg-transparent text-2xl font-bold text-white outline-none w-full placeholder-slate-700"
                                  placeholder="0.0"
                                />
                                <div className="text-[11px] text-white/50 font-medium mt-1">≈ ${((parseFloat(rloAmount) || 0) * 1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {assetType === 'solo_rlo' && (
                                  <button
                                    onClick={() => setRloAmount(rloBal || "0")}
                                    className="text-[10px] font-bold text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-md border border-white/20"
                                  >
                                    MAX
                                  </button>
                                )}
                                <div className="flex items-center gap-1.5 bg-[#111111] rounded-lg px-2.5 py-1.5 border border-white/20 shadow-sm">
                                  <Droplet className="w-4 h-4 text-white fill-white/20" />
                                  <span className="font-bold text-sm text-white/90">RLO</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {assetType !== 'solo_rlo' && (
                          <div className="bg-[#161616] rounded-2xl p-4 border border-white/5 shadow-inner transition-all">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 font-label">ETH Amount</span>
                              <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">Balance: {walletBalances['ETH']?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                              <div className="w-full">
                                <input
                                  type="number"
                                  value={ethAmount}
                                  onChange={(e) => handleEthInput(e.target.value)}
                                  className="bg-transparent text-2xl font-headline font-bold text-white outline-none w-full placeholder:text-white/5"
                                  placeholder="0.0"
                                />
                                <div className="text-[10px] text-white/20 font-bold uppercase tracking-wider mt-1">≈ ${((parseFloat(ethAmount) || 0) * liveEthPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5 bg-[#111111] rounded-lg px-2.5 py-1.5 border border-white/20 shadow-sm">
                                  <div className="w-4 h-4 rounded-full bg-white/20 border border-white/50 flex items-center justify-center text-white text-[9px] font-bold">Ξ</div>
                                  <span className="font-bold text-sm text-white/90">ETH</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lock Duration Slider */}
                      <div className="bg-[#161616] rounded-2xl p-4 mb-3 border border-white/5 shadow-inner relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 font-label">
                            Lock Duration (Multiplier)
                          </span>
                          <span className={`font-headline font-bold text-white border px-2.5 py-1 rounded-md text-xs ${lockDuration === 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/10 border-white/20'}`}>
                            {lockDuration === 0 ? 'Flexible (No Lock)' : `${lockDuration} Month${lockDuration > 1 ? 's' : ''}`}
                          </span>
                        </div>

                        <div className="relative z-10 px-1">
                          <input
                            type="range"
                            min="0"
                            max="48"
                            value={lockDuration}
                            onChange={(e) => setLockDuration(Number(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                          />
                          <div className="flex justify-between text-[10px] text-slate-300 mt-3 font-bold uppercase tracking-wider">
                            <span>Flexible</span>
                            <span>48M (Max Boost)</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#161616] rounded-2xl p-4 mb-3 border border-white/5 shadow-inner relative overflow-hidden group transition-all">
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 font-label">
                            SfS Routing Fraction
                          </span>
                          <span className="font-headline font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-md text-xs">
                            {sfsFraction}%
                          </span>
                        </div>

                        <div className="relative z-10 px-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sfsFraction}
                            onChange={(e) => setSfsFraction(Number(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                          />
                          <div className="flex justify-between text-[10px] text-slate-300 mt-3 font-bold uppercase tracking-wider">
                            <span>0%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>

                      {/* Yield Payout Selection */}
                      <div className="mb-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3 block">Yield Payout Preference</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                          <button
                            onClick={() => setPayoutType('rlo')}
                            className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 ${payoutType === 'rlo' && assetType !== 'solo_eth' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-white text-xs">Payout in RLO</span>
                              <span className="text-white text-[9px] font-bold bg-white/10 border border-white/20 px-1.5 py-0.5 rounded uppercase tracking-wider">High APY</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              if (assetType !== 'solo_eth') setPayoutType('rwa');
                            }}
                            className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 ${
                              payoutType === 'rwa' && assetType !== 'solo_eth'
                                ? 'bg-[#161616] border-white/20 shadow-inner'
                                : 'bg-transparent border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="font-bold text-white text-xs">Payout in RWA</span>
                              <span className="text-white text-[9px] font-bold bg-white/10 border border-white/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Stable</span>
                            </div>
                          </button>
                        </div>

                        {payoutType === 'rwa' && assetType !== 'solo_eth' && (
                          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-[11px] text-white/80 flex items-start gap-1.5 leading-snug font-medium bg-white/5 p-2.5 rounded-lg border border-white/10">
                              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white" />
                              Note: RWA Yield is projected based on locked-in protocol revenue share, ensuring sustainable asset conversion.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <button
                          onClick={handleStake}
                          disabled={isSimulating}
                          className="w-full bg-white text-black py-3 rounded-xl font-headline font-extrabold text-base tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
                        >
                          {isSimulating ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" /> Simulating...
                            </span>
                          ) : payoutType === 'rwa' ? (
                            "Stake & Claim Upfront Yield"
                          ) : (
                            "Bridge Assets to Staking"
                          )}
                        </button>
                      </div>

                      <div className="space-y-2 text-sm px-1.5">
                        <div className="flex justify-between items-start text-white/80">
                          <span className="text-slate-300 font-medium">You will receive</span>
                          <div className="flex flex-col items-end gap-1">
                            {assetType !== 'solo_eth' && <span className="font-semibold text-[14px] bg-[#111111] px-2 py-0.5 rounded border border-white/10">{numRlo.toLocaleString('en-US')} stRLO</span>}
                            {assetType !== 'solo_rlo' && <span className="font-semibold text-[14px] text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">{numEth.toLocaleString('en-US')} stETH</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-white/80">
                          <span className="text-slate-300 font-medium">Blended APY</span>
                          <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded text-[13px]">{(networkApy * 100).toFixed(2).replace(/\.00$/, '')}%</span>
                        </div>

                        <div className="h-px bg-[#222222]/80 my-2 w-full"></div>

                        <div className="flex justify-between text-white/80 items-center">
                          <span className="text-slate-300 flex items-center group cursor-help font-medium">
                            Yield to Wallet
                            <Info className="w-3.5 h-3.5 ml-1.5 text-white/40 group-hover:text-white/60 transition-colors" />
                          </span>
                          <div className="flex flex-col items-end">
                            {payoutType === 'rwa' ? (
                              <>
                                <span className="font-bold text-white tracking-wide flex items-center text-[15px]">
                                  ${yieldToWallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-white/70 text-xs ml-1.5">(Upfront RWA)</span>
                                </span>
                                <span className="text-white/40 text-[10px] mt-0.5">(Paid Instantly in RWA)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-white tracking-wide flex items-center">
                                  {yieldToWallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-white/50 text-xs ml-1 mr-1.5">{assetType === 'solo_eth' ? 'ETH' : 'RLO'}</span>
                                  <span className="text-white/50 font-medium text-[11px]">(≈ ${(assetType === 'solo_eth' ? yieldToWallet * liveEthPrice : yieldToWallet * 1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                </span>
                                {lockDuration === 0 ? (
                                  <span className="text-amber-400/60 text-[10px] mt-0.5">(Accrued Daily \u00B7 Flexible)</span>
                                ) : (
                                  <span className="text-white/50 text-[10px] mt-0.5">(Total over {lockDuration} month{lockDuration > 1 ? 's' : ''})</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between text-white/80 items-center">
                          <span className="text-slate-300 flex items-center group cursor-help font-medium">
                            Total Yield Router
                            <Info className="w-3.5 h-3.5 ml-1.5 text-white/40 group-hover:text-white/60 transition-colors" />
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-white tracking-wide drop-shadow-sm">
                              {rawYieldToServiceCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-white/60 text-xs ml-0.5">Credits</span>
                            </span>
                            {lockDuration === 0 ? (
                              <span className="text-amber-400/60 text-[10px] mt-0.5">(Accrued Daily \u00B7 Flexible)</span>
                            ) : (
                              <span className="text-white/50 text-[10px] mt-0.5">(Total over {lockDuration} month{lockDuration > 1 ? 's' : ''})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-8 px-2">
                        <div className="flex flex-col">
                          <h3 className="text-white font-headline font-extrabold text-xl tracking-tight">Active Positions</h3>
                          <p className="text-white/40 text-[11px] font-medium uppercase tracking-widest mt-1">Staking History</p>
                        </div>
                        <button
                          onClick={() => fetchStakingData()}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all"
                        >
                          <Loader2 className={`w-4 h-4 ${stakingLoading ? 'animate-spin text-primary' : ''}`} />
                        </button>
                      </div>

                      {stakingHistory.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                          <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-white/20" />
                          </div>
                          <p className="text-sm font-medium text-white/40">No active staking positions found.</p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar max-h-[500px]">
                          {stakingHistory.map((pos) => {
                            const timeLeft = Math.max(0, pos.lockEnd - currentTime);
                            const isMature = timeLeft === 0;
                            
                            // Calculate progress
                            const totalDuration = pos.lockEnd - pos.startTime;
                            const elapsed = currentTime - pos.startTime;
                            const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

                            // Duration helper
                            const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                            const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
                            const m = Math.floor((timeLeft / (1000 * 60)) % 60);
                            const s = Math.floor((timeLeft / 1000) % 60);

                            return (
                              <div key={pos.id} className="bg-[#161616] border border-white/5 rounded-2xl p-5 relative overflow-hidden group transition-all hover:border-white/10 shadow-inner">
                                {/* Background glow for mature assets */}
                                {isMature && <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>}
                                
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary/80 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                        {pos.assetType === 'pair' ? 'LP PAIR' : pos.assetType.replace('solo_', '').toUpperCase()}
                                      </span>
                                      {isMature && (
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 animate-bounce">
                                          Mature
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-col mt-2">
                                      {pos.amountRlo > 0 && (
                                        <span className="text-xl font-extrabold text-white leading-tight">
                                          {pos.amountRlo.toLocaleString()} <span className="text-xs text-white/40 font-bold ml-0.5">RLO</span>
                                        </span>
                                      )}
                                      {pos.amountEth > 0 && (
                                        <span className="text-xl font-extrabold text-white leading-tight">
                                          {pos.amountEth.toLocaleString()} <span className="text-xs text-white/40 font-bold ml-0.5">ETH</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">Ends In</p>
                                    <p className={`font-mono font-bold text-sm ${isMature ? 'text-emerald-400' : 'text-white'}`}>
                                      {isMature ? '00:00:00:00' : `${d}d ${h}h ${m}m ${s}s`}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-white/5 h-1 rounded-full mb-6 relative overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-1000 ease-linear ${isMature ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-primary'}`}
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>

                                <button
                                  onClick={() => handleUnstakePosition(pos.id)}
                                  disabled={!isMature || isSimulating}
                                  className={`w-full py-3.5 rounded-xl font-headline font-extrabold text-xs uppercase tracking-widest transition-all ${
                                    isMature 
                                      ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]' 
                                      : 'bg-[#1a1a1a] text-white/20 border border-white/5 cursor-not-allowed'
                                  }`}
                                >
                                  {isMature ? (
                                    <span className="flex items-center justify-center gap-2">
                                      Unstake Assets <ArrowRight className="w-3 h-3" />
                                    </span>
                                  ) : (
                                    <span className="flex items-center justify-center gap-2">
                                      <AlertCircle className="w-3 h-3" /> Still Locked
                                    </span>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-8 pt-4 border-t border-white/5 text-[11px] font-medium text-white/30 text-center uppercase tracking-[0.15em]">
                        Auto-Compounding Enabled \u2022 Total Value Secured
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2 (Paymaster Card) */}
              <div className="lg:col-start-2 lg:row-start-2 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300 delay-250">
                <div className="bg-[#0c0c0c] rounded-2xl p-5 md:p-6 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 h-full flex flex-col text-white">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

                  <div className="bg-[#161616] rounded-2xl p-6 border border-white/5 flex flex-col items-center shadow-inner w-full text-center relative overflow-hidden shrink-0 mb-6">
                    <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-4 flex items-center gap-1.5">
                      Available Service Credits
                    </h3>
                    <div className="text-[3.5rem] md:text-[4.5rem] font-headline font-extrabold text-white leading-none mb-2 z-10 tracking-tighter">
                      {rawYieldToServiceCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-white/20 font-bold tracking-[0.3em] uppercase text-[10px] mt-2 z-10 font-label">Credits</span>

                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br from-white/20/10 to-transparent/5 rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] transform rotate-12 transition-transform duration-500 group-hover/card:rotate-0 group-hover/card:scale-110 opacity-70 pointer-events-none">
                      <Droplet className="w-14 h-14 text-white fill-white/20" />
                    </div>
                  </div>

                  {/* Paymaster Fee Schedule */}
                  <div className="mt-8 flex-1 flex flex-col">
                    <h3 className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-4 flex items-center gap-2">
                      Paymaster Fee Schedule
                    </h3>

                    <div className="space-y-0 bg-[#161616] rounded-2xl border border-white/5 shadow-inner flex flex-col">

                      <div className="flex items-center justify-between text-sm p-5 border-b border-white/5">
                        <span className="text-slate-300 font-medium">AI Chat (per message)</span>
                        <span className="font-headline font-bold text-white text-[11px]">5 Credits</span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-5 border-b border-white/5">
                        <span className="text-slate-300 font-medium">AI Access Unlock</span>
                        <span className="font-headline font-bold text-white text-[11px]">5 Credits / 7 days</span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-5">
                        <span className="text-slate-300 font-medium">Rate: 1 USDT</span>
                        <span className="font-headline font-bold text-emerald-400 text-[11px]">= 1,000 Credits</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-8 w-full">
                      <button
                        onClick={handleConfigureAI}
                        className={`w-full py-4 border rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm ${sessionActive ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-[#1a1a1a] hover:bg-[#222] border-white/10 text-white/40 hover:text-white'}`}
                      >
                        {sessionActive ? 'AI Session Active \u2713' : 'Configure AI Agent'}
                      </button>

                      {/* Debug: Simulate 30 Days (Sepolia Testing) */}
                      {isConnected && (stakingHistory.length > 0) && (
                        <button
                          onClick={() => {
                             const past = Date.now() - (31 * 24 * 60 * 60 * 1000);
                             // Update legacy fallback
                             localStorage.setItem(`rialo_lock_end_${address}`, past.toString());
                             
                             // Update all history positions
                             const newHistory = stakingHistory.map(p => ({ ...p, lockEnd: past }));
                             setStakingHistory(newHistory);
                             if (address) localStorage.setItem(`rialo_staking_history_${address}`, JSON.stringify(newHistory));

                             setToast({ message: "Time Simulation: 31 Days Passed", detail: "All positions mature. You can now unstake and collect yield.", type: 'success', txHash: null });
                             fetchStakingData();
                          }}
                          className="w-full py-4 mt-2 border border-dashed border-white/5 rounded-xl text-[9px] uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-all font-bold"
                        >
                          Simulate Maturity (All Positions Under 30 Days)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RWA Banner Section inside Column */}
                <div className="mt-6 flex-grow">
                  <div className="bg-[#0c0c0c] rounded-2xl p-6 shadow-2xl border border-white/5 relative overflow-hidden group text-white h-full flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] opacity-50"></div>

                    <div className="flex flex-col items-center gap-6 w-full relative z-10">
                      <div className="space-y-3 text-center">
                        <h2 className="text-2xl font-headline font-extrabold tracking-tighter text-white leading-tight">
                          RWA Hub \uD83C\uDF0D
                        </h2>
                        <p className="text-white/40 text-xs font-medium max-w-sm mx-auto">
                          Diversify your yield into Real-World Assets with institutional-grade stability.
                        </p>
                      </div>

                      <div className="w-full">
                        <button
                          onClick={handleExploreRwa}
                          disabled={isExploringRwa}
                          className="w-full bg-white text-black py-4 rounded-xl font-headline font-extrabold text-sm tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
                        >
                          {isExploringRwa ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Explore RWA"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-slate-900">RWA Hub \uD83C\uDF0D</h1>
              <p className="text-slate-500 max-w-xl mx-auto font-medium">Automatically diversify your yield into stable, institutional-grade real-world assets.</p>
              <button
                onClick={() => setActiveView('stake')}
                className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all shadow-md"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Return to Staking
              </button>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-[#0c0c0c] rounded-2xl p-10 shadow-2xl border border-white/5 mb-8 relative overflow-hidden group text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] opacity-50"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3">Total Portfolio Value</span>
                  <div className="text-5xl md:text-6xl font-headline font-extrabold text-white tracking-tighter">
                    ${remainingPortfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3">Average Yield</span>
                  <div className="text-5xl md:text-6xl font-headline font-extrabold text-white tracking-tighter">
                    {(payoutType === 'rwa' ? (baseApy * 100) : rwaStats.apy).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Main Layout Grid */}
            <div className="max-w-4xl mx-auto pb-20">

              {/* Kolom Kanan: Available Vaults */}
              <div className="flex flex-col gap-6">
                {[
                  { id: 'treasuries', name: 'US Treasuries', symbol: 'TBILL', apy: '5.2%', risk: 'Low', icon: Landmark, comingSoon: true },
                  { id: 'realEstate', name: 'Real Estate', symbol: 'REST', apy: '8.0%', risk: 'Medium', icon: Building2, comingSoon: true },
                  { id: 'gold', name: 'Tokenized Gold', symbol: 'XAUT', apy: 'Safe Haven', risk: 'Hedge', icon: CreditCard, comingSoon: false }
                ].map((vault) => (
                  <div
                    key={vault.id}
                    onClick={() => !vault.comingSoon && setSelectedRwaTarget(vault.id)}
                    className={`transition-all duration-300 bg-[#0c0c0c] rounded-2xl p-6 border flex items-center justify-between gap-4 text-white ${
                      vault.comingSoon
                        ? 'opacity-50 cursor-not-allowed border-white/5'
                        : selectedRwaTarget === vault.id
                          ? 'cursor-pointer border-white px-8'
                          : 'cursor-pointer border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40">
                        <vault.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-white text-lg tracking-tight flex items-center">
                          {vault.name} <span className="text-[10px] text-slate-300 ml-2 uppercase tracking-widest">{vault.symbol}</span>
                          {vault.comingSoon && (
                            <span className="ml-3 bg-white/10 text-white/60 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Coming Soon</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">{vault.apy} APY</span>
                          <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">{vault.risk} Risk</span>
                        </div>
                      </div>
                    </div>
                    {!vault.comingSoon && (
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${selectedRwaTarget === vault.id ? 'border-white bg-white shadow-xl' : 'border-white/10'}`}>
                        {selectedRwaTarget === vault.id && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Partial Allocation Slider */}
              <div className="mt-8 bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 font-label">Allocation Amount</span>
                  <span className="text-sm font-bold text-white">
                    Allocating {allocationPercent}% <span className="text-white/40 font-medium">(~$ {allocatedUsd.toFixed(2)})</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={allocationPercent}
                  disabled={remainingPortfolio <= 0 || isSigning}
                  onChange={(e) => setAllocationPercent(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10 accent-white disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-white/20 font-medium">0%</span>
                  <span className="text-[10px] text-white/20 font-medium">50%</span>
                  <span className="text-[10px] text-white/20 font-medium">100%</span>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-4">
                <button
                  onClick={handleConfirmAllocation}
                  disabled={isSigning || remainingPortfolio <= 0 || allocationPercent === 0}
                  className="w-full bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSigning ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Waiting for Signature...</>
                  ) : remainingPortfolio <= 0 || allocationPercent === 0 ? (
                    'Portfolio Fully Allocated'
                  ) : (
                    `Confirm Allocation of $${allocatedUsd.toFixed(2)} to ${rwaNameMap[selectedRwaTarget] || selectedRwaTarget}`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

