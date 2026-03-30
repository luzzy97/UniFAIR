import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
// import { bridgeTokens } from '../lib/api';

const CHAINS = [
  { id: '1', name: 'Ethereum', icon: '/eth-icon.png', isImage: true },
  { id: '42161', name: 'Arbitrum', icon: 'layers' },
  { id: '10', name: 'Optimism', icon: 'layers' },
  { id: '137', name: 'Polygon', icon: 'layers' },
];

export default function BridgePage() {
  const { isConnected, address, provider, connect, balances: walletBalances, addTransaction, globalRates, fetchEthBalance } = useWallet();
  const { balance: rloBal, bridgeOut, loading: bridgeLoading, fetchBalance: fetchRloBalance } = useRLO();
  const [fromChain, setFromChain] = useState('1');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const ethPrice = globalRates['ETH']?.['USDC'] || 3500;
  const receiveAmount = amount ? (parseFloat(amount) * ethPrice / 3).toFixed(2) : '0.00';

  const balances = { ...walletBalances, RIALO: parseFloat(rloBal || '0') };

  const fromChainName = CHAINS.find(c => c.id === fromChain)?.name || 'Ethereum';

  const handleBridge = async () => {
    if (!isConnected) { connect(); return; }
    if (!amount || parseFloat(amount) <= 0) {
      setToast({ message: 'Enter an amount greater than 0', type: 'error' });
      return;
    }
    const currentBalance = balances['RIALO'] || 0;
    if (parseFloat(amount) > currentBalance) {
      setToast({ message: 'Insufficient RIALO balance', type: 'error' });
      return;
    }

    setLoading(true);
    setToast({ message: 'Initiating bridge (burning RLO)…', type: 'loading' });
    try {
      const hash = await bridgeOut(amount);
      setToast({
        message: `Bridge initiated! ${amount} RLO burned on Sepolia.`,
        type: 'success',
        txHash: hash,
      });
      
      // Add to history
      addTransaction({
        type: 'Bridge',
        amount: `${amount} RIALO → Rialo Network`,
        details: 'Cross-chain Bridge Out',
        txHash: hash,
        source: 'Direct'
      });
      
      // Update balances from chain
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
      
      setAmount('');

    } catch (err) {
      setToast({ message: err.reason || err.message || 'Bridge failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0c0c0c] font-body text-white antialiased min-h-screen selection:bg-emerald-500/30">
      <Navbar />
      
      <main className="max-w-[1200px] mx-auto px-8 py-20 relative">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -z-10"></div>

        {/* Hero Section */}
        <header className="mb-20 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="material-symbols-outlined text-[10px]">hub</span>
            <span className="font-headline font-bold text-[9px] uppercase tracking-[0.2em]">Cross-Chain Gateway</span>
          </div>
          <h1 className="font-headline text-[4.5rem] font-black leading-[0.9] tracking-tighter mb-8 bg-gradient-to-br from-white via-white to-emerald-500/40 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Unified Liquidity<br/>Bridge
          </h1>
          <p className="font-body text-white/40 max-w-xl text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Seamlessly transit assets between the Rialo L1 and external EVM ecosystems. Our architectural relay ensures maximum security and institutional-grade speed.
          </p>
        </header>

        {/* Bridge Card Container */}
        <div className="flex justify-center relative z-10 animate-in fade-in zoom-in-95 duration-1000">
          <div className="w-full max-w-[520px] bg-[#121212] rounded-[40px] p-10 border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.6)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
            
            {/* From Section */}
            <div className="space-y-4 mb-2">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/20 font-headline">From</span>
                <span className="text-[10px] font-medium text-white/40">Balance: {balances['RIALO']?.toLocaleString() || '0.00'} RLO</span>
              </div>
              <div className="bg-[#161616] rounded-3xl p-6 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all group/input focus-within:border-emerald-500/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover/input:border-white/20 transition-all overflow-hidden shrink-0">
                    {CHAINS.find(c => c.id === fromChain)?.isImage ? (
                      <img src={CHAINS.find(c => c.id === fromChain)?.icon} className="w-full h-full object-contain p-2.5" alt="chain" />
                    ) : (
                      <span className="material-symbols-outlined text-white/40 text-2xl">{CHAINS.find(c => c.id === fromChain)?.icon}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <select
                      value={fromChain}
                      onChange={e => setFromChain(e.target.value)}
                      className="bg-transparent border-none p-0 text-white font-headline font-black text-xl focus:ring-0 cursor-pointer appearance-none outline-none pr-8"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'white\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '1rem' }}
                    >
                      {CHAINS.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#1c1c1c] text-white">{c.name}</option>
                      ))}
                    </select>
                    <span className="text-[9px] text-white/30 tracking-widest font-bold uppercase mt-1">Source Architecture</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <input
                    type="text"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="bg-transparent border-none p-0 text-right text-3xl font-headline font-black text-white focus:ring-0 w-32 placeholder:text-white/5 outline-none"
                  />
                  <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase tracking-widest">RIALO</p>
                </div>
              </div>
            </div>

            {/* Direction Icon */}
            <div className="flex justify-center -my-6 relative z-20">
              <div className="w-14 h-14 bg-[#121212] rounded-2xl border border-white/10 flex items-center justify-center text-white hover:text-emerald-500 hover:border-emerald-500/50 transition-all duration-300 shadow-3xl active:scale-90 animate-bounce-subtle">
                <span className="material-symbols-outlined text-2xl">south</span>
              </div>
            </div>

            {/* To Section */}
            <div className="space-y-4 mt-2 mb-10">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/20 font-headline">To</span>
              </div>
              <div className="bg-[#161616] rounded-3xl p-6 flex items-center justify-between border border-white/5 group/output">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center border border-white/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] overflow-hidden shrink-0">
                    <img src="/rialo-icon-new.png" className="w-full h-full object-contain p-2.5 invert brightness-0" alt="Rialo" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-headline font-black text-xl">Rialo L1</span>
                    <span className="text-[9px] text-emerald-500/60 tracking-widest font-bold uppercase mt-1">Native Chain</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-3xl font-headline font-black text-white/10 tracking-tighter block leading-none">
                    {receiveAmount || '0.00'}
                  </span>
                  <p className="text-[10px] text-white/20 font-bold mt-1 uppercase tracking-widest">RIALO Credits</p>
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="space-y-4 mb-10 px-2 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
              {[
                ['Transfer Rate', `1 RLO ≈ 1.00 RLO`],
                ['Relay Fee', 'Architectural (Gasless)'],
                ['Security Level', 'Multi-Sig Consensus'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-[11px] font-medium tracking-tight">
                  <span className="text-white/30">{label}</span>
                  <span className={value.includes('Gasless') ? 'text-emerald-500' : 'text-white/70'}>{value}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleBridge}
              disabled={loading || (isConnected && amount && parseFloat(amount) > (balances['RIALO'] || 0))}
              className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-headline font-black text-xl tracking-tight hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined animate-spin">autorenew</span> Transiting...
                </span>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : amount && parseFloat(amount) > (balances['RIALO'] || 0) ? (
                'Insufficient RLO Balance'
              ) : (
                'Bridge to Rialo L1'
              )}
            </button>
          </div>
        </div>

        {/* Bento Stats */}
        <div className="max-w-[1200px] w-full mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: 'lock', title: 'Vault Security', desc: 'Assets are secured by institutional-grade smart contracts and multi-sig validation.' },
            { icon: 'speed', title: 'Instant Settlement', desc: 'Cross-chain transfers finalize in under 4 minutes using the Rialo relay network.' },
            { icon: 'hub', title: 'Universal Hub', desc: 'Bridge between all major EVM chains and Layer 2 rollups with unified liquidity.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-[#121212] p-10 rounded-[32px] border border-white/5 hover:border-emerald-500/20 transition-all duration-500 group shadow-xl">
              <span className="material-symbols-outlined text-emerald-500/40 mb-6 block text-3xl group-hover:text-emerald-500 group-hover:scale-110 transition-all">{icon}</span>
              <h3 className="text-xl font-headline font-black text-white mb-4 tracking-tight">{title}</h3>
              <p className="text-sm font-body text-white/30 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
