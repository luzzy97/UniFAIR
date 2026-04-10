"use client";

import { useState, useEffect } from "react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useStaking } from '../hooks/useStaking';
import { useRouter } from 'next/router';
import { Droplet, Activity, Loader2, CheckCircle2, AlertCircle, Route, Flame } from "lucide-react";

export default function Rewards() {
  const { isConnected, address, provider, connect, addTransaction } = useWallet();
  const { 
    pendingRewards: pendingRewStr, 
    tickingRewards,
    tickingCredits,
    loading: stakingLoading, 
    claimRewards: claimAction,
    fetchStakingData
  } = useStaking();

  const [toast, setToast] = useState(null);
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

  return (
    <main className="min-h-screen bg-white text-zinc-900 font-body antialiased selection:bg-primary/30 flex flex-col relative">
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <Navbar />

      <div className="max-w-5xl mx-auto flex-grow w-full mt-10 md:mt-24 px-4">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="text-center mb-16">
            <h1 className="text-5xl text-black mb-4">Ecosystem Rewards</h1>
            <p className="text-zinc-500 max-w-xl mx-auto font-medium">Manage and claim your generated yield and SfS Service Credits.</p>
          </div>

          {/* Top Cards Grid: 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
            
            {/* Card 1: Available Yield */}
            <div className="bg-[#0c0c0c] rounded-3xl p-8 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              <div className="w-12 h-12 rounded-xl bg-[#161616] border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-all duration-300">
                <span className="material-symbols-outlined text-[18px] text-white/70 group-hover:text-black transition-colors">payments</span>
              </div>
              <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                Available Yield
              </h3>
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  {tickingRewards.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 4})} <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">RLO</span>
                </div>
                <div className="text-white/20 font-bold uppercase tracking-widest text-[10px] mt-4">
                  ≈ ${(tickingRewards * 3).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                </div>
              </div>
              <button 
                onClick={handleClaim}
                disabled={stakingLoading}
                className="w-full mt-auto bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:bg-white/30 disabled:text-black/50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {stakingLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  'Claim to Wallet'
                )}
              </button>
            </div>

            {/* Card 2: Service Credits */}
            <div className="bg-[#0c0c0c] rounded-3xl p-8 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              <div className="w-12 h-12 rounded-xl bg-[#161616] border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-all duration-300">
                <span className="material-symbols-outlined text-[18px] text-white/70 group-hover:text-black transition-colors">auto_awesome</span>
              </div>
              <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                Accumulated Credits
              </h3>
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  {(tickingCredits || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">ϕ</span>
                </div>
                <div className="text-white/20 font-bold uppercase tracking-widest text-[10px] mt-4">
                  Ready for Zero-Gas Transactions
                </div>
              </div>
              <button className="w-full mt-auto bg-[#161616] hover:bg-white hover:text-black border border-white/10 text-white/40 py-5 rounded-2xl font-headline font-extrabold text-sm uppercase tracking-widest transition-all duration-300 shadow-sm active:scale-[0.98]">
                Fund Paymaster
              </button>
            </div>
            
          </div>          {/* Bottom Section: Yield Trajectory Table */}
          <div className="mt-12 bg-[#0c0c0c] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5">
              <h2 className="text-xl font-headline font-extrabold tracking-tighter text-white uppercase opacity-80">Yield Breakdown</h2>
            </div>
            <div className="flex flex-col divide-y divide-white/5">
              
              <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">Single RLO Staking</span>
                <span className="font-headline font-extrabold text-lg text-white">+80.00 RLO</span>
              </div>
 
              <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">Pair (RLO + ETH)</span>
                <span className="font-headline font-extrabold text-lg text-white">+45.50 RLO</span>
              </div>
 
              <div className="flex items-center justify-between p-6 hover:bg-white/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">SfS Routing Fee</span>
                <span className="font-headline font-extrabold text-lg text-red-500">-550.00 Credits</span>
              </div>
            </div>
          </div>

          <p className="text-center text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] py-20">
            Note: All yield is calculated in real-time on Sepolia Testnet. Payouts are subject to staking tiers and selected lock-ups.
          </p>

        </div>
      </div>

      <Footer />
    </main>
  );
}
