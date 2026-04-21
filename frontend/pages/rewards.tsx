"use client";

import { useState, useEffect } from "react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useStaking } from '../hooks/useStaking';
import { useRouter } from 'next/router';
import { Droplet, Activity, Loader2, CheckCircle2, AlertCircle, Route, Flame, X } from "lucide-react";

export default function Rewards() {
  const router = useRouter();
  const { isConnected, address, provider, connect, addTransaction, tickingCredits, pendingCredits, claimCredits } = useWallet();
  const {
    pendingRewards: pendingRewStr,
    loading: stakingLoading,
    claimRewards: claimAction,
    fetchStakingData,
    globalRwaYieldUsd,
    setGlobalRwaYieldUsd,
  } = useStaking();

  const [toast, setToast] = useState(null);
  const [claimingUSDC, setClaimingUSDC] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isFueling, setIsFueling] = useState(false);
  const [fuelingProgress, setFuelingProgress] = useState(0);
  const realPendingRewards = parseFloat(pendingRewStr || '0');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleClaim = async () => {
    if (!isConnected) { connect(); return; }
    if (realPendingRewards <= 0) {
      setToast({ message: "No rewards to claim", type: "error" });
      return;
    }
    try {
      const hash = await claimAction();
      addTransaction({ type: 'Claim', amount: `${realPendingRewards.toFixed(2)} RLO`, details: 'Claimed Staking Rewards', txHash: hash });
      setToast({ message: "Rewards claimed successfully!", type: "success", txHash: hash });
      if (address && provider) {
        fetchStakingData();
      }
    } catch (e) {
      setToast({ message: "Claim failed", type: "error" });
    }
  };

  const handleClaimUSDC = async () => {
    if (!isConnected) { connect(); return; }
    setClaimingUSDC(true);
    try {
      const signer = await provider.getSigner();
      const rwaAmount = globalRwaYieldUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const message = `Sign to claim $${rwaAmount} USDC to your wallet.`;
      const signature = await signer.signMessage(message);
      addTransaction({ type: 'Claim', amount: `${rwaAmount} USDC`, details: 'Claimed RWA Upfront Payout', txHash: signature.slice(0, 66) });
      setToast({ message: "USDC successfully claimed to wallet!", type: "success" });
    } catch (e: any) {
      if (e?.code === 4001 || e?.code === 'ACTION_REJECTED') {
        setToast({ message: "Signature rejected by user.", type: "error" });
      } else {
        setToast({ message: "USDC claim failed. Please try again.", type: "error" });
      }
    } finally {
      setClaimingUSDC(false);
    }
  };

  const handleClaimCredits = async () => {
    if (!isConnected || pendingCredits <= 0 || isFueling) return;

    setIsFueling(true);
    setFuelingProgress(0);

    // Animation loop for "Fueling"
    const duration = 2000; // 2 seconds
    const start = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setFuelingProgress(progress * 100);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(async () => {
          const awarded = await claimCredits();
          setToast({ 
            message: `Fueling Complete! ⚡`,
            detail: `${awarded} Credits added to your AI Agent.`,
            type: 'success'
          });
          setIsFueling(false);
          setFuelingProgress(0);
        }, 300);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    if (!isConnected || isRedeeming || !redeemAmount) return;

    setIsRedeeming(true);
    try {
      // Simulasi Web3 burn transaction
      await new Promise(resolve => setTimeout(resolve, 2000));

      const usdcReceived = (parseFloat(redeemAmount) * 2340.50).toFixed(2);
      
      addTransaction({ 
        type: 'Redeem', 
        amount: `${redeemAmount} XAUt`, 
        details: `Burned XAUt for $${usdcReceived} USDC`,
        txHash: '0x' + Math.random().toString(16).slice(2, 42) 
      });

      setToast({ message: "Successfully burned XAUt and claimed USDC!", type: "success" });
      
      // Reset global state (simulation of full redemption)
      setGlobalRwaYieldUsd(0);
      
      setIsRedeemModalOpen(false);
      setRedeemAmount('');
    } catch (e) {
      setToast({ message: "Redemption failed. Please try again.", type: "error" });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 font-body antialiased selection:bg-primary/30 flex flex-col relative">

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <Navbar />

      <div className="max-w-5xl mx-auto flex-grow w-full mt-10 md:mt-24 px-4">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="text-center mb-16">
            <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-slate-900">Ecosystem Rewards</h1>
            <p className="text-slate-500 max-w-xl mx-auto font-medium">Manage and claim your generated yield and SfS Service Credits.</p>
          </div>

          {/* Top Cards Grid: 3 Columns \u2014 order: Yield | RWA | Credits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-8">

            {/* Card 1: Available Yield (RLO) */}
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                Available Yield
              </h3>
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  {realPendingRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">stRLO</span>
                </div>
                <div className="text-white/20 font-bold uppercase tracking-widest text-[10px] mt-4">
                  \u2248 ${(realPendingRewards * 3).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>
              <button
                onClick={handleClaim}
                disabled={stakingLoading}
                className="w-full mt-auto bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
              >
                {stakingLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Claim to Wallet'}
              </button>
            </div>

            {/* Card 2: RWA Portfolio \u2014 Simplified */}
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-emerald-500/10 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -mr-20 -mt-20 blur-3xl opacity-60 pointer-events-none"></div>

              {/* Header label */}
              <h3 className="text-emerald-500/50 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                RWA Portfolio
              </h3>

              {/* Main number */}
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  ${globalRwaYieldUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">USD</span>
                </div>
                <div className="text-emerald-500/40 font-bold uppercase tracking-widest text-[10px] mt-4">
                  Upfront Payout \u00B7 USDC
                </div>
              </div>

              {/* Double button footer */}
              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => router.push('/staking')}
                  className="flex-1 bg-white text-black py-4 rounded-xl font-headline font-extrabold text-sm tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all"
                >
                  Stake More
                </button>
                <button
                  onClick={() => setIsRedeemModalOpen(true)}
                  disabled={globalRwaYieldUsd <= 0}
                  className={`flex-1 border py-4 rounded-xl font-headline font-extrabold text-sm tracking-tight active:scale-[0.98] transition-all ${
                    globalRwaYieldUsd > 0
                      ? 'border-white/20 text-white hover:bg-white/5'
                      : 'border-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  Redeem XAUt
                </button>
              </div>
            </div>

            {/* Card 3: Accumulated Credits */}
            <div className={`bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border transition-all duration-500 flex flex-col h-full min-h-[260px] relative overflow-hidden group ${isFueling ? 'border-primary/50' : 'border-white/5'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              
              {isFueling && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none"></div>
              )}

              <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                Accumulated Credits
              </h3>

              <div className="flex flex-col mt-auto mb-6">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  {Math.floor(tickingCredits).toLocaleString('en-US')} <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">Credits</span>
                </div>
                
                {pendingCredits > 0 && !isFueling && (
                  <div className="mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-primary text-[10px] font-extrabold uppercase tracking-widest">+ {Math.floor(pendingCredits)} Credits Pending</span>
                  </div>
                )}
                
                <div className="text-white/20 font-bold uppercase tracking-widest text-[10px] mt-4">
                  1 USDT = 1,000 Credits
                </div>
              </div>

              {pendingCredits > 0 || isFueling ? (
                <div className="mt-auto space-y-4">
                  {isFueling && (
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all duration-75 ease-linear"
                        style={{ width: `${fuelingProgress}%` }}
                      ></div>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleClaimCredits}
                    disabled={isFueling}
                    className={`w-full py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight transition-all shadow-2xl flex items-center justify-center gap-3 ${
                      isFueling 
                        ? 'bg-primary text-black scale-[1.02] cursor-not-allowed shadow-primary/20' 
                        : 'bg-primary hover:bg-primary/90 text-black active:scale-[0.98]'
                    }`}
                  >
                    {isFueling ? (
                      <><Flame className="w-5 h-5 animate-bounce" /> Fueling AI Agent...</>
                    ) : (
                      'Claim Credits'
                    )}
                  </button>
                </div>
              ) : (
                <button className="w-full mt-auto bg-[#161616] hover:bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm">
                  Fund Paymaster
                </button>
              )}
            </div>

          </div>

          {/* Bottom Section: Yield Breakdown Table */}
          <div className="mt-12 bg-[#0c0c0c] rounded-2xl border border-white/10 overflow-hidden text-white">
            <div className="p-8 border-b border-white/5">
              <h2 className="text-xl font-headline font-extrabold tracking-tighter text-white">Yield Breakdown</h2>
            </div>
            <div className="flex flex-col divide-y divide-white/5">

              <div className="flex items-center justify-between p-6 hover:bg-white/3 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-label">Single RLO Staking</span>
                <span className="font-headline font-extrabold text-lg text-primary">+80.00 RLO</span>
              </div>

              <div className="flex items-center justify-between p-6 hover:bg-white/3 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-label">Pair (RLO + ETH)</span>
                <span className="font-headline font-extrabold text-lg text-primary">+45.50 RLO</span>
              </div>

              <div className="flex items-center justify-between p-6 hover:bg-white/3 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-label">Upfront RWA Payout</span>
                <span className="font-headline font-extrabold text-lg text-emerald-400">+${globalRwaYieldUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
              </div>

              <div className="flex items-center justify-between p-6 hover:bg-white/3 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-label">SfS Routing Fee</span>
                <span className="font-headline font-extrabold text-lg text-red-400">-550.00 Credits</span>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em] py-20">
            Note: All yield is calculated in real-time on Sepolia Testnet. Payouts are subject to staking tiers and selected lock-ups.
          </p>

        </div>
      </div>

      <Footer />

      {/* Redeem XAUt Modal */}
      {isRedeemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => !isRedeeming && setIsRedeemModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 w-full max-w-md relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-headline font-extrabold tracking-tighter">Redeem XAUt to USDC</h2>
              <button 
                onClick={() => setIsRedeemModalOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-4">
                  Current Rate: 1 XAUt = $2,340.50 USDC
                </p>
                
                <div className="relative group">
                  <input
                    type="number"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#161616] border border-white/5 rounded-xl px-4 py-4 text-2xl font-bold text-white placeholder:text-white/5 outline-none focus:border-white/20 transition-all"
                  />
                  <button 
                    onClick={() => setRedeemAmount((globalRwaYieldUsd / 2340.5).toString())}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-all uppercase tracking-widest"
                  >
                    MAX
                  </button>
                </div>

                {redeemAmount && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="text-white/40 text-xs font-medium">
                      You will receive: <span className="text-emerald-400">~${(parseFloat(redeemAmount) * 2340.50).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleRedeemSubmit}
                disabled={isRedeeming || !redeemAmount || parseFloat(redeemAmount) <= 0}
                className="w-full bg-white text-black py-4 rounded-xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isRedeeming ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  'Burn XAUt & Claim USDC'
                )}
              </button>

              <p className="text-[10px] text-white/20 text-center font-medium leading-relaxed">
                By redeeming, your yield tokens will be permanently burned from the ecosystem in exchange for USDC liquidity.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

