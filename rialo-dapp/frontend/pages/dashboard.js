import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import Link from 'next/link';

export default function DashboardPage() {
  const { isConnected, address, balances, stakedBalance, transactions, connect } = useWallet();
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

        {/* Individual Asset Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { symbol: 'RIALO', label: 'Ecosystem Token', color: 'bg-primary', icon: 'currency_exchange' },
            { symbol: 'ETH', label: 'Ethereum Mainnet', color: 'bg-[#627EEA]', icon: 'token' },
            { symbol: 'USDC', label: 'USD Coin', color: 'bg-[#2775CA]', icon: 'monetization_on' },
            { symbol: 'USDT', label: 'Tether USD', color: 'bg-[#26A17B]', icon: 'account_balance_wallet' },
          ].map((token) => (
            <div key={token.symbol} className="bg-[#0c0c0c] rounded-2xl p-8 flex flex-col justify-between min-h-[220px] border border-white/5 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all">
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <span className="font-label text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mb-2 block">{token.label}</span>
                  <h2 className="font-headline text-3xl font-extrabold text-white leading-none tracking-tighter">
                    {isConnected ? (balances[token.symbol] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </h2>
                  <p className="text-white/20 text-xs mt-2 font-body font-normal">{token.symbol}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center border border-white/5 overflow-hidden p-1">
                   <img 
                    src={
                      token.symbol === 'RIALO' ? '/rialo-icon.png' :
                      token.symbol === 'ETH' ? '/eth-icon.png' :
                      token.symbol === 'USDC' ? '/usdc-icon.webp' :
                      '/usdt-icon.png'
                    } 
                    alt={token.symbol} 
                    className="w-full h-full object-contain"
                   />
                </div>
              </div>
              <div className="relative z-10 pt-6">
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${token.color} opacity-30`} style={{ width: '100%' }}></div>
                </div>
              </div>
              {/* Subtle background decoration */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${token.color}/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:${token.color}/10 transition-colors`}></div>
            </div>
          ))}
        </div>

        {/* Unified History Section */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline font-bold text-primary text-lg">Unified Transaction History</h3>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{transactions.length} Total Operations</span>
          </div>
          
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
            {isConnected ? (
              transactions.length > 0 ? (
                <div className="divide-y divide-white/5">
                   {transactions.map((tx, i) => (
                    <div key={tx.id} className="p-6 hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                      <div className="grid grid-cols-[48px_1fr_auto] items-center gap-6">
                        {/* Left: Icon Block */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === 'Swap' ? 'bg-primary/10 text-primary' :
                          tx.type === 'Bridge' ? 'bg-blue-500/10 text-blue-400' :
                          tx.type === 'Stake' ? 'bg-green-500/10 text-green-400' :
                          'bg-purple-500/10 text-purple-400'
                        } border border-white/5 shadow-sm`}>
                          <span className="material-symbols-outlined text-xl">
                            {tx.type === 'Swap' ? 'swap_horiz' :
                             tx.type === 'Bridge' ? 'account_balance' :
                             tx.type === 'Stake' ? 'lock' :
                             'download'}
                          </span>
                        </div>

                        {/* Middle: Type & Context */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-headline font-bold text-sm text-on-surface truncate">
                              {tx.type} Execution
                            </p>
                            {tx.source === 'AI Agent' && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/20 rounded border border-primary/30">
                                <span className="material-symbols-outlined text-[10px] text-primary">smart_toy</span>
                                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">AI Agent</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-on-surface/40 font-body uppercase tracking-wider">
                              {new Date(tx.timestamp).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <span className="text-[10px] text-on-surface/30 font-body italic truncate">{tx.details}</span>
                          </div>
                        </div>

                        {/* Right: Financial Impact & Action */}
                        <div className="flex flex-col items-end gap-1">
                          <p className="font-headline font-black text-on-surface text-lg leading-none">
                            {tx.amount}
                          </p>
                          <a 
                            href={`https://etherscan.io/tx/${tx.txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-tighter"
                          >
                            TXN Receipt <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center">
                  <span className="material-symbols-outlined text-white/10 text-6xl mb-4">history</span>
                  <p className="text-white/30 font-body">No transactions recorded yet.</p>
                </div>
              )
            ) : (
              <div className="p-20 text-center">
                <span className="material-symbols-outlined text-white/10 text-6xl mb-4">account_balance_wallet</span>
                <p className="text-white/30 font-body mb-6">Connect your wallet to view transaction history.</p>
                <button 
                  onClick={connect}
                  className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-white/90 transition-all"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </section>

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
                        <span className="font-headline font-bold text-sm text-on-surface">{item.label}</span>
                        <span className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">
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

              <div className="mt-12 pt-8 border-t border-on-surface/5 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-2">Network APY</p>
                  <p className="font-headline text-2xl font-extrabold text-on-surface">18.4%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-2">Protocol Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.3)]"></div>
                    <p className="font-headline text-2xl font-extrabold text-on-surface">Optimal</p>
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
                    <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors border border-on-surface/5">
                      <span className="material-symbols-outlined text-sm">{action.icon}</span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{action.label}</p>
                      <p className="text-[10px] text-on-surface/40 font-body mt-1">{action.desc}</p>
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
