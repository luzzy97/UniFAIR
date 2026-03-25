import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { swapTokens } from '../lib/api';

const TOKENS = [
  { symbol: 'ETH', icon: '/eth-icon.png', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'RIALO', icon: '/rialo-icon.png', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'USDC', icon: '/usdc-icon.webp', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'USDT', icon: '/usdt-icon.png', isImage: true, iconClass: 'p-0.5' },
];

export default function SwapPage() {
  const { isConnected, address, connect, balances, updateBalance, addTransaction } = useWallet();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('RIALO');
  const [amountIn, setAmountIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFromTokenList, setShowFromTokenList] = useState(false);
  const [showToTokenList, setShowToTokenList] = useState(false);

  const RATES = {
    'ETH': { 'RIALO': 2400, 'USDC': 2400, 'USDT': 2400 },
    'RIALO': { 'ETH': 1/2400, 'USDC': 1, 'USDT': 1 },
    'USDC': { 'ETH': 1/2400, 'RIALO': 1, 'USDT': 1 },
    'USDT': { 'ETH': 1/2400, 'RIALO': 1, 'USDC': 1 },
  };

  const getRate = (from, to) => RATES[from]?.[to] ?? 1;
  const estimatedOut = amountIn ? (parseFloat(amountIn) * getRate(fromToken, toToken)).toFixed(4) : '';
  const displayRate = `1 ${fromToken} ≈ ${getRate(fromToken, toToken).toFixed(fromToken === 'RIALO' ? 8 : 2)} ${toToken}`;

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmountIn(estimatedOut);
  };

  const handleSwap = async () => {
    if (!isConnected) { connect(); return; }
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setToast({ message: 'Enter an amount greater than 0', type: 'error' });
      return;
    }
    const currentBalance = balances[fromToken] || 0;
    if (parseFloat(amountIn) > currentBalance) {
      setToast({ message: `Insufficient ${fromToken} balance`, type: 'error' });
      return;
    }
    setLoading(true);
    setToast({ message: 'Submitting swap…', type: 'loading' });
    try {
      const res = await swapTokens({ amount: amountIn, fromToken, toToken, userAddress: address });
      setToast({ message: `Swap successful! ${amountIn} ${fromToken} → ${toToken}`, type: 'success', txHash: res.txHash });
      
      // Update balances
      updateBalance(fromToken, -parseFloat(amountIn));
      const rate = getRate(fromToken, toToken);
      updateBalance(toToken, parseFloat(amountIn) * rate);
      
      // Add to history
      addTransaction({
        type: 'Swap',
        amount: `${amountIn} ${fromToken} → ${estimatedOut} ${toToken}`,
        details: `${fromToken} to ${toToken}`,
        txHash: res.txHash,
        source: 'Direct'
      });
      
      setAmountIn('');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Swap failed';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const TokenSelector = ({ value, onChange, show, setShow, excludeToken }) => (
    <div className="relative">
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-sm hover:bg-surface-container-high transition-colors"
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${TOKENS.find(t => t.symbol === value)?.iconClass}`}>
          {TOKENS.find(t => t.symbol === value)?.isImage ? (
            <img src={TOKENS.find(t => t.symbol === value)?.icon} className="w-full h-full object-contain" alt={value} />
          ) : (
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {TOKENS.find(t => t.symbol === value)?.icon}
            </span>
          )}
        </div>
        <span className="font-headline font-bold text-sm">{value}</span>
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </button>
      {show && (
        <div className="absolute right-0 top-full mt-2 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 z-20 min-w-[140px]">
          {TOKENS.filter(t => t.symbol !== excludeToken).map(t => (
            <button
              key={t.symbol}
              onClick={() => { onChange(t.symbol); setShow(false); }}
              className="flex items-center gap-2 w-full px-4 py-3 hover:bg-surface-container-low transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${t.iconClass}`}>
                {t.isImage ? (
                  <img src={t.icon} className="w-full h-full object-contain" alt={t.symbol} />
                ) : (
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                )}
              </div>
              <span className="font-headline font-bold text-sm">{t.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      <Navbar />
      <main className="min-h-[calc(100vh-250px)] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-[480px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-headline font-extrabold tracking-tighter text-primary mb-2" style={{ fontSize: '3.5rem' }}>Swap.</h1>
            <p className="font-body text-on-surface/50">Precise liquidity for the architectural void.</p>
          </div>

          {/* Swap Card */}
          <div className="bg-[#0c0c0c] rounded-2xl shadow-2xl p-8 relative overflow-hidden border border-white/5">
            {/* Top Actions */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-headline font-bold text-sm tracking-tight">Select Pair</span>
              <button className="text-on-surface/40 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>

            {/* Input — You Pay */}
            <div className="bg-[#161616] rounded-2xl p-6 mb-2 transition-all border border-white/5 focus-within:border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="font-label text-xs uppercase tracking-widest text-white/30 font-bold">You pay</span>
                <span className="font-label text-xs text-white/40">Balance: {balances[fromToken]?.toFixed(2) || '0.00'} {fromToken}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <input
                  type="text"
                  placeholder="0"
                  value={amountIn}
                  onChange={e => setAmountIn(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="bg-transparent border-none p-0 text-4xl font-headline font-extrabold w-full focus:ring-0 text-white placeholder:text-white/10"
                />
                <TokenSelector
                  value={fromToken}
                  onChange={setFromToken}
                  show={showFromTokenList}
                  setShow={setShowFromTokenList}
                  excludeToken={toToken}
                />
              </div>
            </div>

            {/* Swap Divider */}
            <div className="flex justify-center -my-6 relative z-10">
              <button
                onClick={handleSwapTokens}
                className="bg-[#0c0c0c] p-3 rounded-2xl shadow-xl border border-white/10 hover:scale-110 transition-transform"
              >
                <span className="material-symbols-outlined text-white">arrow_downward</span>
              </button>
            </div>

            {/* Output — You Receive */}
            <div className="bg-[#161616] rounded-2xl p-6 mb-8 transition-all border border-white/5 focus-within:border-white/20">
              <div className="flex justify-between items-center mb-4">
                <span className="font-label text-xs uppercase tracking-widest text-white/30 font-bold">You receive</span>
                <span className="font-label text-xs text-white/40">Balance: {balances[toToken]?.toFixed(2) || '0.00'} {toToken}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <input
                  type="text"
                  placeholder="0"
                  value={estimatedOut}
                  readOnly
                  className="bg-transparent border-none p-0 text-4xl font-headline font-extrabold w-full focus:ring-0 text-white placeholder:text-white/10 cursor-default"
                />
                <TokenSelector
                  value={toToken}
                  onChange={setToToken}
                  show={showToTokenList}
                  setShow={setShowToTokenList}
                  excludeToken={fromToken}
                />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 mb-8 px-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/30 font-body">Exchange Rate</span>
                <span className="font-headline font-bold text-white/80">{displayRate}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/30 font-body">Price Impact</span>
                <span className="font-headline font-bold text-white/80">&lt; 0.01%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/30 font-body">Max Slippage</span>
                <span className="font-headline font-bold text-white/80">0.5%</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleSwap}
              disabled={loading || (isConnected && amountIn && parseFloat(amountIn) > (balances[fromToken] || 0))}
              className="w-full bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> Processing…
                </span>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : amountIn && parseFloat(amountIn) > (balances[fromToken] || 0) ? (
                `Insufficient ${fromToken} Balance`
              ) : (
                `Swap ${fromToken} → ${toToken}`
              )}
            </button>
          </div>

          {/* Contextual Info */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/10">
              <p className="font-label text-xs uppercase text-on-surface/40 mb-1">Network Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="font-headline font-bold text-sm">Mainnet Node Active</span>
              </div>
            </div>
            <div className="bg-surface-container-low/50 p-4 rounded-xl border border-outline-variant/10">
              <p className="font-label text-xs uppercase text-on-surface/40 mb-1">Gas Estimation</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-on-surface/40">local_gas_station</span>
                <span className="font-headline font-bold text-sm">$4.12 USD</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
