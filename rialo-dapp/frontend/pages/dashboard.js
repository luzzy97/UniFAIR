import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import Link from 'next/link';

export default function DashboardPage() {
  const { isConnected, address, balances, stakedBalance, connect } = useWallet();
  const [rewards, setRewards] = useState({ totalEarned: '12,482.50', claimable: '842.12', apy: 18.4 });
  const [loading, setLoading] = useState(false);

  const rialoBalance = balances['RIALO'] || 0;
  const totalValue = rialoBalance + stakedBalance;

  // Mock data for the chart
  const portfolioData = [
    { label: 'Staked', value: stakedBalance, color: 'bg-primary' },
    { label: 'Wallet', value: rialoBalance, color: 'bg-white/20' },
  ];

  return (
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-8 py-16">
        {/* Header */}
        <header className="mb-16">
          <h1 className="font-headline text-[3.5rem] font-extrabold text-primary leading-none tracking-tight mb-4">
            Architectural Dashboard
          </h1>
          <p className="font-body text-on-surface/70 max-w-2xl">
            A comprehensive overview of your position within the Rialo ecosystem. Monitor your assets, yield, and network participation from a single interface.
          </p>
        </header>

        {/* Top Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Total Portfolio */}
          <div className="lg:col-span-2 bg-[#0c0c0c] rounded-2xl p-10 flex flex-col justify-between min-h-[280px] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <span className="font-label text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-6 block">Total Portfolio Value</span>
              <h2 className="font-headline text-[4rem] font-extrabold text-white leading-none tracking-tighter">
                {isConnected ? totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                <span className="text-white/10 text-2xl block mt-2 font-body font-normal">RIALO</span>
              </h2>
            </div>
            <div className="flex items-center gap-4 relative z-10">
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary border-2 border-[#0c0c0c] flex items-center justify-center text-[10px] font-bold">R</div>
                  <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#0c0c0c] flex items-center justify-center text-[10px] font-bold">E</div>
               </div>
               <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Active globally</span>
            </div>
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          </div>

          {/* Staking Summary */}
          <div className="bg-white rounded-2xl p-10 flex flex-col justify-between min-h-[280px] text-black shadow-2xl transition-transform hover:scale-[1.02]">
            <div>
              <span className="font-label text-[10px] text-black/40 uppercase tracking-[0.2em] font-bold mb-6 block">Currently Staking</span>
              <h2 className="font-headline text-4xl font-extrabold leading-none tracking-tight">
                {isConnected ? stakedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                <span className="text-black/20 text-xl block mt-2 font-body font-normal">RIALO</span>
              </h2>
            </div>
            <Link href="/staking" className="w-full bg-black text-white font-headline font-bold py-4 rounded-xl hover:bg-black/90 transition-all flex items-center justify-center gap-2 group">
              Manage Stake 
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>

          {/* Rewards Summary */}
          <div className="bg-[#0c0c0c] rounded-2xl p-10 flex flex-col justify-between min-h-[280px] border border-white/5 shadow-2xl">
            <div>
              <span className="font-label text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-6 block">Accumulated Rewards</span>
              <h2 className="font-headline text-4xl font-extrabold text-white leading-none tracking-tight">
                {isConnected ? rewards.claimable : '0.00'}
                <span className="text-white/10 text-xl block mt-2 font-body font-normal">RIALO</span>
              </h2>
            </div>
            <Link href="/rewards" className="text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity">
              Claim Rewards <span className="material-symbols-outlined text-sm">download</span>
            </Link>
          </div>
        </div>

        {/* Detailed Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Portfolio Composition */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
              <h3 className="font-headline font-bold text-primary text-lg mb-10">Asset Composition</h3>
              
              <div className="space-y-8">
                {portfolioData.map((item, i) => {
                  const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-headline font-bold text-sm text-white">{item.label}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                          {item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} RIALO ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} transition-all duration-1000 ease-out`}
                          style={{ width: `${isConnected ? percentage : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Network APY</p>
                  <p className="font-headline text-2xl font-extrabold text-white">18.4%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Protocol Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.3)]"></div>
                    <p className="font-headline text-2xl font-extrabold text-white">Optimal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Tips */}
          <div className="space-y-6">
            <h3 className="font-headline font-bold text-primary text-lg">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'Swap Assets', icon: 'swap_horiz', href: '/swap', desc: 'Exchange RIALO for other assets' },
                { label: 'Bridge Assets', icon: 'account_balance', href: '/bridge', desc: 'Transfer across networks' },
                { label: 'Explore Ecosystem', icon: 'explore', href: '/learn', desc: 'Learn about Rialo architecture' },
              ].map((action, i) => (
                <Link 
                  key={i} 
                  href={action.href}
                  className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-sm">{action.icon}</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-sm text-white group-hover:text-primary transition-colors">{action.label}</p>
                      <p className="text-[10px] text-white/40 font-body mt-1">{action.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
