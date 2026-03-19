import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { stakeTokens, unstakeTokens, fetchPools } from '../lib/api';

const DEFAULT_POOLS = [
  { id: 'rlo-eth', name: 'RLO/ETH', description: 'Stake Rialo paired with Ethereum liquidity', apy: '18.4%', totalStaked: '850M RLO', tvl: '$942M', minStake: '100 RLO', type: 'Active' },
  { id: 'rlo-usdc', name: 'RLO/USDC', description: 'Stable liquidity provision for USDC pairs', apy: '12.1%', totalStaked: '120M RLO', tvl: '$133M', minStake: '50 RLO', type: 'Active' },
  { id: 'rlo-single', name: 'RLO Single Stake', description: 'Pure RLO staking for protocol governance', apy: '8.7%', totalStaked: '450M RLO', tvl: '$499M', minStake: '10 RLO', type: 'Active' },
];

const LEGACY_POOLS = [
  { id: 'rlo-v1', name: 'RLO V1 Legacy', description: 'Original staking pool for V1 adopters. Withdrawals only.', apy: '4.2%', totalStaked: '45M RLO', tvl: '$49M', minStake: '0 RLO', type: 'Legacy' },
];

function StakeModal({ pool, action, onClose, onConfirm, loading }) {
  const [amount, setAmount] = useState('');

  const minStakeValue = parseFloat(pool.minStake.split(' ')[0]) || 0;
  const isAmountTooLow = amount && parseFloat(amount) < minStakeValue;

  const handleConfirm = () => {
    if (!amount || parseFloat(amount) <= 0 || isAmountTooLow) return;
    onConfirm(amount, pool.id);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl p-8 w-full max-w-sm mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline text-xl font-bold">{action} {pool.name}</h3>
          <button onClick={onClose} className="text-on-surface/40 hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-sm text-on-surface/60 mb-6">APY: <strong>{pool.apy}</strong> · Min: <strong>{pool.minStake}</strong></p>
        <div className="mb-6">
          <input
            type="text"
            placeholder="Amount in RLO"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className={`w-full bg-surface-container-low border ${isAmountTooLow ? 'border-error' : 'border-outline-variant/20'} rounded-xl px-4 py-3 text-xl font-headline font-bold focus:ring-1 focus:ring-primary focus:border-primary`}
            autoFocus
          />
          {isAmountTooLow && (
            <p className="text-error text-[10px] mt-2 font-bold uppercase tracking-wider">
              Minimum staking amount is {pool.minStake}
            </p>
          )}
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading || !amount || parseFloat(amount) <= 0 || isAmountTooLow}
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-base hover:bg-primary-container transition-all disabled:opacity-30"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-lg">autorenew</span> Processing…
            </span>
          ) : `Confirm ${action}`}
        </button>
      </div>
    </div>
  );
}

