import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import ActivityWidget from '../components/ActivityWidget';

export default function DashboardPage() {
const { isConnected, address, balances, transactions, connect, toast, showToast } = useWallet();
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
  <div className="bg-[#050505] font-body text-white antialiased selection:bg-primary selection:text-black min-h-screen flex flex-col relative overflow-x-hidden">
    <Navbar />
    
    {/* Ambient backgrounds */}
    <div className="fixed top-0 left-0 w-full h-[600px] pointer-events-none overflow-hidden z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] delay-700 animate-pulse"></div>
    </div>

    <main className="max-w-7xl mx-auto px-6 py-12 flex-grow w-full relative z-10">
      {/* Header */}
      <header className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-primary leading-none tracking-tight mb-4">
          Architectural Dashboard
        </h1>
        <p className="font-body text-white/50 max-w-2xl text-lg">
          A comprehensive overview of your position within the Rialo ecosystem. Monitor your assets, yield, and network participation.
        </p>
      </header>

      {/* Stats and Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                  { symbol: 'RIALO', label: 'Ecosystem Token', color: 'bg-primary' },
                  { symbol: 'ETH', label: 'Ethereum Testnet', color: 'bg-[#627EEA]' },
                  { symbol: 'USDC', label: 'USD Coin', color: 'bg-[#2775CA]' },
                  { symbol: 'STAKED', label: 'Total Staked', color: 'bg-emerald-500' },
              ].map((token, i) => (
                  <div key={token.symbol} className="bg-white/5 rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-white/[0.08] hover:border-white/20 transition-all duration-500 flex flex-col justify-between h-[200px] animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="relative z-10 flex justify-between items-start">
                          <div>
                              <span className="font-label text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-3 block">{token.label}</span>
                              <h2 className="font-headline text-4xl font-extrabold text-white leading-none tracking-tighter">
                                  {isConnected ? (displayBalances[token.symbol] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                              </h2>
                          </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white/40">{token.symbol.slice(0,1)}</span>
                        </div>
                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">{token.symbol}</p>
                      </div>
                      <div className={`absolute -right-4 -bottom-4 w-32 h-32 ${token.color}/10 rounded-full blur-3xl group-hover:${token.color}/20 transition-all duration-700`}></div>
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
            <h3 className="font-headline font-bold text-white text-2xl flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl">
                    <span className="material-symbols-outlined text-primary text-xl">history</span>
                </div>
                Transaction History
            </h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-2">{transactions.length} total operations recorded</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
          {isConnected && transactions.length > 0 && (
            <div className="grid grid-cols-[60px_1fr_auto_auto] gap-4 px-8 py-5 border-b border-white/10 bg-white/5">
              <div />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Transaction</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-right">Amount</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-right">Receipt</span>
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
                           <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{tx.details || tx.type}</span>
                         </div>
                         <span className="text-[10px] text-white/20 mt-1 font-medium">{new Date(tx.timestamp).toLocaleString()}</span>
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
                          <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">Simulation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <span className="material-symbols-outlined text-white/10 text-3xl">inbox</span>
                </div>
                <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No active transactions</p>
              </div>
            )
          ) : (
            <div className="py-24 text-center">
               <button onClick={connect} className="bg-white text-black px-8 py-4 rounded-2xl font-headline font-extrabold text-sm hover:bg-white/90 transition-all shadow-xl">Connect Wallet</button>
            </div>
          )}
        </div>
      </section>
    </main>
    <Footer />
    {toast && <Toast {...toast} onClose={() => showToast(null)} />}
  </div>
);
}
