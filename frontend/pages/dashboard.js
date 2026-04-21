import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import ActivityWidget from '../components/ActivityWidget';

export default function DashboardPage() {
const { isConnected, address, balances, transactions, connect, toast, showToast, pendingCredits } = useWallet();
const { balance: rialoBalance } = useRLO();
const { stakedBalance: stakedBalStr, fetchStakingData } = useStaking();

useEffect(() => {
  if (address) {
    fetchStakingData();
  }
}, [address, fetchStakingData]);

const stakedBalance = parseFloat(stakedBalStr || '0');
const availableRialo = balances['RIALO'] || 0;

const displayBalances = {
  ...balances,
  RIALO: availableRialo,
  STAKED: stakedBalance
};

return (
  <div className="min-h-screen bg-white text-zinc-900 font-body antialiased selection:bg-primary/30 flex flex-col relative overflow-x-hidden">
    <Navbar />
    
    {/* Ambient backgrounds */}
    <div className="fixed top-0 left-0 w-full h-[800px] pointer-events-none overflow-hidden z-0 opacity-20">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-100 rounded-full blur-[120px]"></div>
      <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-zinc-50 rounded-full blur-[100px]"></div>
    </div>

    <main className="max-w-7xl mx-auto px-6 py-12 flex-grow w-full relative z-10">
      {/* Header */}
      <header className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-5xl md:text-6xl text-black mb-4">
          Architectural Dashboard
        </h1>
        <p className="font-body text-zinc-500 max-w-2xl text-lg font-medium">
          A comprehensive overview of your position within the Rialo ecosystem. Monitor your assets, yield, and network participation.
        </p>
      </header>
      
      {/* Pending Credits Alert */}
      {isConnected && pendingCredits > 0 && (
        <div 
          onClick={() => window.location.href = '/rewards'}
          className="mb-8 p-6 bg-[#0c0c0c] border border-primary/20 rounded-3xl relative overflow-hidden group cursor-pointer hover:border-primary/40 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          <div className="absolute inset-0 bg-primary/5 animate-pulse group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined font-bold">bolt</span>
              </div>
              <div>
                <h4 className="text-white font-headline font-extrabold text-lg tracking-tight">AI Credits Available</h4>
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest leading-none mt-1">
                  You have <span className="text-primary">{Math.floor(pendingCredits).toLocaleString('en-US')} Credits</span> ready to claim in the Rewards hub.
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              Claim Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                  { symbol: 'RIALO', label: 'Ecosystem Token', color: 'bg-primary', icon: 'currency_exchange' },
                  { symbol: 'ETH', label: 'Ethereum Testnet', color: 'bg-[#627EEA]', icon: 'water_drop' },
                  { symbol: 'USDC', label: 'USD Coin', color: 'bg-[#2775CA]', icon: 'attach_money' },
                  { symbol: 'USDT', label: 'Tether USD', color: 'bg-[#26A17B]', icon: 'monetization_on' },
              ].map((token, i) => (
                  <div key={token.symbol} className="bg-[#0c0c0c] text-white rounded-3xl p-8 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden group hover:bg-[#111111] hover:border-white/10 transition-all duration-500 flex flex-col justify-between h-[230px] animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="relative z-10 flex justify-between items-start">
                          <div>
                              <span className="font-label text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-3 block">{token.label}</span>
                              <h2 className="font-headline text-4xl font-extrabold text-white leading-none tracking-tighter">
                                  {isConnected ? (displayBalances[token.symbol] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                              </h2>
                          </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#161616] border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                            <span className="material-symbols-outlined text-[18px] text-white/70 group-hover:text-black transition-colors">{token.icon}</span>
                        </div>
                        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{token.symbol}</p>
                      </div>
                      <div className={`absolute -right-4 -bottom-4 w-32 h-32 ${token.color}/20 rounded-full blur-[40px] group-hover:${token.color}/30 transition-all duration-700`}></div>
                  </div>
              ))}
          </div>
          <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
              <ActivityWidget />
          </div>
      </div>

      {/* History Table */}
      <section className="mb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
        <div className="flex justify-between items-center mb-8 px-2">
          <div>
            <h3 className="font-headline font-bold text-black text-2xl flex items-center gap-3">
                <div className="p-2 bg-[#0c0c0c] rounded-xl">
                    <span className="material-symbols-outlined text-white text-xl">history</span>
                </div>
                Transaction History
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 rounded-full border border-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">Live Sync</span>
              </div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-[0.1em] font-bold">
                <span className="text-zinc-900 tabular-nums transition-all duration-500 inline-block hover:scale-110">
                  {transactions.length}
                </span> total operations recorded
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0c0c0c] rounded-3xl border border-white/5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          {isConnected && transactions.length > 0 && (
            <div className="grid grid-cols-[60px_1fr_auto_auto] gap-4 px-8 py-5 border-b border-white/5 bg-[#111111]">
              <div />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Transaction</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Amount</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Receipt</span>
            </div>
          )}

          {isConnected ? (
            transactions.length > 0 ? (
              <div className="divide-y divide-white/5">
                {transactions.slice(0, 10).map((tx, i) => {
                  const typeConfig = {
                    'Swap':    { icon: 'swap_horiz', bg: 'bg-indigo-500/10', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20' },
                    'Bridge':  { icon: 'alt_route', bg: 'bg-blue-500/10', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/20' },
                    'Stake':   { icon: 'lock', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' },
                    'Unstake': { icon: 'lock_open', bg: 'bg-orange-500/10', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/20' },
                    'Faucet':  { icon: 'water_drop', bg: 'bg-cyan-500/10', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20' },
                    'Claim':   { icon: 'redeem', bg: 'bg-yellow-500/10', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20' },
                    'Credits': { icon: 'bolt', bg: 'bg-primary/10', text: 'text-primary', badge: 'bg-primary/20 text-primary border-primary/20' },
                  };
                  const cfg = typeConfig[tx.type] || { icon: 'receipt_long', bg: 'bg-white/5', text: 'text-white/40', badge: 'bg-white/10 text-white/40 border-white/10' };
                  const shortHash = tx.txHash && !tx.txHash.startsWith('local-') ? `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}` : null;
                  
                  return (
                    <div key={tx.id || i} className="grid grid-cols-[60px_1fr_auto_auto] gap-4 items-center px-8 py-6 hover:bg-white/[0.02] transition-colors group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cfg.bg} border border-white/5 shadow-inner`}>
                         <span className={`material-symbols-outlined ${cfg.text} text-xl`}>{cfg.icon}</span>
                      </div>
                      <div className="flex flex-col">
                         <div className="flex items-center gap-3">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.badge}`}>{tx.type}</span>
                           <span className="text-sm font-bold text-white transition-colors">{tx.details || tx.type}</span>
                         </div>
                         <span className="text-[10px] text-white/40 mt-1 font-medium">{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-white tracking-tighter">{tx.amount}</span>
                      </div>
                      <div className="text-right">
                        {shortHash ? (
                           <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener" className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${cfg.text} hover:brightness-125 transition-all`}>
                             SCAN <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                           </a>
                        ) : (
                          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Simulation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <span className="material-symbols-outlined text-white/20 text-3xl">inbox</span>
                </div>
                <p className="text-white/30 text-sm font-bold uppercase tracking-widest">No active transactions</p>
              </div>
            )
          ) : (
            <div className="py-24 text-center">
               <button onClick={connect} className="bg-white text-black px-8 py-4 rounded-2xl font-headline font-extrabold text-sm hover:bg-white/90 transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)]">Connect Wallet</button>
            </div>
          )}
        </div>
      </section>
    </main>
    <Footer />
  </div>
);
}
