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

function StakeModal({ pool, action, onClose, onConfirm, loading, userBalance, sfsFraction, setSfsFraction }) {
  const [amount, setAmount] = useState('');

  const minStakeValue = parseFloat(pool.minStake.split(' ')[0]) || 0;
  const isAmountTooLow = amount && parseFloat(amount) < minStakeValue;
  const isInsufficientBalance = action === 'Stake' && amount && parseFloat(amount) > userBalance;

  const handleConfirm = () => {
    if (!amount || parseFloat(amount) <= 0 || isAmountTooLow || isInsufficientBalance) return;
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
        <p className="text-sm text-on-surface/60 mb-6 flex justify-between">
          <span>APY: <strong>{pool.apy}</strong> · Min: <strong>{pool.minStake}</strong></span>
          {action === 'Stake' && <span className="text-white/40">Bal: {userBalance.toFixed(2)}</span>}
        </p>
        <div className="mb-6">
          <input
            type="text"
            placeholder="Amount in RLO"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            className={`w-full bg-surface-container-low border ${isAmountTooLow || isInsufficientBalance ? 'border-error' : 'border-outline-variant/20'} rounded-xl px-4 py-3 text-xl font-headline font-bold focus:ring-1 focus:ring-primary focus:border-primary`}
            autoFocus
          />
          {isAmountTooLow && (
            <p className="text-error text-[10px] mt-2 font-bold uppercase tracking-wider">
              Minimum staking amount is {pool.minStake}
            </p>
          )}
          {isInsufficientBalance && (
            <p className="text-error text-[10px] mt-2 font-bold uppercase tracking-wider">
              Insufficient RIALO balance
            </p>
          )}
        </div>

        {action === 'Stake' && (
          <div className="mb-8 p-5 bg-black/5 rounded-2xl border border-black/5 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-black/40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">alt_route</span>
                SfS Routing Fraction (ϕ)
              </span>
              <span className="text-sm font-bold text-black bg-black/5 px-2 py-0.5 rounded">
                {sfsFraction}%
              </span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={sfsFraction} 
              onChange={(e) => setSfsFraction(Number(e.target.value))}
              className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
            />
            
            <div className="flex justify-between text-[9px] text-black/30 mt-3 font-bold uppercase tracking-tighter">
              <span>All to Wallet</span>
              <span>All to Gas Credits</span>
            </div>
            
            <p className="mt-4 text-[10px] text-black/40 leading-relaxed font-medium">
              Routing <span className="text-black font-bold">{sfsFraction}%</span> of yield to <span className="underline decoration-black/20">ServicePaymaster</span> to automate gas costs for all your future transactions.
            </p>
          </div>
        )}
        <button
          onClick={handleConfirm}
          disabled={loading || !amount || parseFloat(amount) <= 0 || isAmountTooLow || isInsufficientBalance}
          className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold text-base hover:bg-primary-container transition-all disabled:opacity-30"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-lg">autorenew</span> Processing…
            </span>
          ) : isInsufficientBalance ? `Insufficient Balance` : `Confirm ${action}`}
        </button>
      </div>
    </div>
  );
}

