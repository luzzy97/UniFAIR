import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useStaking } from '../hooks/useStaking';
// import { fetchRewards, claimRewards as mockClaim } from '../lib/api';

const INITIAL_HISTORY = [
  { amount: '+240.15 RIALO', date: 'Nov 24, 2024', status: 'Success' },
  { amount: '+189.40 RIALO', date: 'Oct 31, 2024', status: 'Success' },
  { amount: '+412.57 RIALO', date: 'Sep 30, 2024', status: 'Success' },
];

export default function RewardsPage() {
  const { isConnected, address, provider, connect, updateBalance, transactions, addTransaction, fetchEthBalance } = useWallet();
  const { pendingRewards: pendingRewStr, claimRewards, loading: stakingLoading, stakedBalance: stakedBalStr, fetchStakingData: fetchRloBalance } = useStaking();
  const [rewards, setRewards] = useState({ totalEarned: '0.00', claimable: '0.00', apy: 18.40 });
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeRange, setActiveRange] = useState('30D');

  const loadRewards = useCallback(async () => {
    if (!isConnected || !address) return;
    const claimable = parseFloat(pendingRewStr || '0');
    const staked = parseFloat(stakedBalStr || '0');
    // Total earned = claimable + history (simulated for UI as 25% of staked)
    const totalEarned = claimable + (staked * 0.25); 
    
    setRewards(prev => ({
      ...prev,
      claimable: claimable.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
      totalEarned: totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    }));
  }, [isConnected, address, pendingRewStr]);

  // Fetch rewards on wallet connect + auto-refresh every 30s
  useEffect(() => {
    loadRewards();
    const interval = setInterval(loadRewards, 30000);
    return () => clearInterval(interval);
  }, [loadRewards]);

  const handleClaim = async () => {
    if (!isConnected) { connect(); return; }
    const claimAmount = parseFloat(pendingRewStr || '0');
    if (claimAmount <= 0) {
      setToast({ message: 'No rewards to claim', type: 'error' });
      return;
    }

    setClaiming(true);
    setToast({ message: 'Claiming rewards...', type: 'loading' });
    try {
      const hash = await claimRewards();
      setToast({ message: `Rewards claimed successfully!`, type: 'success', txHash: hash });
      
      // Update balances from chain
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }

      addTransaction({
        type: 'Claim',
        amount: `${claimAmount.toFixed(4)} RIALO`,
        details: 'Ecosystem Rewards',
        txHash: hash,
        source: 'Direct'
      });

    } catch (err) {
      setToast({ message: err.reason || err.message || 'Claim failed', type: 'error' });
    } finally {
      setClaiming(false);
    }
  };


  // Bar chart heights for chart visual
  const barData = {
    '7D': [15, 30, 22, 45, 40, 65, 90],
    '30D': [20, 35, 25, 50, 45, 70, 90],
    'ALL': [5, 12, 20, 35, 50, 72, 90],
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary-container selection:text-white">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-8 py-16">
        {/* Header */}
        <header className="mb-16">
          <h1 className="font-headline text-[3.5rem] font-extrabold text-primary leading-none tracking-tight mb-4">
            Ecosystem Rewards
          </h1>
          <p className="font-body text-on-surface/70 max-w-2xl">
            Precision-engineered value distribution. Track your accumulated earnings from the Rialo Layer 1 architecture and claim your architectural yield.
          </p>
        </header>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Total Earned */}
          <div className="bg-[#0c0c0c] rounded-2xl p-8 flex flex-col justify-between min-h-[260px] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            <div>
              <span className="font-label text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mb-6 block">Total Cumulative Earned</span>
              <h2 className="font-headline text-[3.5rem] font-extrabold text-white leading-none">
                {loading ? <span className="animate-pulse">—</span> : rewards.totalEarned}{' '}
                <span className="text-white/10 text-2xl tracking-tighter block mt-2 font-body font-normal">RIALO</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+12.4% vs last month</span>
            </div>
          </div>

          {/* Claim Card */}
          <div className="bg-white rounded-2xl p-8 flex flex-col justify-between min-h-[260px] text-black shadow-2xl transition-transform hover:scale-[1.02] relative overflow-hidden">
            <div>
              <span className="font-label text-[10px] text-black/40 uppercase tracking-[0.2em] font-bold mb-6 block">Available to Claim</span>
              <h2 className="font-headline text-[3.5rem] font-extrabold leading-none">
                {loading ? <span className="animate-pulse">—</span> : rewards.claimable}{' '}
                <span className="text-black/20 text-2xl tracking-tighter block mt-2 font-body font-normal">RIALO</span>
              </h2>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full bg-black text-white font-headline font-bold py-5 rounded-2xl hover:bg-black/90 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {claiming ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">autorenew</span>
                  Claiming…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                  {isConnected ? 'Claim Rewards' : 'Connect Wallet'}
                </>
              )}
            </button>
          </div>

          {/* APY */}
          <div className="bg-[#0c0c0c] rounded-2xl p-8 flex flex-col justify-between min-h-[260px] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
            <div>
              <span className="font-label text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold mb-6 block">Network Yield (APY)</span>
              <h2 className="font-headline text-[3.5rem] font-extrabold text-white leading-none">
                {loading ? <span className="animate-pulse">—</span> : `${rewards.apy}%`}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shadow-[0_0_12px_rgba(255,255,255,0.4)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Node Status: Active</span>
            </div>
          </div>
        </div>

        {/* Charts + History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Chart */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0c0c0c] rounded-2xl p-8 border border-white/5 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] opacity-30"></div>
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-headline font-bold text-primary text-lg">Earnings Trajectory</h3>
                <div className="flex gap-2">
                  {['7D', '30D', 'ALL'].map(r => (
                    <button
                      key={r}
                      onClick={() => setActiveRange(r)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase transition-colors ${
                        activeRange === r
                          ? 'bg-primary text-black font-extrabold'
                          : 'bg-[#161616] border border-white/5 text-white/40 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative h-[240px] w-full flex items-end gap-2">
                {(barData[activeRange] || barData['30D']).map((h, i) => (
                  <div
                    key={i}
                    className="rounded-t-lg transition-all duration-500 w-full cursor-pointer group relative"
                    style={{ height: `${h}%`, backgroundColor: `rgba(255,255,255,${0.1 + (h / 100) * 0.4})` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {(h * 10).toFixed(1)} RIALO
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-widest">
                <span>Phase 01</span>
                <span>Phase 02</span>
                <span>Phase 03</span>
                <span>Current</span>
              </div>
            </div>
          </div>


          {/* Claim History */}
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline font-bold text-primary text-xl">Claim History</h3>
              <button onClick={loadRewards} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-primary transition-all">
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
            </div>
            <div className="space-y-3">
              {isConnected ? (
                (() => {
                  const claimHistory = transactions.filter(tx => tx.type === 'Claim');
                  const finalHistory = claimHistory.length > 0 
                    ? claimHistory.slice()
                    : INITIAL_HISTORY.map((h, i) => ({
                        type: 'Claim',
                        amount: h.amount,
                        timestamp: new Date(h.date).getTime(),
                        details: 'Historical Reward',
                        status: 'Success',
                        id: `mock-${i}`
                      }));

                  return finalHistory.slice(0, 5).map((tx, i) => {
                    const dateStr = new Date(tx.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const timeStr = new Date(tx.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <div key={tx.id || i} className="bg-[#0c0c0c] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all transition-all shadow-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-white/5">
                            <span className="material-symbols-outlined text-cyan-400 text-[18px]">water_drop</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-cyan-500/20 text-cyan-300 border-cyan-500/20">
                                {tx.type || 'Claim'}
                              </span>
                              <p className="font-headline font-bold text-sm text-white/90">{tx.details || 'Reward Distribution'}</p>
                            </div>
                            <p className="font-body text-[10px] text-white/25">
                              {dateStr} • {timeStr}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-headline font-black text-white text-base leading-none mb-1">{tx.amount}</p>
                          <p className="text-[9px] font-bold text-primary/60 uppercase tracking-tighter">SUCCESSFUL</p>
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="bg-[#0c0c0c] border border-white/5 p-12 rounded-2xl text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-white/10 text-3xl">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-sm text-white/30 font-headline font-bold">Wallet not connected</p>
                    <button onClick={connect} className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-colors underline underline-offset-4">
                      Connect to see history
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
