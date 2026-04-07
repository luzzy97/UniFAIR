"use client";

import { useState, useEffect } from "react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import { useRouter } from 'next/router';
import { Droplet, Info, Route, Plus, Activity, Loader2, CheckCircle2, AlertCircle, CreditCard, Landmark, Building2, ArrowRight, ArrowUpDown, Flame } from "lucide-react";

type Path = {
  address: string;
  amount: number;
};

type AssetType = 'solo_rlo' | 'pair' | 'solo_eth';
type PayoutType = 'rlo' | 'rwa';

export default function Home() {
  const router = useRouter();
  const { isConnected, address, provider, connect, balances: walletBalances, addTransaction, fetchEthBalance, updateBalance } = useWallet();
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
    fetchStakingData
  } = useStaking();

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
  const [selectedRwaTarget, setSelectedRwaTarget] = useState('treasuries');
  const [rwaStats, setRwaStats] = useState({ total: 0, apy: 0 });
  const [isSavingRoute, setIsSavingRoute] = useState<boolean>(false);
  const [routeSaved, setRouteSaved] = useState<boolean>(false);
  
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

  // Toast
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Clear toast after 3s
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
        if (assetType === 'solo_rlo') {
            if (numRlo < 10) { setToast({ message: "Min 10 RLO", type: "error" }); setIsSimulating(false); return; }
            await stakeRlo(numRlo.toString(), lockDuration);
            setToast({ message: `Successfully staked ${numRlo.toLocaleString('en-US')} RLO!`, type: "success" });
        } else if (assetType === 'solo_eth') {
            if (numEth <= 0) { setToast({ message: "Invalid ETH Amount", type: "error" }); setIsSimulating(false); return; }
            await stakeEth(numEth.toString(), lockDuration);
            setToast({ message: `Successfully staked ${numEth} ETH!`, type: "success" });
        } else if (assetType === 'pair') {
            if (numRlo < 10 || numEth <= 0) { setToast({ message: "Invalid Pair Amount", type: "error" }); setIsSimulating(false); return; }
            await stakePair(numRlo.toString(), numEth.toString(), lockDuration);
            setToast({ message: `Successfully staked Pair!`, type: "success" });
        }
        setRloAmount("");
        setEthAmount("0");
      } else {
        if (realStakedBalance <= 0 && realStakedEthBalance <= 0) {
          setToast({ message: "No assets staked", type: "error" });
          setIsSimulating(false);
          return;
        }
        await withdraw();
        setToast({ message: `Successfully unstaked!`, type: "success" });
      }
      
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
        fetchStakingData();
      }
    } catch (e) {
      setToast({ message: `${isStaking ? 'Staking' : 'Unstaking'} failed. Ensure your lock duration is over.`, type: "error" });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateRwa = async () => {
    if (!isConnected) { connect(); return; }
    setIsSavingRoute(true);
    try {
      await updateRwaAllocation(rwaTarget, rwaRouter / 100);
      setToast({ message: `RWA Yield routing saved!`, type: "success" });
      setRouteSaved(true);
    } catch(e) {
      setToast({ message: `Failed to save RWA route.`, type: "error" });
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleClaim = async () => {
    if (!isConnected) { connect(); return; }
    if (realPendingRewards <= 0) {
      setToast({ message: "No rewards to claim", type: "error" });
      return;
    }
    try {
      await claimAction();
      setToast({ message: "Rewards claimed successfully!", type: "success" });
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
        fetchStakingData();
      }
    } catch (e) {
      setToast({ message: "Claim failed", type: "error" });
    }
  };

  const handleExploreRwa = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setActiveView('rwa');
  };

  const numRlo = parseFloat(rloAmount) || 0;
  const numEth = parseFloat(ethAmount) || 0;
  const ethToRloRatio = 2000;
  
  let effectivePrincipal = numRlo;
  if (assetType === 'pair') effectivePrincipal = numRlo + (numEth * ethToRloRatio);
  else if (assetType === 'solo_eth') effectivePrincipal = numEth * ethToRloRatio;

  const baseApy = payoutType === 'rwa' ? 0.08 : 0.15;
  
  let assetMultiplier = 1; let creditsMultiplier = 1;
  if (assetType === 'solo_rlo') { assetMultiplier = 1; creditsMultiplier = 1; } 
  else if (assetType === 'pair') { assetMultiplier = 0.75; creditsMultiplier = 0.6; } 
  else if (assetType === 'solo_eth') { assetMultiplier = 0.3; creditsMultiplier = 0.2; }

  const networkApy = (baseApy + ((lockDuration - 1) / 47) * 0.10) * assetMultiplier;
  const totalYield = (effectivePrincipal * networkApy) * (lockDuration / 12);
  
  const yieldAllocatedToSfS = totalYield * (sfsFraction / 100) * creditsMultiplier;
  const rawYieldToServiceCredits = yieldAllocatedToSfS * 10;
  const yieldToWallet = totalYield - yieldAllocatedToSfS;
  const availableServiceCredits = Math.max(0, rawYieldToServiceCredits);

  return (
    <main className="min-h-screen bg-background text-on-background font-body antialiased selection:bg-primary/30 flex flex-col relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'success' ? 'bg-white/90' : 'bg-white/90'} backdrop-blur-md`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-black" /> : <AlertCircle className="w-5 h-5 text-black" />}
          <span className="font-medium text-sm text-black">{toast.message}</span>
        </div>
      )}

      <Navbar />



      <div className="max-w-7xl mx-auto flex-grow w-full mt-10 md:mt-16 px-4">
        {activeView === 'stake' ? (
          <>
            {/* Main Grid: 2 Columns for headers and cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0 lg:gap-y-0 items-start">
              
              {/* Header 1 (Stake Assets) */}
              <div className="lg:col-start-1 lg:row-start-1 text-center mb-6 lg:mb-12 min-h-[auto] lg:min-h-[120px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-primary">Stake Assets</h1>
                <p className="text-on-surface/60 max-w-xl mx-auto font-medium">Stake RLO or ETH to mint yield-bearing assets and auto-generate credits for a completely gasless experience.</p>
              </div>

              {/* Header 2 (Paymaster) */}
              <div className="lg:col-start-2 lg:row-start-1 text-center mb-6 lg:mb-12 min-h-[auto] lg:min-h-[120px] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-primary">Paymaster</h1>
                <p className="text-on-surface/60 max-w-xl mx-auto font-medium">Power your on-chain experience with automated gas routing and AI credits.</p>
              </div>

              {/* Card 1 (Stake Assets Card) */}
              <div className="lg:col-start-1 lg:row-start-2 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150 mb-12 lg:mb-0">
                <div className="bg-[#0c0c0c] rounded-2xl p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden group/card transition-all duration-500 h-full min-h-[650px] flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-90"></div>

              {/* Tab Toggle Container */}
              <div className="flex bg-[#161616] rounded-2xl p-1 mb-8 border border-white/5 shadow-inner relative">
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
                  <div className="mb-6">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3 block">Select Asset Tier</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Card 1 */}
                      <button 
                        onClick={() => setAssetType('solo_rlo')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${assetType === 'solo_rlo' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                      >
                        <span className={`font-bold text-sm ${assetType === 'solo_rlo' ? 'text-white' : 'text-white/40'}`}>Single RLO</span>
                        <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Max Yield</span>
                      </button>
                      
                      {/* Card 2 */}
                      <button 
                        onClick={() => setAssetType('pair')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${assetType === 'pair' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                      >
                        <span className={`font-bold text-sm ${assetType === 'pair' ? 'text-white' : 'text-white/40'}`}>Pair (RLO+ETH)</span>
                        <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Balanced</span>
                      </button>
 
                      {/* Card 3 */}
                      <button 
                        onClick={() => setAssetType('solo_eth')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${assetType === 'solo_eth' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                      >
                        <span className={`font-bold text-sm ${assetType === 'solo_eth' ? 'text-white' : 'text-white/40'}`}>Single ETH</span>
                        <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Base Tier</span>
                      </button>
                    </div>
                  </div>

                  {/* Amount Inputs */}
                  <div className={`grid gap-3 mb-6 ${assetType === 'pair' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {assetType !== 'solo_eth' && (
                      <div className="bg-[#161616] rounded-2xl p-5 border border-white/5 shadow-inner transition-all">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">RLO Amount</span>
                          <span className="text-[10px] font-medium text-white/20 uppercase tracking-wider">Balance: {parseFloat(rloBal || '0').toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                          <div className="w-full">
                            <input
                              type="number"
                              value={rloAmount}
                              onChange={(e) => setRloAmount(e.target.value)}
                              className="bg-transparent text-2xl md:text-3xl font-bold text-white outline-none w-full placeholder-slate-700"
                              placeholder="0.0"
                            />
                            <div className="text-[11px] text-white/50 font-medium mt-1">≈ ${((parseFloat(rloAmount) || 0) * 3).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
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
                      <div className="bg-[#161616] rounded-2xl p-5 border border-white/5 shadow-inner transition-all">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">ETH Amount</span>
                          <span className="text-[10px] font-medium text-white/20 uppercase tracking-wider">Balance: {walletBalances['ETH']?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                          <div className="w-full">
                            <input
                              type="number"
                              value={ethAmount}
                              onChange={(e) => setEthAmount(e.target.value)}
                              className="bg-transparent text-3xl font-headline font-bold text-white outline-none w-full placeholder:text-white/5"
                              placeholder="0.0"
                            />
                            <div className="text-[10px] text-white/20 font-bold uppercase tracking-wider mt-1">≈ ${((parseFloat(ethAmount) || 0) * 2000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
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
                  <div className="bg-[#161616] rounded-2xl p-6 mb-6 border border-white/5 shadow-inner relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">
                        Lock Duration (Multiplier)
                      </span>
                      <span className="font-headline font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-md text-xs">
                        {lockDuration} Month{lockDuration > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="relative z-10 px-1">
                      <input 
                        type="range" 
                        min="1" 
                        max="48" 
                        value={lockDuration} 
                        onChange={(e) => setLockDuration(Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-white/20 mt-3 font-bold uppercase tracking-wider">
                        <span>1M</span>
                        <span>48M (Max Boost)</span>
                      </div>
                    </div>
                  </div>

                  {/* Yield Payout Selection */}
                  <div className="mb-6">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3 block">Yield Payout Preference</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                      {assetType === 'solo_eth' && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center border border-white/5">
                          <span className="bg-white/5 border border-white/10 text-white/40 text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                            RWA Selection Locked
                          </span>
                        </div>
                      )}
                      <button 
                        onClick={() => setPayoutType('rlo')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${payoutType === 'rlo' && assetType !== 'solo_eth' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-sm">Payout in RLO</span>
                          <span className="text-white text-[10px] font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded uppercase tracking-wider">High APY</span>
                        </div>
                      </button>
                      <button 
                        onClick={() => {
                          if (assetType !== 'solo_eth') setPayoutType('rwa');
                        }}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${payoutType === 'rwa' && assetType !== 'solo_eth' ? 'bg-[#161616] border-white/20 shadow-inner' : 'bg-transparent border-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-sm">Payout in RWA</span>
                          <span className="text-white text-[10px] font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded uppercase tracking-wider">Stable</span>
                        </div>
                      </button>
                    </div>
                    {payoutType === 'rwa' && assetType !== 'solo_eth' && (
                      <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-sm text-white/60 mb-2 block">Select Target Asset:</label>
                        <div className="flex flex-row gap-3 mb-3">
                          <button
                            onClick={(e) => { e.preventDefault(); setRwaTarget('treasury'); }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${rwaTarget === 'treasury' ? 'bg-[#222222]/50 border-white text-white shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-transparent border-white/20/80 text-white/60 hover:border-slate-500'}`}
                          >
                            🏛️ Treasuries
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); setRwaTarget('real-estate'); }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${rwaTarget === 'real-estate' ? 'bg-[#222222]/50 border-white text-white shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-transparent border-white/20/80 text-white/60 hover:border-slate-500'}`}
                          >
                            🏢 Real Estate
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); setRwaTarget('gold'); }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${rwaTarget === 'gold' ? 'bg-[#222222]/50 border-white text-white shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'bg-transparent border-white/20/80 text-white/60 hover:border-slate-500'}`}
                          >
                            🪙 Gold
                          </button>
                        </div>
                        <p className="text-[11px] text-white/80 flex items-start gap-1.5 leading-snug font-medium bg-white/5 p-2.5 rounded-lg border border-white/10">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white" />
                          Note: RWA Yield is projected based on locked-in protocol revenue share, ensuring sustainable asset conversion.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <button 
                      onClick={handleStake}
                      disabled={isSimulating}
                      className="w-full bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
                    >
                      {isSimulating ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" /> Simulating...
                        </span>
                      ) : (
                        "Bridge Assets to Staking"
                      )}
                    </button>
                  </div>


                  <div className="bg-[#161616] rounded-2xl p-6 mb-8 border border-white/5 shadow-inner relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">
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
                      <div className="flex justify-between text-[10px] text-white/20 mt-3 font-bold uppercase tracking-wider">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-sm px-2">
                    <div className="flex justify-between items-start text-white/80">
                      <span className="text-white/60 font-medium">You will receive</span>
                      <div className="flex flex-col items-end gap-1">
                        {assetType !== 'solo_eth' && <span className="font-semibold text-[14px] bg-[#111111] px-2 py-0.5 rounded border border-white/10">{numRlo.toLocaleString('en-US')} stRLO</span>}
                        {assetType !== 'solo_rlo' && <span className="font-semibold text-[14px] text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">{numEth.toLocaleString('en-US')} stETH</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-white/80">
                      <span className="text-white/60 font-medium">Blended APY</span>
                      <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded text-[13px]">{ (networkApy * 100).toFixed(2).replace(/\.00$/, '') }%</span>
                    </div>
                    
                    <div className="h-px bg-[#222222]/80 my-3 w-full"></div>
                    
                    <div className="flex justify-between text-white/80 items-center">
                      <span className="text-white/60 flex items-center group cursor-help font-medium">
                        Yield to Wallet
                        <Info className="w-3.5 h-3.5 ml-1.5 text-white/40 group-hover:text-white/60 transition-colors" />
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-white tracking-wide flex items-center">
                          {payoutType === 'rwa' ? '$' : ''}{yieldToWallet.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-white/50 text-xs ml-1 mr-1.5">{payoutType === 'rwa' ? 'USD (RWA)' : (assetType === 'solo_eth' ? 'ETH' : 'RLO')}</span>
                          {payoutType !== 'rwa' && (
                             <span className="text-white/50 font-medium text-[11px]">(≈ ${(assetType === 'solo_eth' ? yieldToWallet * 2000 : yieldToWallet * 3).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
                          )}
                        </span>
                        <span className="text-white/50 text-[10px] mt-0.5">(Total over {lockDuration} month{lockDuration > 1 ? 's' : ''})</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-white/80 items-center">
                      <span className="text-white/60 flex items-center group cursor-help font-medium">
                        Total Yield Router
                        <Info className="w-3.5 h-3.5 ml-1.5 text-white/40 group-hover:text-white/60 transition-colors" />
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-white tracking-wide drop-shadow-sm">
                          {rawYieldToServiceCredits.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-white/60 text-xs ml-0.5">Credits</span>
                        </span>
                        <span className="text-white/50 text-[10px] mt-0.5">(Total over {lockDuration} month{lockDuration > 1 ? 's' : ''})</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center min-h-[500px]">
                  <p className="text-white/60 font-medium mb-3">Your Locked Balance</p>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-sm tracking-tight">
                    {realStakedBalance.toLocaleString('en-US')} <span className="text-xl text-white/50 font-bold ml-1">RLO</span>
                  </h2>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8 drop-shadow-sm tracking-tight">
                    {realStakedEthBalance.toLocaleString('en-US')} <span className="text-xl text-white/50 font-bold ml-1">ETH</span>
                  </h2>
                  
                  <div className="inline-flex items-center gap-2 bg-[#161616] border border-white/20/80 px-5 py-2.5 rounded-xl mb-12 shadow-inner">
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white/80">
                      Unlock Status: Check Smart Contract Lock End
                    </span>
                  </div>

                  <div className="w-full mt-auto">
                    <button 
                      onClick={handleStake}
                      disabled={isSimulating}
                      className="w-full font-bold py-4 rounded-2xl transition-all border border-transparent shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] text-[1.05rem] flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white hover:shadow-[0_6px_20px_rgba(249,115,22,0.23)] hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isSimulating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initiate Unstaking"}
                    </button>
                    <p className="text-center text-[11.5px] font-medium text-white/70 mt-3 animate-in fade-in">
                      Note: Withdrawals revert if lock duration has not ended.
                    </p>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Card 2 (Paymaster Card) */}
            <div className="lg:col-start-2 lg:row-start-2 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 delay-250">
              <div className="bg-[#0c0c0c] rounded-2xl p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 h-full min-h-[650px] flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              
              <div className="bg-[#161616] rounded-2xl p-10 border border-white/5 flex flex-col items-center shadow-inner w-full text-center relative overflow-hidden shrink-0 mb-8">
                <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-4 flex items-center gap-1.5">
                  Available Service Credits
                </h3>
                <div className="text-[3.5rem] md:text-[4.5rem] font-headline font-extrabold text-white leading-none mb-2 z-10 tracking-tighter">
                  {availableServiceCredits.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                </div>
                <span className="text-white/20 font-bold tracking-[0.3em] uppercase text-[10px] mt-2 z-10 font-label">Credits</span>
                
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br from-white/20/10 to-transparent/5 rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] transform rotate-12 transition-transform duration-500 group-hover/card:rotate-0 group-hover/card:scale-110 opacity-70 pointer-events-none">
                  <Droplet className="w-14 h-14 text-white fill-white/20" />
                </div>
              </div>

              {/* Paymaster Fee Schedule */}
              <div className="mt-8 flex-1 flex flex-col">
                <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-4 flex items-center gap-2">
                  Paymaster Fee Schedule
                </h3>
                
                <div className="space-y-0 bg-[#161616] rounded-2xl border border-white/5 shadow-inner flex flex-col">
                  <div className="flex items-center justify-between text-sm p-5 border-b border-white/5">
                    <span className="text-white/60 font-medium">Basic Swap & Stake</span>
                    <span className="font-headline font-bold text-white/40 text-[11px]">~0.05 Credits</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-5 border-b border-white/5">
                    <span className="text-white/60 font-medium">RWA Allocation</span>
                    <span className="font-headline font-bold text-white/40 text-[11px]">~0.50 Credits</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-5">
                    <span className="text-white/60 font-medium">AI Agent Pass</span>
                    <span className="font-headline font-bold text-white text-[11px]">5.00 Credits/mo</span>
                  </div>
                </div>

                <div className="mt-auto pt-8 w-full">
                  <button className="w-full py-4 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 text-white/40 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm">
                    Configure AI Agent
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RWA Banner Section */}
        <div className="mt-12 mb-24 max-w-7xl mx-auto px-4 md:px-0">
          <div className="bg-[#0c0c0c] rounded-2xl p-8 md:p-12 shadow-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] opacity-50"></div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 w-full relative z-10">
              <div className="flex-1 space-y-4 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tighter text-white leading-tight">
                  RWA Hub 🌍
                </h2>
                <p className="text-white/40 text-sm md:text-base font-medium max-w-2xl">
                  Diversify your remaining RLO staking yield into Real-World Assets. Zero exposure to crypto volatility with institutional-grade stability.
                </p>
              </div>

              {/* Minimal Bridge CTA */}
              <div className="w-full md:w-auto shrink-0">
                <button 
                  onClick={handleExploreRwa}
                  disabled={isExploringRwa}
                  className="bg-white text-black px-10 py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
                >
                  {isExploringRwa ? <Loader2 className="w-5 h-5 animate-spin" /> : "Explore RWA"}
                </button>
              </div>
            </div>
          </div>
        </div>


          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-primary">RWA Hub 🌍</h1>
              <p className="text-on-surface/60 max-w-xl mx-auto font-medium">Automatically diversify your yield into stable, institutional-grade real-world assets.</p>
              <button 
                onClick={() => setActiveView('stake')}
                className="mt-6 inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline underline-offset-8 transition-all"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Return to Staking
              </button>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-[#0c0c0c] rounded-2xl p-10 shadow-2xl border border-white/5 mb-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] opacity-50"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3">Total Portfolio Value</span>
                  <div className="text-5xl md:text-6xl font-headline font-extrabold text-white tracking-tighter">
                    ${rwaStats.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label mb-3">Average Yield</span>
                  <div className="text-5xl md:text-6xl font-headline font-extrabold text-white tracking-tighter">
                    {rwaStats.apy.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start pb-20">
              
              {/* Kolom Kiri: Auto-Invest Settings */}
              <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-hidden group h-full flex flex-col">
                <div className="mb-10">
                  <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-2">Yield Auto-Router</h3>
                  <p className="text-sm font-medium text-white/40">
                    Direct your surplus RLO yield to automatically accumulate Real-World Assets.
                  </p>
                </div>

                <div className="bg-[#161616] rounded-2xl p-8 mb-2 border border-white/5 shadow-inner flex flex-col flex-grow relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">
                      Auto-Buy Allocation
                    </span>
                    <span className="font-headline font-bold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-sm">
                      {rwaRouter}%
                    </span>
                  </div>
                  
                  <div className="px-1 mb-10">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={rwaRouter} 
                      onChange={(e) => setRwaRouter(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-white/20 mt-4 font-bold uppercase tracking-wider">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={handleUpdateRwa}
                      disabled={isSavingRoute || routeSaved}
                      className="w-full bg-white text-black py-4 rounded-xl font-headline font-extrabold text-sm tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isSavingRoute ? 'Confirming...' : routeSaved ? 'Routing Rule Active ✓' : 'Save Routing Rule'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Available Vaults */}
              <div className="flex flex-col gap-6">
                {[
                  { id: 'treasuries', name: 'US Treasuries', symbol: 'tBILL', apy: '5.2%', risk: 'Low', icon: Landmark },
                  { id: 'realEstate', name: 'Real Estate', symbol: 'rEST', apy: '8.0%', risk: 'Medium', icon: Building2 },
                  { id: 'gold', name: 'Tokenized Gold', symbol: 'tGOLD', apy: 'Safe Haven', risk: 'Hedge', icon: CreditCard }
                ].map((vault) => (
                  <div 
                    key={vault.id}
                    onClick={() => setSelectedRwaTarget(vault.id)} 
                    className={`cursor-pointer transition-all duration-300 bg-[#0c0c0c] rounded-2xl p-6 border flex items-center justify-between gap-4 ${selectedRwaTarget === vault.id ? 'border-white px-8' : 'border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/20">
                        <vault.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-headline font-bold text-white text-lg tracking-tight">
                          {vault.name} <span className="text-[10px] text-white/20 ml-2 uppercase tracking-widest">{vault.symbol}</span>
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-white font-bold text-[10px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">{vault.apy} APY</span>
                          <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">{vault.risk} Risk</span>
                        </div>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${selectedRwaTarget === vault.id ? 'border-white bg-white shadow-xl' : 'border-white/10'}`}>
                      {selectedRwaTarget === vault.id && <div className="w-2.5 h-2.5 rounded-full bg-black"></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