export default function StakingPage() {
  const { isConnected, address, connect, balances, stakedBalance, updateBalance, updateStakedBalance } = useWallet();
  const [pools, setPools] = useState(DEFAULT_POOLS);
  const [activeTab, setActiveTab] = useState('Active');
  const [modal, setModal] = useState(null); // { pool, action: 'Stake'|'Unstake' }
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load pool data
  useEffect(() => {
    fetchPools()
      .then(data => { 
        if (data.pools) {
          const augmented = data.pools.map(p => ({ ...p, type: 'Active' }));
          setPools([...augmented, ...LEGACY_POOLS]); 
        } 
      })
      .catch(() => {
        setPools([...DEFAULT_POOLS, ...LEGACY_POOLS]);
      });
  }, []);

  const displayedPools = pools.filter(p => p.type === activeTab);

  const handleStakeAction = useCallback(async (amount, poolId) => {
    if (!isConnected) { connect(); return; }
    setLoading(true);
    const isStake = modal.action === 'Stake';
    setToast({ message: `${isStake ? 'Staking' : 'Unstaking'} ${amount} RLO…`, type: 'loading' });
    try {
      const fn = isStake ? stakeTokens : unstakeTokens;
      const res = await fn({ amount, pool: poolId, userAddress: address });
      const msg = isStake
        ? `Successfully staked ${amount} RLO in ${poolId}`
        : `Successfully unstaked ${amount} RLO from ${poolId}`;
      setToast({ message: msg, type: 'success', txHash: res.txHash });
      setModal(null);
      // Auto-refresh balances (simulated)
      updateBalance('RIALO', isStake ? -parseFloat(amount) : parseFloat(amount));
      updateStakedBalance(isStake ? parseFloat(amount) : -parseFloat(amount));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || `${modal.action} failed`;
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, connect, modal]);

  const openModal = (pool, action) => {
    if (!isConnected) { connect(); return; }
    setModal({ pool, action });
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      <Navbar />
      <main className="mt-20 max-w-[1200px] mx-auto px-8 pb-12">
        {/* Hero Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {/* Total Value Staked */}
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col justify-between min-h-[160px] transition-transform hover:scale-[1.02] border border-black/5">
            <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold">Total Valued Staked</h3>
            <p className="font-headline text-4xl lg:text-5xl font-extrabold text-black tracking-tighter">$1.24B</p>
          </div>
          {/* Network APY */}
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col justify-between min-h-[160px] transition-transform hover:scale-[1.02] border border-black/5">
            <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold">Network APY</h3>
            <p className="font-headline text-4xl lg:text-5xl font-extrabold text-black tracking-tighter">18.4%</p>
          </div>
          {/* Personal Staked */}
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col justify-between min-h-[160px] transition-transform hover:scale-[1.02] border border-black/5">
            <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-black/40 font-bold">Personal Staked</h3>
            <div className="flex flex-col gap-1">
              <p className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tighter text-black">
                {isConnected ? `${stakedBalance.toFixed(2)} RLO` : '0.00 RLO'}
              </p>
              <button
                onClick={connect}
                className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-60 transition-opacity text-black/40 text-left"
              >
                {isConnected ? 'View Details' : 'Connect Wallet to View'}
              </button>
            </div>
          </div>
        </div>

        {/* Pool Filter Tabs */}
        <div className="flex justify-between items-center mb-12">
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-white">Staking Pools</h2>
          <div className="flex gap-2 bg-[#0c0c0c] p-1.5 rounded-2xl border border-white/5">
            {['Active', 'Legacy'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2.5 rounded-xl font-label text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-black shadow-2xl'
                    : 'text-white/20 hover:text-white/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Staking Pool Cards */}
        <div className="space-y-6">
          {displayedPools.map(pool => (
            <div
              key={pool.id}
              className="bg-[#0c0c0c] rounded-2xl p-10 shadow-2xl flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 justify-between border border-white/5 hover:border-white/10 transition-colors"
            >
              {/* Pool Identity */}
              <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden p-4">
                  <img src="/rialo-icon.png" className="w-full h-full object-contain" alt="Rialo" />
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-bold text-white mb-1">{pool.name}</h3>
                  <p className="font-body text-white/30 text-sm max-w-sm">{pool.description}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-12 flex-shrink-0">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/20 mb-2 font-bold">APY</p>
                  <p className="font-headline text-2xl font-bold text-white">{pool.apy}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/20 mb-2 font-bold">Staked</p>
                  <p className="font-headline text-2xl font-bold text-white">{pool.totalStaked}</p>
                </div>
                <div className="hidden lg:block">
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/20 mb-2 font-bold">TVL</p>
                  <p className="font-headline text-2xl font-bold text-white">{pool.tvl}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 flex-shrink-0 w-full md:w-auto">
                <button
                  onClick={() => openModal(pool, 'Stake')}
                  disabled={pool.type === 'Legacy'}
                  className="flex-1 md:flex-none px-10 py-5 bg-white text-black rounded-2xl font-bold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-2xl disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Stake
                </button>
                <button
                  onClick={() => openModal(pool, 'Unstake')}
                  className="flex-1 md:flex-none px-10 py-5 bg-transparent border border-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/5 transition-all active:scale-95"
                >
                  Unstake
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />

      {/* Stake/Unstake Modal */}
      {modal && (
        <StakeModal
          pool={modal.pool}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleStakeAction}
          loading={loading}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
