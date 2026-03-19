import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { bridgeTokens } from '../lib/api';

const CHAINS = [
  { id: '1', name: 'Ethereum', icon: '/eth-icon.png', isImage: true },
  { id: '42161', name: 'Arbitrum', icon: 'layers' },
  { id: '10', name: 'Optimism', icon: 'layers' },
  { id: '137', name: 'Polygon', icon: 'layers' },
];

export default function BridgePage() {
  const { isConnected, address, connect, balances, updateBalance } = useWallet();
   const [fromChain, setFromChain] = useState('1');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fromChainName = CHAINS.find(c => c.id === fromChain)?.name || 'Ethereum';

  const handleBridge = async () => {
    if (!isConnected) { connect(); return; }
    if (!amount || parseFloat(amount) <= 0) {
      setToast({ message: 'Enter an amount greater than 0', type: 'error' });
      return;
    }
    const currentBalance = balances['ETH'] || 0;
    if (parseFloat(amount) > currentBalance) {
      setToast({ message: 'Insufficient ETH balance', type: 'error' });
      return;
    }
    setLoading(true);
    setToast({ message: 'Initiating bridge…', type: 'loading' });
    try {
      const res = await bridgeTokens({ amount, fromChain: fromChainName, toChain: 'Rialo', userAddress: address });
      setToast({
        message: `Bridge initiated! ${amount} tokens from ${fromChainName} → Rialo`,
        type: 'success',
        txHash: res.txHash,
      });
      // Update balance (simulated)
      updateBalance('ETH', -parseFloat(amount));
      updateBalance('RIALO', parseFloat(amount));
      setAmount('');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Bridge failed';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased selection:bg-primary selection:text-on-primary font-body">
      <Navbar />
      <main className="min-h-[819px] flex flex-col items-center justify-center px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tighter text-primary mb-4 font-headline">Bridge Assets</h1>
          <p className="text-on-surface/60 max-w-md mx-auto">Transfer your liquidity across the void. Real-time cross-chain settlement on Rialo.</p>
        </div>

        {/* Bridge Card */}
        <div className="w-full max-w-[520px] bg-[#0c0c0c] rounded-2xl p-10 shadow-2xl border border-white/5">
          {/* From */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">From</span>
              <span className="text-xs font-medium text-white/20">Balance: {balances['ETH']?.toFixed(2) || '0.00'} ETH</span>
            </div>
            <div className="bg-[#161616] rounded-2xl p-6 flex items-center justify-between border border-white/5 focus-within:border-white/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
                  {CHAINS.find(c => c.id === fromChain)?.isImage ? (
                    <img src={CHAINS.find(c => c.id === fromChain)?.icon} className="w-full h-full object-contain p-2" alt="chain" />
                  ) : (
                    <span className="material-symbols-outlined text-white">
                      {CHAINS.find(c => c.id === fromChain)?.icon}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <select
                    value={fromChain}
                    onChange={e => setFromChain(e.target.value)}
                    className="bg-transparent border-none p-0 text-white font-bold text-xl focus:ring-0 cursor-pointer appearance-none"
                  >
                    {CHAINS.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0c0c0c] text-white">{c.name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-white/20 tracking-wider font-bold uppercase mt-1">Source Chain</span>
                </div>
              </div>
              <div className="text-right">
                <input
                  type="text"
                  placeholder="0.0"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="bg-transparent border-none p-0 text-right text-3xl font-headline font-bold text-white focus:ring-0 w-32 placeholder:text-white/5"
                />
              </div>
            </div>
          </div>

          {/* Direction Icon */}
          <div className="flex justify-center -my-8 relative z-10">
            <div className="bg-[#0c0c0c] border-8 border-[#0c0c0c] rounded-full p-2 shadow-2xl">
              <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center text-black">
                <span className="material-symbols-outlined">south</span>
              </div>
            </div>
          </div>

          {/* To */}
          <div className="space-y-4 mt-6 mb-10">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">To</span>
              <span className="text-xs font-medium text-white/20">Balance: {balances['RIALO']?.toFixed(2) || '0.00'} RIALO</span>
            </div>
            <div className="bg-[#161616] rounded-2xl p-6 flex items-center justify-between border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-2">
                  <img src="/rialo-icon.png" className="w-full h-full object-contain" alt="Rialo" />
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xl">Rialo</span>
                  <span className="text-[10px] text-white/20 tracking-wider font-bold uppercase mt-1">Destination Chain</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-headline font-bold text-white/10">
                  {amount || '0.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="space-y-4 mb-10">
            {[
              ['Exchange Rate', '1 ETH ≈ 1 RIALO'],
              ['Network Fee', '$12.40'],
              ['Estimated Arrival', '~4 minutes'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-white/20">{label}</span>
                <span className="text-white/80 font-bold">{value}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleBridge}
            disabled={loading || (isConnected && amount && parseFloat(amount) > (balances['ETH'] || 0))}
            className="w-full bg-white text-black py-5 rounded-2xl font-bold text-lg hover:bg-white/90 transition-all scale-[0.98] active:scale-95 shadow-2xl disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> Bridging…
              </span>
            ) : !isConnected ? (
              'Connect Wallet'
            ) : amount && parseFloat(amount) > (balances['ETH'] || 0) ? (
              'Insufficient ETH Balance'
            ) : (
              'Bridge to Rialo'
            )}
          </button>
        </div>

        {/* Bento Stats */}
        <div className="max-w-[1200px] w-full mt-32 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: 'security', title: 'Vault Security', desc: 'Assets are secured by institutional-grade smart contracts and multi-sig validation.' },
            { icon: 'bolt', title: 'Instant Settlement', desc: 'Cross-chain transfers finalize in under 4 minutes using the Rialo relay network.' },
            { icon: 'hub', title: '12 Networks Supported', desc: 'Bridge between all major EVM chains and Layer 2 rollups with unified liquidity.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/5">
              <span className="material-symbols-outlined text-primary/40 mb-4 block">{icon}</span>
              <h3 className="text-lg font-bold text-primary mb-2">{title}</h3>
              <p className="text-sm text-on-surface/60">{desc}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
