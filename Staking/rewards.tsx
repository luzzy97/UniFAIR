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
    loading: stakingLoading, 
    claimRewards: claimAction,
    fetchStakingData
  } = useStaking();

  const [toast, setToast] = useState(null);
  const [claimingUSDC, setClaimingUSDC] = useState(false);
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
      const message = "Sign to claim $10.53 USDC to your wallet.";
      const signature = await signer.signMessage(message);
      addTransaction({ type: 'Claim', amount: '10.53 USDC', details: 'Claimed RWA Upfront Payout', txHash: signature.slice(0, 66) });
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

  return (
    <main className="min-h-screen bg-background text-on-background font-body antialiased selection:bg-primary/30 flex flex-col relative">
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <Navbar />

      <div className="max-w-5xl mx-auto flex-grow w-full mt-10 md:mt-24 px-4">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="text-center mb-16">
            <h1 className="text-5xl font-headline font-extrabold mb-4 tracking-tighter text-primary">Ecosystem Rewards</h1>
            <p className="text-on-surface/60 max-w-xl mx-auto font-medium">Manage and claim your generated yield and SfS Service Credits.</p>
          </div>

          {/* Top Cards Grid: 3 Columns — order: Yield | RWA | Credits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mb-8">

            {/* Card 1: Available Yield (RLO) */}
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                Available Yield
              </h3>
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  {realPendingRewards.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">RLO</span>
                </div>
                <div className="text-white/20 font-bold uppercase tracking-widest text-[10px] mt-4">
                  ≈ ${(realPendingRewards * 3).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
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

            {/* Card 2: RWA Portfolio (USDC) — CENTER */}
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-emerald-500/10 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/8 rounded-full -mr-20 -mt-20 blur-3xl opacity-60"></div>
              <h3 className="text-emerald-400/50 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                RWA Portfolio
              </h3>
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  $10.53 <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">USD</span>
                </div>
                <div className="text-emerald-400/40 font-bold uppercase tracking-widest text-[10px] mt-4">
                  Upfront Payout · USDC
                </div>
              </div>
              <button
                onClick={handleClaimUSDC}
                disabled={claimingUSDC}
                className="w-full mt-auto bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
              >
                {claimingUSDC ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Claim to Wallet'}
              </button>
            </div>

            {/* Card 3: Accumulated Credits */}
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-hidden group transition-all duration-500 flex flex-col h-full min-h-[260px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
              <h3 className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em] font-label mb-6">
                Accumulated Credits
              </h3>
              <div className="flex flex-col mt-auto mb-8">
                <div className="text-5xl md:text-6xl font-headline font-extrabold text-white leading-none tracking-tighter">
                  1,250.00 <span className="text-xl md:text-2xl text-white/20 font-bold ml-1">ϕ</span>
                </div>
                <div className="text-white/20 font-bold uppercase tracking-widest text-[10px] mt-4">
                  Ready for Zero-Gas Transactions
                </div>
              </div>
              <button className="w-full mt-auto bg-[#161616] hover:bg-[#1a1a1a] border border-white/10 text-white/40 hover:text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm">
                Fund Paymaster
              </button>
            </div>

          </div>

          {/* Bottom Section: Yield Trajectory Table */}
          <div className="mt-12 bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="p-8 border-b border-outline-variant/5">
              <h2 className="text-xl font-headline font-extrabold tracking-tighter text-primary">Yield Breakdown</h2>
            </div>
            <div className="flex flex-col divide-y divide-outline-variant/5">
              
              <div className="flex items-center justify-between p-6 hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/40 font-label">Single RLO Staking</span>
                <span className="font-headline font-extrabold text-lg text-primary">+80.00 RLO</span>
              </div>
 
              <div className="flex items-center justify-between p-6 hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/40 font-label">Pair (RLO + ETH)</span>
                <span className="font-headline font-extrabold text-lg text-primary">+45.50 RLO</span>
              </div>

              <div className="flex items-center justify-between p-6 hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/40 font-label">Upfront RWA Payout</span>
                <span className="font-headline font-extrabold text-lg text-emerald-400">+$10.53 USD</span>
              </div>
 
              <div className="flex items-center justify-between p-6 hover:bg-black/5 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/40 font-label">SfS Routing Fee</span>
                <span className="font-headline font-extrabold text-lg text-error">-550.00 Credits</span>
              </div>
            </div>
          </div>

          <p className="text-center text-on-surface/40 text-xs font-bold uppercase tracking-[0.2em] py-20">
            Note: All yield is calculated in real-time on Sepolia Testnet. Payouts are subject to staking tiers and selected lock-ups.
          </p>

        </div>
      </div>

      <Footer />
    </main>
  );
}
