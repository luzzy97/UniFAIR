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
  const [activePage, setActivePage] = useState<'stake' | 'reward'>('stake');
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
            await stakeRlo(rloAmount, lockDuration);
            setToast({ message: `Successfully staked ${numRlo.toLocaleString()} RLO!`, type: "success" });
        } else if (assetType === 'solo_eth') {
            if (numEth <= 0) { setToast({ message: "Invalid ETH Amount", type: "error" }); setIsSimulating(false); return; }
            await stakeEth(ethAmount, lockDuration);
            setToast({ message: `Successfully staked ${numEth} ETH!`, type: "success" });
        } else if (assetType === 'pair') {
            if (numRlo < 10 || numEth <= 0) { setToast({ message: "Invalid Pair Amount", type: "error" }); setIsSimulating(false); return; }
            await stakePair(rloAmount, ethAmount, lockDuration);
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
        // In the real UI, unlocking requires the lockEnd duration to pass. If it fails, smart contract will revert.
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
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white/30 pb-20 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'success' ? 'bg-white/90' : 'bg-white/90'} backdrop-blur-md`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <Navbar />

      {/* Page-Level Navigation */}
      <div className="max-w-7xl mx-auto mt-8 px-4 flex justify-center animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex bg-black/60 rounded-full p-1.5 border border-white/10 shadow-2xl backdrop-blur-md relative min-w-[280px]">
          <button 
            onClick={() => setActivePage('stake')} 
            className={`flex-1 py-2.5 px-6 text-sm font-bold rounded-full transition-all z-10 ${activePage === 'stake' ? 'text-white' : 'text-white/60 hover:text-white/90'}`}
          >
            Stake
          </button>
          <button 
            onClick={() => setActivePage('reward')} 
            className={`flex-1 py-2.5 px-6 text-sm font-bold rounded-full transition-all z-10 ${activePage === 'reward' ? 'text-white' : 'text-white/60 hover:text-white/90'}`}
          >
            Reward
          </button>
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#222222]/80 border border-white/20 rounded-full transition-transform duration-300 ease-out shadow-lg shadow-white/10 ${activePage === 'stake' ? 'left-1.5 translate-x-0' : 'left-1.5 translate-x-full ml-[3px] border-white/30'}`}></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 md:mt-16 px-4">
        {activePage === 'stake' && (
          <>
            {activeView === 'stake' && (
              <>
            {/* Main Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Stake RLO */}
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
            <div className="text-center mb-8">
              <h1 className="text-[2.5rem] md:text-[2.75rem] font-extrabold mb-3 tracking-tight text-white drop-shadow-sm">Stake RLO</h1>
              <p className="text-white/60 text-sm md:text-base font-medium">Stake RLO to mint stRLO and auto-generate credits for a completely gasless experience.</p>
            </div>

            <div className="bg-[#0f0f0f] rounded-3xl p-5 md:p-7 shadow-2xl border border-white/10 mb-8 relative overflow-hidden backdrop-blur-xl group/card hover:border-white/20/80 transition-colors duration-500">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-90"></div>

              {/* Tab Toggle Container */}
              <div className="flex bg-black rounded-full p-1 mb-8 border border-white/10 shadow-inner relative">
                <button 
                  onClick={() => setIsStaking(true)} 
                  className={`flex-1 py-3 text-sm font-bold rounded-full transition-all z-10 ${isStaking ? 'text-white' : 'text-white/60 hover:text-white/90'}`}
                >
                  Stake
                </button>
                <button 
                  onClick={() => setIsStaking(false)} 
                  className={`flex-1 py-3 text-sm font-bold rounded-full transition-all z-10 ${!isStaking ? 'text-white' : 'text-white/60 hover:text-white/90'}`}
                >
                  Unstake
                </button>
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#222222] border border-white/20 rounded-full transition-transform duration-300 ease-out shadow-md ${isStaking ? 'left-1 translate-x-0' : 'left-1 translate-x-full ml-1'}`}></div>
              </div>

              {isStaking ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Asset Selection */}
                  <div className="mb-6">
                    <label className="text-sm text-white/60 font-medium mb-3 block">Select Asset Tier</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Card 1 */}
                      <button 
                        onClick={() => setAssetType('solo_rlo')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${assetType === 'solo_rlo' ? 'bg-white/10 border-white shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'bg-[#111111] border-white/20 hover:bg-[#222222] hover:border-slate-500'}`}
                      >
                        <span className={`font-bold text-sm ${assetType === 'solo_rlo' ? 'text-white drop-shadow-sm' : 'text-white/90'}`}>Single RLO</span>
                        <span className="text-xs text-white/60">Max Yield & Credits</span>
                      </button>
                      
                      {/* Card 2 */}
                      <button 
                        onClick={() => setAssetType('pair')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${assetType === 'pair' ? 'bg-white/10 border-white shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'bg-[#111111] border-white/20 hover:bg-[#222222] hover:border-slate-500'}`}
                      >
                        <span className={`font-bold text-sm ${assetType === 'pair' ? 'text-white drop-shadow-sm' : 'text-white/90'}`}>Pair (RLO + ETH)</span>
                        <span className="text-xs text-white/60">Balanced Pair</span>
                      </button>

                      {/* Card 3 */}
                      <button 
                        onClick={() => setAssetType('solo_eth')}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${assetType === 'solo_eth' ? 'bg-white/10 border-white shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'bg-[#111111] border-white/20 hover:bg-[#222222] hover:border-slate-500'}`}
                      >
                        <span className={`font-bold text-sm ${assetType === 'solo_eth' ? 'text-white drop-shadow-sm' : 'text-white/90'}`}>Single ETH</span>
                        <span className="text-xs text-white/60">Base Credits Only</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual or Single Box based on Asset */}
                  <div className={`grid gap-3 mb-6 ${assetType === 'pair' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {assetType !== 'solo_eth' && (
                      <div className="bg-black/60 rounded-2xl p-4 border border-white/10 shadow-inner group transition-all">
                        <label className="text-xs text-white/60 font-medium mb-2 block">RLO Amount</label>
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                          <div className="w-full">
                            <input
                              type="number"
                              value={rloAmount}
                              onChange={(e) => setRloAmount(e.target.value)}
                              className="bg-transparent text-2xl md:text-3xl font-bold text-white outline-none w-full placeholder-slate-700"
                              placeholder="0.0"
                            />
                            <div className="text-[11px] text-white/50 font-medium mt-1">≈ ${(parseFloat(rloAmount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {assetType === 'solo_rlo' && (
                              <button 
                                onClick={() => setRloAmount("10000")} 
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
                      <div className="bg-black/60 rounded-2xl p-4 border border-white/10 shadow-inner group transition-all">
                        <label className="text-xs text-white/60 font-medium mb-2 block">ETH Amount</label>
                        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
                          <div className="w-full">
                            <input
                              type="number"
                              value={ethAmount}
                              onChange={(e) => setEthAmount(e.target.value)}
                              className="bg-transparent text-2xl md:text-3xl font-bold text-white outline-none w-full placeholder-slate-700"
                              placeholder="0.0"
                            />
                            <div className="text-[11px] text-white/50 font-medium mt-1">≈ ${((parseFloat(ethAmount) || 0) * 2000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
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
                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-5 mb-5 border border-white/20/60 text-sm shadow-inner relative overflow-hidden group">
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>
                    
                    <div className="flex justify-between items-center mb-2 relative z-10">
                      <span className="font-semibold text-white/90 text-sm md:text-base">
                        Lock Duration (Multiplier)
                      </span>
                      <span className="font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-md text-xs shadow-sm shadow-white/10">
                        {lockDuration} Month{lockDuration > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="relative z-10 px-1 mt-4">
                      <input 
                        type="range" 
                        min="1" 
                        max="48" 
                        value={lockDuration} 
                        onChange={(e) => setLockDuration(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <div className="flex justify-between text-[11px] text-white/50 mt-2.5 font-semibold tracking-wide">
                        <span>1 Month (Min Boost)</span>
                        <span>48 Months (Max Boost)</span>
                      </div>
                    </div>
                  </div>

                  {/* Yield Payout Selection */}
                  <div className="mb-6">
                    <label className="text-sm text-white/60 font-medium mb-3 block">Yield Payout Preference</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                      {assetType === 'solo_eth' && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center border border-white/10">
                          <span className="bg-[#111111] border border-white/20 text-white/60 text-xs px-3 py-1.5 rounded-full font-medium shadow-xl flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            RWA Payout disabled for Solo ETH
                          </span>
                        </div>
                      )}
                      <button 
                        onClick={() => setPayoutType('rlo')}
                        className={`p-3.5 md:p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${payoutType === 'rlo' && assetType !== 'solo_eth' ? 'bg-white/10 border-white/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-[#111111]/60 border-white/10 hover:border-white/20/80 hover:bg-[#222222]/50'}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-sm flex items-center gap-1.5"><span className="text-lg leading-none">🪙</span> in RLO</span>
                          <span className="text-white text-[11px] font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded flex items-center whitespace-nowrap">~15% Min. APY</span>
                        </div>
                        <span className="text-[11px] text-white/60">Focus on compound growth</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (assetType !== 'solo_eth') setPayoutType('rwa');
                        }}
                        className={`p-3.5 md:p-4 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${payoutType === 'rwa' && assetType !== 'solo_eth' ? 'bg-white/10 border-white/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-[#111111]/60 border-white/10 hover:border-white/20/80 hover:bg-[#222222]/50'}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-white text-sm flex items-center gap-1.5"><span className="text-lg leading-none">🌍</span> in RWA</span>
                          <span className="text-white text-[11px] font-bold bg-white/10 border border-white/20 px-2 py-0.5 rounded flex items-center whitespace-nowrap">~8% Min. APY</span>
                        </div>
                        <span className="text-[11px] text-white/60">Stable asset conversion</span>
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
                      className={`w-full font-bold py-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgba(0,163,255,0.39)] text-[1.05rem] flex justify-center items-center gap-2
                        ${isSimulating ? 'bg-slate-700 text-white/80 shadow-none cursor-not-allowed' : 'bg-white text-black hover:bg-white/80 text-white hover:shadow-[0_6px_20px_rgba(0,163,255,0.23)] hover:-translate-y-0.5 active:translate-y-0'}`}
                    >
                      {isSimulating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Simulating...
                        </>
                      ) : (
                        "Simulate Staking"
                      )}
                    </button>
                  </div>


                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-5 mb-6 border border-white/20/60 text-sm shadow-inner relative overflow-hidden group">
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors duration-500"></div>
                    
                    <div className="flex justify-between items-center mb-2 relative z-10">
                      <span className="font-semibold text-white/90 text-sm md:text-base">
                        SfS Routing Fraction (<span className="text-white italic font-serif text-lg leading-none align-baseline">ϕ</span>)
                      </span>
                      <span className="font-bold text-white bg-white/10 border border-white/20 px-2.5 py-1 rounded-md text-xs shadow-sm shadow-white/10">
                        {sfsFraction}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-white/60 mb-5 relative z-10 font-medium">
                      Allocate a percentage of your yield directly to the <span className="text-white/80 font-semibold border-b border-dashed border-slate-500">ServicePaymaster</span> for zero-friction execution.
                    </p>
                    
                    <div className="relative z-10 px-1">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={sfsFraction} 
                        onChange={(e) => setSfsFraction(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <div className="flex justify-between text-[11px] text-white/50 mt-2.5 font-semibold tracking-wide">
                        <span>0% (All Wallet)</span>
                        <span>100% (All Gas)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-sm px-2">
                    <div className="flex justify-between items-start text-white/80">
                      <span className="text-white/60 font-medium">You will receive</span>
                      <div className="flex flex-col items-end gap-1">
                        {assetType !== 'solo_eth' && <span className="font-semibold text-[14px] bg-[#111111] px-2 py-0.5 rounded border border-white/10">{numRlo.toLocaleString()} stRLO</span>}
                        {assetType !== 'solo_rlo' && <span className="font-semibold text-[14px] text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">{numEth.toLocaleString()} stETH</span>}
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
                          {payoutType === 'rwa' ? '$' : ''}{yieldToWallet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-white/50 text-xs ml-1 mr-1.5">{payoutType === 'rwa' ? 'USD (RWA)' : (assetType === 'solo_eth' ? 'ETH' : 'RLO')}</span>
                          {payoutType !== 'rwa' && (
                             <span className="text-white/50 font-medium text-[11px]">(≈ ${(assetType === 'solo_eth' ? yieldToWallet * 2000 : yieldToWallet).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>
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
                          {rawYieldToServiceCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-white/60 text-xs ml-0.5">Credits</span>
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
                    {realStakedBalance.toLocaleString()} <span className="text-xl text-white/50 font-bold ml-1">RLO</span>
                  </h2>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8 drop-shadow-sm tracking-tight">
                    {realStakedEthBalance.toLocaleString()} <span className="text-xl text-white/50 font-bold ml-1">ETH</span>
                  </h2>
                  
                  <div className="inline-flex items-center gap-2 bg-[#111111] border border-white/20/80 px-5 py-2.5 rounded-xl mb-12 shadow-inner">
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

          {/* RIGHT COLUMN: SfS Router */}
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
            <div className="text-center mb-8">
              <h1 className="text-[2.5rem] md:text-[2.75rem] font-extrabold mb-3 tracking-tight text-white drop-shadow-sm flex items-center justify-center gap-3">
                <Flame className="w-9 h-9 text-white drop-shadow-md" />
                ServicePaymaster
              </h1>
              <p className="text-white/60 text-sm md:text-base font-medium">Your available Service Credits for zero-gas transactions.</p>
            </div>

            <div className="bg-[#0f0f0f] rounded-3xl p-5 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl h-full flex flex-col group/card hover:border-white/20/80 transition-colors duration-500 min-h-[400px]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-white/20 via-white/10 to-transparent opacity-90"></div>
              
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 rounded-[2rem] p-8 md:p-10 border border-white/10 flex flex-col items-center shadow-inner w-full text-center relative overflow-hidden shrink-0">
                <h3 className="text-white/60 text-sm font-semibold mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                  <Info className="w-4 h-4 text-white/50" />
                  Available Service Credits
                </h3>
                <div className="text-[3.5rem] md:text-[4.5rem] font-extrabold text-white drop-shadow-md leading-none mb-2 z-10">
                  {availableServiceCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                </div>
                <span className="text-white/80 font-bold tracking-widest uppercase text-sm mt-2 z-10">Credits</span>
                
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-br from-white/20/10 to-transparent/5 rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_20px_rgba(249,115,22,0.1)] transform rotate-12 transition-transform duration-500 group-hover/card:rotate-0 group-hover/card:scale-110 opacity-70 pointer-events-none">
                  <Droplet className="w-14 h-14 text-white fill-white/20" />
                </div>
              </div>

              {/* Paymaster Fee Schedule */}
              <div className="mt-8 flex-1 flex flex-col animate-in fade-in duration-500">
                <h3 className="text-white/80 text-[13px] font-bold mb-4 flex items-center gap-2 uppercase tracking-wide">
                  <Activity className="w-4 h-4 text-white" />
                  Paymaster Fee Schedule
                </h3>
                
                <div className="space-y-0 bg-[#0a0a0a]/60 rounded-2xl border border-white/10/60 shadow-inner flex flex-col">
                  <div className="flex items-center justify-between text-sm p-4 border-b border-white/10/50">
                    <span className="text-white/80 flex items-center gap-2.5 font-medium"><span className="text-lg leading-none">🔁</span> Basic Swap & Stake</span>
                    <span className="font-mono text-white/60 text-[11.5px] bg-[#111111] border border-white/10 px-2.5 py-1 rounded">~0.05 - 0.10 Credits</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-4 border-b border-white/10/50">
                    <span className="text-white/80 flex items-center gap-2.5 font-medium"><span className="text-lg leading-none">🌍</span> RWA Allocation</span>
                    <span className="font-mono text-white/60 text-[11.5px] bg-[#111111] border border-white/10 px-2.5 py-1 rounded">~0.50 Credits</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-4 bg-white/5 rounded-b-2xl border-t border-white/10 hover:bg-white/10 transition-colors">
                    <span className="text-white font-semibold flex items-center gap-2.5"><span className="text-lg leading-none drop-shadow">🤖</span> AI Agent Monthly Pass</span>
                    <span className="font-mono text-white font-bold bg-white/10 px-2.5 py-1 rounded shadow-sm text-[11.5px] border border-white/20">5.00 Credits/mo</span>
                  </div>
                </div>

                <div className="mt-auto pt-6 w-full">
                  <button className="w-full py-4 bg-[#111111]/80 hover:bg-[#222222] border border-white/20/80 hover:border-white/50 text-white/80 hover:text-white rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500/50">
                    Configure AI Agent
                    <ArrowRight className="w-4 h-4 -rotate-45 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RWA Banner Section */}
        <div className="mt-12 max-w-7xl mx-auto drop-shadow-2xl">
          <div className="bg-[#0f0f0f] rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10 backdrop-blur-xl transition-all duration-300 relative overflow-hidden group/banner hover:border-white/20/80">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-90"></div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8 w-full">
              {/* Text Focus */}
              <div className="flex-1 space-y-3 md:space-y-4">
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold tracking-tight text-white drop-shadow-sm leading-tight">
                  RWA Hub 🌍
                </h2>
                <p className="text-white/60 text-sm md:text-base font-medium max-w-2xl">
                  Diversify your remaining RLO staking yield into Real-World Assets. Zero exposure to crypto volatility.
                </p>
              </div>

              {/* Minimal Bridge CTA */}
              <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
                <button 
                  onClick={handleExploreRwa}
                  disabled={isExploringRwa}
                  className={`w-full md:w-auto px-7 py-3.5 rounded-xl font-bold transition-all text-sm md:text-[1rem] inline-flex justify-center items-center gap-2 border border-white/50 hover:bg-white hover:text-white
                    ${isExploringRwa ? 'bg-[#222222] text-white/60 border-white/20 cursor-not-allowed shadow-none' : 'bg-white/10 text-white shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.25)] hover:-translate-y-0.5 active:translate-y-0'}`}
                >
                  {isExploringRwa ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Explore RWA Hub
                      <ArrowRight className="w-5 h-5 ml-0.5 -rotate-45" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Card (Shared, Full Width) */}
        <div className="mt-12 mb-8 max-w-7xl mx-auto drop-shadow-2xl">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-[1.1rem] font-bold text-white/90 tracking-tight">Rialo Protocol Statistics</h2>
            <a href="#" className="text-xs text-white hover:text-white/80 font-semibold transition-colors">View on Explorer</a>
          </div>
          <div className="bg-[#0f0f0f] rounded-[1.25rem] p-5 md:p-6 shadow-xl border border-white/10 backdrop-blur-xl transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
              <div className="flex flex-col items-center md:items-start group pt-4 md:pt-0">
                <span className="text-white/60 border-b border-dashed border-white/30 group-hover:border-slate-400 transition-colors cursor-help pb-0.5 font-medium mb-2">Total staked with Rialo</span>
                <span className="font-semibold text-white/90 text-xl tracking-tight transition-all text-white">{totalStaked.toLocaleString()} <span className="text-white/50 text-sm font-normal">RLO</span></span>
              </div>
              <div className="flex flex-col items-center md:items-start group md:pl-6 pt-4 md:pt-0">
                <span className="text-white/60 border-b border-dashed border-white/30 group-hover:border-slate-400 transition-colors cursor-help pb-0.5 font-medium mb-2">Active SfS Routers</span>
                <span className="font-semibold text-white/90 text-xl tracking-tight">12,400</span>
              </div>
              <div className="flex flex-col items-center md:items-start group md:pl-6 pt-4 md:pt-0">
                <span className="text-white/60 border-b border-dashed border-white/30 group-hover:border-slate-400 transition-colors cursor-help pb-0.5 font-medium mb-2">Total Service Credits Minted</span>
                <span className="font-semibold text-white/90 text-xl tracking-tight">350,000</span>
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {activeView === 'rwa' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Section */}
            <div className="relative mb-8 md:mb-12">
              <button 
                onClick={() => setActiveView('stake')}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-white/60 hover:text-white flex items-center gap-1.5 font-medium text-sm transition-colors decoration-orange-500/50 hover:underline underline-offset-4"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Stake
              </button>
              <div className="text-center pt-10 md:pt-0">
                <h1 className="text-[2.25rem] md:text-[2.75rem] font-extrabold mb-2 tracking-tight text-white drop-shadow-sm flex items-center justify-center gap-2">
                  RWA Hub 🌍
                </h1>
                <p className="text-white/60 text-sm md:text-base font-medium max-w-xl mx-auto">
                  Automatically diversify your staking yield into stable, real-world assets.
                </p>
              </div>
            </div>

            {/* Portfolio Summary */}
            <div className="bg-[#0f0f0f] rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 mb-8 relative overflow-hidden backdrop-blur-xl group/portfolio hover:border-white/20/80 transition-colors duration-500">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-90"></div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 delay-150 duration-500">
                <div className="w-full md:w-1/2 bg-black/60 rounded-2xl p-5 border border-white/10 shadow-inner group-hover/portfolio:border-white/30 transition-colors">
                  <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-white" />
                    Total RWA Portfolio
                  </h3>
                  <div className="text-[2rem] md:text-[2.5rem] font-bold text-white tracking-tight flex items-baseline gap-1">
                    ${rwaStats.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 bg-black/60 rounded-2xl p-5 border border-white/10 shadow-inner group-hover/portfolio:border-white/30 transition-colors">
                  <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-white" />
                    Average Stable APY
                  </h3>
                  <div className={`text-[2rem] md:text-[2.5rem] font-bold tracking-tight flex items-baseline gap-1 ${rwaStats.apy > 0 ? 'text-white drop-shadow-md' : 'text-white/50'}`}>
                    {rwaStats.apy > 0 ? rwaStats.apy.toFixed(2) : '0.00'}%
                  </div>
                </div>
              </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-6 delay-300 duration-500 pb-10">
              
              {/* Kolom Kiri: Auto-Invest Settings */}
              <div className="bg-[#0f0f0f] rounded-3xl p-5 md:p-7 shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl group/card hover:border-white/20/80 transition-colors duration-500 h-full flex flex-col">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-white/20 via-white/10 to-transparent opacity-90"></div>
                
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white/90 tracking-tight flex items-center gap-2 mb-2">
                    <Route className="w-5 h-5 text-white" />
                    Yield Auto-Router
                  </h2>
                  <p className="text-sm font-medium text-white/60">
                    Direct your surplus RLO yield to automatically accumulate Real-World Assets.
                  </p>
                </div>

                <div className="bg-[#111111]/60 rounded-2xl p-5 mb-2 border border-white/10 shadow-inner flex flex-col flex-grow relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-semibold text-white/90 text-sm">
                      Auto-Buy Allocation
                    </span>
                    <span className="font-bold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-sm shadow-sm shadow-white/10">
                      {rwaRouter}%
                    </span>
                  </div>
                  
                  <div className="px-1 mb-8">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={rwaRouter} 
                      onChange={(e) => setRwaRouter(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                    <div className="flex justify-between text-xs text-white/50 mt-3 font-semibold tracking-wide">
                      <span>0% (Hold RLO)</span>
                      <span>100% (Auto-Convert)</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={handleUpdateRwa}
                      disabled={isSavingRoute || routeSaved}
                      className={`w-full font-bold py-3.5 rounded-xl transition-all text-[1rem] flex justify-center items-center gap-2 ${isSavingRoute ? 'bg-slate-700 text-white/60 border border-white/30 shadow-none cursor-not-allowed opacity-70' : routeSaved ? 'bg-white/10 text-white border border-white/50 shadow-none cursor-default' : 'bg-[#222222] hover:bg-white border border-white/20 hover:border-white text-white/80 hover:text-white shadow-[0_4px_14px_0_rgba(249,115,22,0.25)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.3)] active:translate-y-0.5'}`}
                    >
                      {isSavingRoute ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Confirming Transaction...
                        </>
                      ) : routeSaved ? (
                        'Routing Rule Active ✓'
                      ) : (
                        'Save Routing Rule'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Available Vaults */}
              <div className="flex flex-col gap-5">
                
                {/* Vault 1 */}
                <div onClick={() => setSelectedRwaTarget('treasuries')} className={`cursor-pointer transition-all duration-300 bg-[#0f0f0f] rounded-3xl p-5 py-6 shadow-xl border backdrop-blur-xl flex items-center justify-between gap-4 ${selectedRwaTarget === 'treasuries' ? 'border-white/80 shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-white/5' : 'border-white/10 hover:border-white/20/80'}`}>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#222222] flex items-center justify-center shrink-0 border border-white/20">
                      <Landmark className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-[1.1rem] tracking-wide flex items-center gap-2">
                        🏛️ US Treasuries <span className="text-xs font-mono text-white/50 bg-[#111111] border border-white/10 px-2 py-0.5 rounded">(tBILL)</span>
                      </h3>
                      <p className="text-sm font-medium mt-1.5 flex items-center gap-2.5">
                        <span className="text-white font-bold bg-white/10 border border-white/20 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(52,211,153,0.1)]">5.2% APY</span> 
                        <span className="text-white/40">|</span> 
                        <span className="text-white font-semibold">Low Risk</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedRwaTarget === 'treasuries' ? 'border-white' : 'border-white/30'}`}>
                      {selectedRwaTarget === 'treasuries' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                    </div>
                  </div>
                </div>

                {/* Vault 2 */}
                <div onClick={() => setSelectedRwaTarget('realEstate')} className={`cursor-pointer transition-all duration-300 bg-[#0f0f0f] rounded-3xl p-5 py-6 shadow-xl border backdrop-blur-xl flex items-center justify-between gap-4 ${selectedRwaTarget === 'realEstate' ? 'border-white/80 shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-white/5' : 'border-white/10 hover:border-white/20/80'}`}>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#222222] flex items-center justify-center shrink-0 border border-white/20">
                      <Building2 className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-[1.1rem] tracking-wide flex items-center gap-2">
                        🏢 Fractional Real Estate <span className="text-xs font-mono text-white/50 bg-[#111111] border border-white/10 px-2 py-0.5 rounded">(rEST)</span>
                      </h3>
                      <p className="text-sm font-medium mt-1.5 flex items-center gap-2.5">
                        <span className="text-white font-bold bg-white/10 border border-white/20 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(52,211,153,0.1)]">8.0% APY</span> 
                        <span className="text-white/40">|</span> 
                        <span className="text-white font-semibold">Medium Risk</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedRwaTarget === 'realEstate' ? 'border-white' : 'border-white/30'}`}>
                      {selectedRwaTarget === 'realEstate' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                    </div>
                  </div>
                </div>
                
                {/* Vault 3 */}
                <div onClick={() => setSelectedRwaTarget('gold')} className={`cursor-pointer transition-all duration-300 bg-[#0f0f0f] rounded-3xl p-5 py-6 shadow-xl border backdrop-blur-xl flex items-center justify-between gap-4 ${selectedRwaTarget === 'gold' ? 'border-white/80 shadow-[0_0_15px_rgba(249,115,22,0.15)] bg-white/5' : 'border-white/10 hover:border-white/20/80'}`}>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#222222] flex items-center justify-center shrink-0 border border-white/20">
                      <CreditCard className="w-6 h-6 text-white/60" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-[1.1rem] tracking-wide flex items-center gap-2">
                        🪙 Tokenized Gold <span className="text-xs font-mono text-white/50 bg-[#111111] border border-white/10 px-2 py-0.5 rounded">(tGOLD)</span>
                      </h3>
                      <p className="text-sm font-medium mt-1.5 flex items-center gap-2.5">
                        <span className="text-white font-bold bg-white/10 border border-white/20 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(251,191,36,0.1)]">Safe Haven</span> 
                        <span className="text-white/40">|</span> 
                        <span className="text-white font-semibold">Inflation Hedge</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedRwaTarget === 'gold' ? 'border-white' : 'border-white/30'}`}>
                      {selectedRwaTarget === 'gold' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* ========== REWARD PAGE ========== */}
        {activePage === 'reward' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            
            <div className="text-center mb-10 md:mb-14">
              <h1 className="text-[2.5rem] md:text-[3rem] font-extrabold mb-3 tracking-tight text-white drop-shadow-sm">Ecosystem Rewards</h1>
              <p className="text-white/60 text-sm md:text-base font-medium">Manage and claim your generated yield and SfS Service Credits.</p>
            </div>

            {/* Top Cards Grid: 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
              
              {/* Card 1: Available Yield */}
              <div className="bg-[#0f0f0f] rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:border-white/20/80 transition-colors duration-500 flex flex-col h-full min-h-[220px]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/50 opacity-90"></div>
                <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-white" />
                  Available Yield
                </h3>
                <div className="flex flex-col mt-auto mb-6">
                  <div className="text-[3rem] md:text-[3.5rem] font-extrabold text-white leading-none tracking-tight">
                    125.50 <span className="text-xl md:text-2xl text-white/50 font-bold ml-1">RLO</span>
                  </div>
                  <div className="text-white font-medium text-sm mt-3 flex items-center gap-1.5">
                    <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded shadow-sm">≈ $125.50</span>
                  </div>
                </div>
                <button 
                  onClick={handleClaim}
                  disabled={stakingLoading}
                  className="w-full mt-auto font-bold py-3.5 rounded-xl transition-all text-sm flex justify-center items-center gap-2 bg-[#222222] hover:bg-white/20 border border-white/20 hover:border-white/50 text-white/80 hover:text-white shadow-sm hover:shadow-[0_4px_15px_rgba(52,211,153,0.15)] active:translate-y-0.5">
                  {stakingLoading ? 'Claiming...' : 'Claim to Wallet'}
                </button>
              </div>

              {/* Card 2: Service Credits */}
              <div className="bg-[#0f0f0f] rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl group hover:border-white/20/80 transition-colors duration-500 flex flex-col h-full min-h-[220px]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-90"></div>
                <h3 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-white" />
                  Accumulated Credits
                </h3>
                <div className="flex flex-col mt-auto mb-6">
                  <div className="text-[3rem] md:text-[3.5rem] font-extrabold text-white drop-shadow-md leading-none tracking-tight">
                    1,250.00
                  </div>
                  <div className="text-white/60 font-medium text-sm mt-3">
                    Ready for Zero-Gas & AI Agents
                  </div>
                </div>
                <button className="w-full mt-auto font-bold py-3.5 rounded-xl transition-all text-sm flex justify-center items-center gap-2 bg-white/10 hover:bg-white border border-white/30 hover:border-white text-white hover:text-white shadow-[0_0_15px_rgba(249,115,22,0.1)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.25)] active:translate-y-0.5">
                  Fund Paymaster
                </button>
              </div>
              
            </div>

            {/* Bottom Section: Yield Trajectory Table */}
            <div className="bg-[#111111]/50 rounded-3xl p-1 shadow-inner border border-white/10/60 flex flex-col backdrop-blur-sm mb-4">
              <div className="p-5 md:p-6 pb-4 border-b border-white/10/50">
                <h2 className="text-[1.1rem] font-bold text-white/90 tracking-tight flex items-center gap-2">
                  <Route className="w-4 h-4 text-white/60" />
                  Yield Breakdown
                </h2>
              </div>
              <div className="flex flex-col divide-y divide-slate-800/50">
                
                <div className="flex items-center justify-between p-5 md:px-6 hover:bg-[#222222]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center border border-white/20">
                      <Droplet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/80 font-medium text-sm">Single RLO Staking</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white block">+80.00 RLO</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 md:px-6 hover:bg-[#222222]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center border border-white/20">
                      <ArrowUpDown className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/80 font-medium text-sm">Pair (RLO + ETH)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white block">+45.50 RLO</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 md:px-6 hover:bg-[#222222]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center border border-white/20">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/80 font-medium text-sm">SfS Auto-Routing Generation</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white block">+300.00 Credits</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
      <Footer />
    </main>
  );
}