export default function StakingPage() {
  const { isConnected, address, connect, balances, stakedBalance, updateBalance, updateStakedBalance, addTransaction } = useWallet();
  const [pools, setPools] = useState(DEFAULT_POOLS);
  const [activeTab, setActiveTab] = useState('Active');
  const [modal, setModal] = useState(null); // { pool, action: 'Stake'|'Unstake' }
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // SfS States
  const [sfsFraction, setSfsFraction] = useState(25);
  const [sponsoredPaths, setSponsoredPaths] = useState([
    { address: "0x71C...9A4", amount: 5.00 }
  ]);
  const [sponsorAddress, setSponsorAddress] = useState("");
  const [sponsorAmount, setSponsorAmount] = useState("");
  const [isAddingPath, setIsAddingPath] = useState(false);

  const availableServiceCredits = (stakedBalance * 0.18 * (sfsFraction / 100)) - sponsoredPaths.reduce((sum, p) => sum + p.amount, 0);

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
      // Add to history
      addTransaction({
        type: isStake ? 'Stake' : 'Unstake',
        amount: `${amount} RIALO`,
        details: poolId,
        txHash: res.txHash,
        source: 'Direct'
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || `${modal.action} failed`;
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, connect, modal]);

  const handleAddSponsor = () => {
    if (!sponsorAddress || !sponsorAmount) return;
    setIsAddingPath(true);
    setTimeout(() => {
      setSponsoredPaths(prev => [...prev, { address: sponsorAddress, amount: parseFloat(sponsorAmount) }]);
      setSponsorAddress("");
      setSponsorAmount("");
      setIsAddingPath(false);
      setToast({ message: "Sponsorship path added successfully!", type: 'success' });
    }, 1000);
  };

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
              <div className="flex items-center gap-3">
                 <button
                  onClick={connect}
                  className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 hover:opacity-60 transition-opacity text-black/40 text-left"
                >
                  {isConnected ? 'View Details' : 'Connect Wallet'}
                </button>
                {isConnected && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">activity</span> SfS Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SfS Quick Insights */}
        {isConnected && (
          <div className="bg-[#0c0c0c] rounded-2xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-4 mb-4 md:mb-0">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                  <span className="material-symbols-outlined text-2xl text-black">alt_route</span>
               </div>
               <div>
                  <h4 className="text-white font-bold text-sm tracking-tight mb-0.5 text-left">Available Service Credits</h4>
                  <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest text-left">Real-time Gas Autopay Reserve</p>
               </div>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-3xl font-extrabold text-white tracking-tighter">
                 {Math.max(0, availableServiceCredits).toFixed(2)}
               </span>
               <span className="text-white/20 text-xs font-bold uppercase tracking-widest">Credits</span>
             </div>
          </div>
        )}

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
              className="bg-[#0c0c0c] rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 justify-between border border-white/5 hover:border-white/10 transition-colors"
            >
              {/* Pool Identity */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10 overflow-hidden p-3 transition-transform group-hover:scale-105">
                  <img src="/rialo-icon.png" className="w-full h-full object-contain" alt="Rialo" />
                </div>
                <div>
                  <h3 className="font-headline text-xl font-bold text-white mb-0.5">{pool.name}</h3>
                  <p className="font-body text-white/30 text-xs max-w-sm line-clamp-1">{pool.description}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-10 flex-shrink-0">
                <div>
                  <p className="font-label text-[9px] uppercase tracking-[0.2em] text-white/20 mb-1 font-bold">APY</p>
                  <p className="font-headline text-lg font-bold text-white">{pool.apy}</p>
                </div>
                <div>
                  <p className="font-label text-[9px] uppercase tracking-[0.2em] text-white/20 mb-1 font-bold">Staked</p>
                  <p className="font-headline text-lg font-bold text-white">{pool.totalStaked}</p>
                </div>
                <div className="hidden lg:block">
                  <p className="font-label text-[9px] uppercase tracking-[0.2em] text-white/20 mb-1 font-bold">TVL</p>
                  <p className="font-headline text-lg font-bold text-white">{pool.tvl}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-shrink-0 w-full md:w-auto">
                <button
                  onClick={() => openModal(pool, 'Stake')}
                  disabled={pool.type === 'Legacy'}
                  className="flex-1 md:flex-none px-8 py-3.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-white/90 active:scale-95 transition-all shadow-2xl disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Stake
                </button>
                <button
                  onClick={() => openModal(pool, 'Unstake')}
                  className="flex-1 md:flex-none px-8 py-3.5 bg-transparent border border-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/5 transition-all active:scale-95"
                >
                  Unstake
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* SfS Router: Sponsorship Section (New) */}
        <div className="mt-24 pt-12 border-t border-white/5">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
             <div className="max-w-xl">
               <h2 className="font-headline text-4xl font-extrabold tracking-tight text-white mb-4 flex items-center gap-4">
                 <span className="material-symbols-outlined text-4xl text-white">alt_route</span>
                 SfS Router: Sponsorship
               </h2>
               <p className="text-white/40 text-lg leading-relaxed font-medium">
                 Direct your generated Service Credits to external addresses. Automate gas sponsorship for your secondary wallets, contracts, or community members.
               </p>
             </div>
             <div className="bg-[#0c0c0c] border border-white/10 p-2 rounded-2xl flex items-center gap-4 pr-6 shadow-2xl">
                <div className="bg-white p-3 rounded-xl shadow-inner">
                   <span className="material-symbols-outlined text-2xl text-black">info</span>
                </div>
                <div>
                   <p className="text-white/20 text-[9px] uppercase font-bold tracking-[0.2em]">Current Allocation</p>
                   <p className="text-white font-bold">{sponsoredPaths.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} / { (stakedBalance * 0.18 * (sfsFraction / 100)).toFixed(2) }</p>
                </div>
             </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
             {/* Left: Configuration Form */}
             <div className="lg:col-span-5 bg-[#0c0c0c] rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
               <h3 className="text-white font-bold text-xl mb-8 flex items-center gap-3">
                 <span className="material-symbols-outlined text-xl">add</span> Create Path
               </h3>
               
               <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 mb-3 ml-1">Destination Address</label>
                   <input 
                    type="text" 
                    value={sponsorAddress}
                    onChange={(e) => setSponsorAddress(e.target.value)}
                    placeholder="0x... or ENS"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:ring-1 focus:ring-white/30 outline-none transition-all font-mono"
                   />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 mb-3 ml-1">Credits to Allocate</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        value={sponsorAmount}
                        onChange={(e) => setSponsorAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:ring-1 focus:ring-white/30 outline-none transition-all font-bold text-xl"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-bold uppercase tracking-widest text-[10px]">Credits/yr</span>
                   </div>
                 </div>
                 <button 
                  onClick={handleAddSponsor}
                  disabled={!isConnected || isAddingPath}
                  className="w-full bg-white text-black py-5 rounded-2xl font-bold text-base hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-20 flex items-center justify-center gap-3"
                 >
                   {isAddingPath ? <span className="material-symbols-outlined animate-spin">autorenew</span> : <span className="material-symbols-outlined">add_circle</span>}
                   {isAddingPath ? "Configuring Path..." : "Add to Router Path"}
                 </button>
               </div>
             </div>

             {/* Right: Active Paths */}
             <div className="lg:col-span-7 flex flex-col">
                <div className="flex items-center justify-between mb-8 px-2">
                   <h3 className="text-white font-bold text-xl flex items-center gap-3">
                     <span className="material-symbols-outlined text-xl text-emerald-500">activity</span> Active Sponsored Paths
                   </h3>
                   <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">{sponsoredPaths.length} Active</span>
                </div>
                
                <div className="flex flex-col gap-4">
                  {sponsoredPaths.map((path, idx) => (
                    <div key={idx} className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-white/10 transition-colors group">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                             <span className="material-symbols-outlined text-xl text-white/40">alt_route</span>
                          </div>
                          <div>
                             <p className="text-white font-mono font-bold tracking-tight">{path.address}</p>
                             <p className="text-white/20 text-[9px] uppercase font-bold tracking-widest">Router Path ID: #STK-{idx+1024}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-6 w-full sm:w-auto self-stretch sm:self-auto justify-between">
                          <div className="text-right">
                             <p className="text-white font-bold text-lg leading-none">{path.amount.toFixed(2)}</p>
                             <p className="text-white/20 text-[9px] uppercase font-bold tracking-widest mt-1">Credits/yr</p>
                          </div>
                          <button className="text-white/20 hover:text-white/60 transition-colors p-2">
                             <span className="material-symbols-outlined text-xl">settings</span>
                          </button>
                       </div>
                    </div>
                  ))}
                  {sponsoredPaths.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                       <p className="text-white/20 font-bold uppercase tracking-widest text-[11px]">No active sponsorship paths found</p>
                    </div>
                  )}
                </div>
             </div>
           </div>
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
          userBalance={balances['RIALO'] || 0}
          sfsFraction={sfsFraction}
          setSfsFraction={setSfsFraction}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
