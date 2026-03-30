import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import Link from 'next/link';

export default function DashboardPage() {
  const { isConnected, address, balances, transactions, triggerOrders = [], removeTriggerOrder, connect } = useWallet();
  const { balance: rialoBalance } = useRLO();
  const { stakedBalance: stakedBalStr, pendingRewards, fetchStakingData } = useStaking();
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (address) {
      fetchStakingData();
    }
  }, [address, fetchStakingData]);

  const stakedBalance = parseFloat(stakedBalStr || '0');
  const availableRialo = parseFloat(rialoBalance || '0');
  const totalValue = availableRialo + stakedBalance;

  // Manual override for asset mapping to show real balances
  const displayBalances = {
    ...balances,
    RIALO: availableRialo,
    ETH: balances['ETH'] || 0,
    STAKED: stakedBalance
  };

  // Portfolio data for chart
  const portfolioData = [
    { label: 'Staked', value: stakedBalance, color: 'bg-primary' },
    { label: 'Wallet', value: availableRialo, color: 'bg-white/20' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {[
            { symbol: 'RIALO', label: 'Ecosystem Token', color: 'bg-primary', icon: 'currency_exchange' },
            { symbol: 'STAKED', label: 'Staked Assets', color: 'bg-emerald-500', icon: 'lock' },
            { symbol: 'ETH', label: 'Ethereum Testnet', color: 'bg-[#627EEA]', icon: 'token' },
            { symbol: 'USDC', label: 'USD Coin', color: 'bg-[#2775CA]', icon: 'monetization_on' },
            { symbol: 'USDT', label: 'Tether USD', color: 'bg-[#26A17B]', icon: 'account_balance_wallet' },
          ].map((token) => (
            <div key={token.symbol} className="bg-[#1c1c1c] rounded-2x p-6 flex flex-col justify-between min-h-[180px] border border-white/10 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all">
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <span className="font-label text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mb-2 block">{token.label}</span>
                  <h2 className="font-headline text-2xl font-extrabold text-white leading-none tracking-tighter">
                    {isConnected ? (displayBalances[token.symbol] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </h2>
                  <p className="text-white/20 text-[10px] mt-2 font-body font-normal">{token.symbol === 'STAKED' ? 'sRLO (Staked)' : token.symbol}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 overflow-hidden p-1.5">
                   <img 
                    src={
                      token.symbol === 'RIALO' || token.symbol === 'STAKED' ? '/rialo-icon.png' :
                      token.symbol === 'ETH' ? '/eth-icon.png' :
                      token.symbol === 'USDC' ? '/usdc-icon.webp' :
                      '/usdt-icon.png'
                    } 
                    alt={token.symbol} 
                    className={`w-full h-full object-contain ${token.symbol === 'STAKED' ? 'opacity-50 grayscale' : ''}`}
                   />
                </div>
              </div>
              <div className="relative z-10 pt-4">
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${token.color} opacity-30`} style={{ width: '100%' }}></div>
                </div>
              </div>
              {/* Subtle background decoration */}
              <div className={`absolute top-0 right-0 w-24 h-24 ${token.color}/5 rounded-full -mr-12 -mt-12 blur-3xl group-hover:${token.color}/10 transition-colors`}></div>
            </div>
          ))}
        </div>

        {/* Trigger Orders Section */}
        {isConnected && triggerOrders?.length > 0 && (
          <section className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-headline font-bold text-primary text-xl">Active Trigger Orders</h3>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{triggerOrders.filter(o => o.status === 'Pending').length} orders awaiting execution</p>
              </div>
            </div>

            <div className="bg-[#1c1c1c] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Table Header */}
              <div className="grid grid-cols-[40px_1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/5 bg-white/5 text-transparent">
                <div />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Order Details</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 text-right">Target Fill</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 text-right">Action</span>
              </div>

              <div>
                {triggerOrders.slice(0, 5).map((order) => {
                  const statusConfig = {
                    'Pending':  { icon: 'schedule',     bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20' },
                    'Executed': { icon: 'check_circle', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' },
                    'Cancelled': { icon: 'cancel',       bg: 'bg-red-500/10',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-300 border-red-500/20' }
                  };
                  const cfg = statusConfig[order.status] || statusConfig['Pending'];

                  return (
                    <div key={order.id} className="grid grid-cols-[40px_1fr_auto_auto] gap-4 items-center px-6 py-5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0 group">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border border-white/5 shadow-sm`}>
                        <span className={`material-symbols-outlined text-[18px] ${cfg.text}`}>{cfg.icon}</span>
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cfg.badge}`}>
                            {order.status}
                          </span>
                          <p className="font-headline font-bold text-sm text-white/90 truncate">
                            Limit: {order.fromToken} → {order.toToken}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/25 font-body">
                          <span>Qty: {order.amountIn} {order.fromToken}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-white/20"></span>
                          <span className="italic">Target: {order.condition} {order.targetPrice.toFixed(4)} {order.toToken}</span>
                        </div>
                      </div>

                      {/* Fill Expected/Actual */}
                      <div className="text-right">
                        <p className="font-headline font-black text-white text-base leading-none whitespace-nowrap">
                          {order.status === 'Executed' 
                            ? `${(parseFloat(order.amountIn) * order.executedRate).toFixed(4)} ${order.toToken}` 
                            : `~${(parseFloat(order.amountIn) * order.targetPrice).toFixed(2)} ${order.toToken}`}
                        </p>
                        {order.status === 'Executed' && (
                          <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-tighter mt-1">Filled @ {order.executedRate.toFixed(4)}</p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="text-right">
                        {order.status === 'Pending' ? (
                          <button 
                            onClick={() => removeTriggerOrder(order.id)}
                            className="text-[10px] font-bold text-red-400/40 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-all uppercase tracking-tighter"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="material-symbols-outlined text-white/10 text-xl">history</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Unified History Section */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-headline font-bold text-primary text-xl">Transaction History</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{transactions.length} total operations recorded</p>
            </div>
          </div>

          <div className="bg-[#1c1c1c] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Table Header */}
            {isConnected && transactions.length > 0 && (
              <div className="grid grid-cols-[40px_1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/5 bg-white/5">
                <div />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Transaction</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 text-right">Amount</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 text-right">Receipt</span>
              </div>
            )}

            {isConnected ? (
              transactions.length > 0 ? (
                <div>
                  {transactions.slice(0, 10).map((tx, i) => {
                    const typeConfig = {
                      'Swap':    { icon: 'swap_horiz',       bg: 'bg-violet-500/10',  text: 'text-violet-400',  badge: 'bg-violet-500/20 text-violet-300 border-violet-500/20' },
                      'Bridge':  { icon: 'merge_type',        bg: 'bg-blue-500/10',    text: 'text-blue-400',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/20' },
                      'Stake':   { icon: 'lock',              bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' },
                      'Unstake': { icon: 'lock_open',         bg: 'bg-orange-500/10',  text: 'text-orange-400',  badge: 'bg-orange-500/20 text-orange-300 border-orange-500/20' },
                      'Faucet':  { icon: 'water_drop',        bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20' },
                      'Claim':   { icon: 'redeem',            bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20' },
                    };
                    const cfg = typeConfig[tx.type] || { icon: 'receipt_long', bg: 'bg-white/5', text: 'text-white/40', badge: 'bg-white/10 text-white/40 border-white/10' };
                    const shortHash = tx.txHash && !tx.txHash.startsWith('simulated_')
                      ? `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}`
                      : null;
                    const dateStr = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const timeStr = new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={tx.id || i} className="grid grid-cols-[40px_1fr_auto_auto] gap-4 items-center px-6 py-4 hover:bg-white/[0.025] transition-colors border-b border-white/[0.04] last:border-0 group">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border border-white/5`}>
                          <span className={`material-symbols-outlined text-[18px] ${cfg.text}`}>{cfg.icon}</span>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${cfg.badge}`}>
                              {tx.type}
                            </span>
                            {tx.source === 'AI Agent' && (
                              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">smart_toy</span> AI
                              </span>
                            )}
                            <span className="font-headline font-bold text-sm text-white/90 truncate">{tx.details || `${tx.type} Transaction`}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/25 font-body">
                            <span>{dateStr}</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-white/20"></span>
                            <span>{timeStr}</span>
                            {shortHash && (
                              <>
                                <span className="w-0.5 h-0.5 rounded-full bg-white/20"></span>
                                <span className="font-mono">{shortHash}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="font-headline font-black text-white text-base leading-none whitespace-nowrap">{tx.amount}</p>
                        </div>

                        {/* Receipt */}
                        <div className="text-right">
                          {tx.txHash?.startsWith('simulated_') ? (
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-tight">Sim</span>
                          ) : (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[10px] font-bold ${cfg.text} opacity-60 hover:opacity-100 transition-opacity flex items-center gap-0.5 justify-end uppercase tracking-tight`}
                            >
                              View <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {transactions.length > 10 && (
                    <div className="px-6 py-4 border-t border-white/5 flex justify-center">
                      <button className="text-[10px] font-bold text-white/30 hover:text-primary uppercase tracking-[0.2em] transition-colors flex items-center gap-2">
                        Show {transactions.length - 10} more
                        <span className="material-symbols-outlined text-xs">expand_more</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-24 text-center flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-white/10 text-4xl">receipt_long</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-white/20 text-sm">No transactions yet</p>
                    <p className="text-[11px] text-white/15 font-body mt-1">Your on-chain activity will appear here</p>
                  </div>
                </div>
              )
            ) : (
              <div className="py-24 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                  <span className="material-symbols-outlined text-white/10 text-4xl">account_balance_wallet</span>
                </div>
                <div>
                  <p className="font-headline font-bold text-white/20 text-sm">Wallet not connected</p>
                  <p className="text-[11px] text-white/15 font-body mt-1">Connect to view your transaction history</p>
                </div>
                <button
                  onClick={connect}
                  className="mt-2 bg-white text-black px-8 py-3 rounded-xl font-bold text-sm hover:bg-white/90 transition-all shadow-2xl"
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
