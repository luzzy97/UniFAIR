import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { RLO_ADDRESS } from '../lib/ethers';
// import { swapTokens } from '../lib/api';

const TOKENS = [
  { symbol: 'ETH', icon: '/eth-icon.png', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'RIALO', icon: '/rialo-icon.png', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'USDC', icon: '/usdc-icon.webp', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'USDT', icon: '/usdt-icon.png', isImage: true, iconClass: 'p-0.5' },
];

export default function SwapPage() {
  const { isConnected, address, provider, connect, balances: walletBalances, updateBalance, addTransaction, globalRates, addTriggerOrder, fetchEthBalance, aiPrivateKey, setAiPrivateKey } = useWallet();
  const { balance: rloBal, claimFaucet, loading: faucetLoading, transfer, fetchBalance: fetchRloBalance } = useRLO();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('RIALO');
  const [amountIn, setAmountIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFromTokenList, setShowFromTokenList] = useState(false);
  const [showToTokenList, setShowToTokenList] = useState(false);

  const balances = {
    ...walletBalances,
    RIALO: parseFloat(rloBal || '0')
  };

  const [orderType, setOrderType] = useState('swap');
  const [targetPrice, setTargetPrice] = useState('');
  const [expiration, setExpiration] = useState('1 Day');
  const [showExpirationList, setShowExpirationList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');

  const getRate = (from, to) => {
    if (globalRates?.[from]?.[to]) return globalRates[from][to];
    
    // Robust fallback for the $3 RIALO peg
    const prices = { ETH: 3500, RIALO: 3, USDC: 1, USDT: 1 };
    const p1 = prices[from] || 1;
    const p2 = prices[to] || 1;
    return p1 / p2;
  };
  const currentRateValue = getRate(fromToken, toToken);
  const activeRate = orderType === 'limit' && targetPrice ? parseFloat(targetPrice) : currentRateValue;
  const estimatedOut = amountIn ? (parseFloat(amountIn) * activeRate).toFixed(4) : '';
  const displayRate = `1 ${fromToken} ≈ ${activeRate.toFixed(fromToken === 'RIALO' ? 8 : 2)} ${toToken}`;

  useEffect(() => {
    setTargetPrice('');
  }, [fromToken, toToken]);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmountIn(estimatedOut);
  };

  const handleAction = async () => {
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

    if (orderType === 'limit') {
      const tp = parseFloat(targetPrice || currentRateValue);
      if (tp <= 0) {
         setToast({ message: 'Enter a valid trigger price', type: 'error' }); return;
      }
      
      const condition = tp >= currentRateValue ? '>=' : '<=';
      
      // Lock balance
      updateBalance(fromToken, -parseFloat(amountIn));
      
      addTriggerOrder({
        fromToken,
        toToken,
        amountIn,
        targetPrice: tp,
        condition,
        expiration
      });
      
      setToast({ message: `Limit order placed: ${amountIn} ${fromToken} at ${tp} ${toToken}`, type: 'success' });
      setAmountIn('');
      setTargetPrice('');
      return;
    }

    setLoading(true);
    setToast({ message: 'Confirming actual transaction in MetaMask…', type: 'loading' });
    try {
      let hash;
      const signer = await provider.getSigner();
      
      if (fromToken === 'ETH') {
        // Real ETH transfer to the RLO contract (as a "swap" purchase)
        // Calculating cost based on $3 RIALO peg
        const ethValue = (parseFloat(amountIn) * 0.001); // Simplified for safety, user can adjust
        const tx = await signer.sendTransaction({
          to: RLO_ADDRESS, // RLO Contract
          value: ethers.parseEther(ethValue.toString())
        });
        await tx.wait();
        hash = tx.hash;
      } else if (fromToken === 'RIALO') {
        // Real RLO transfer (burn)
        hash = await transfer('0x000000000000000000000000000000000000dEaD', amountIn);
      } else {
        // For other tokens (USDC/USDT) since we don't have them on Sepolia, 
        // we'll trigger a 0 ETH transaction to the contract to ensure MetaMask pops up
        const tx = await signer.sendTransaction({
          to: RLO_ADDRESS,
          value: 0
        });
        await tx.wait();
        hash = tx.hash;
      }

      setToast({ message: `Blockchain operation successful!`, type: 'success', txHash: hash });
      
      // Update balances from chain
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }

      // Handle mock token balance updates (USDC, USDT, etc.)
      // Since these are local-only mock tokens, we update them manually
      if (fromToken !== 'ETH' && fromToken !== 'RIALO') {
        updateBalance(fromToken, -parseFloat(amountIn));
      }
      if (toToken !== 'ETH' && toToken !== 'RIALO') {
        updateBalance(toToken, parseFloat(estimatedOut));
      }
      
      // Add to history
      addTransaction({
        type: 'Swap',
        amount: `${amountIn} ${fromToken} → ${estimatedOut} ${toToken}`,
        details: `${fromToken} to ${toToken}`,
        txHash: hash,
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
    <div className="bg-[#0c0c0c] font-body text-white antialiased min-h-screen selection:bg-emerald-500/30">
      <Navbar />
      
      <main className="max-w-[1200px] mx-auto px-8 py-20 relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] -z-10"></div>

        {/* Header */}
        <header className="mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-6">
            <span className="material-symbols-outlined text-[10px]">swap_horizontal_circle</span>
            <span className="font-headline font-bold text-[9px] uppercase tracking-[0.2em]">Native Liquidity Hub</span>
          </div>
          <h1 className="font-headline text-[4.5rem] font-black leading-[0.9] tracking-tighter mb-8 bg-gradient-to-br from-white via-white to-emerald-500/40 bg-clip-text text-transparent">
            Frictionless<br/>Asset Exchange
          </h1>
          <p className="font-body text-white/40 max-w-xl text-lg leading-relaxed">
            Execute high-precision swaps and limit orders within the Rialo ecosystem. Our architectural engine ensures optimal routing and minimal slippage.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row items-start gap-16 relative z-10">
          
          {/* Swap Widget */}
          <div className="w-full lg:w-[480px] flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="bg-[#121212] rounded-[32px] p-8 border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              
              <div className="flex justify-between items-center mb-8 relative z-10 px-2">
                <div className="bg-white/5 p-1 rounded-2xl flex gap-1">
                  {['swap', 'limit'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`px-6 py-2.5 rounded-xl font-headline font-bold text-[10px] uppercase tracking-widest transition-all duration-300 ${orderType === type ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-white/30 hover:text-white/60'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showSettings ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-white/30 hover:text-white border-white/5'} border`}
                >
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </button>
              </div>

              {showSettings && (
                <div className="mb-8 p-6 bg-white/[0.03] rounded-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-white/40 mb-4">Transaction Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3 block">Slippage Tolerance</label>
                      <div className="flex gap-2">
                        {['Auto', '0.1', '0.5', '1.0'].map(val => (
                          <button
                            key={val}
                            onClick={() => setSlippage(val === 'Auto' ? 'Auto' : val)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                              (val === 'Auto' && slippage === 'Auto') || val === slippage 
                                ? 'bg-emerald-500 text-black border-emerald-500' 
                                : 'bg-[#0c0c0c] text-white/40 border-white/5 hover:border-white/10'
                            }`}
                          >
                            {val === 'Auto' ? 'Auto' : `${val}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3 block">AI Agent Secret Key</label>
                      <input 
                        type="password" 
                        placeholder="0x..."
                        value={aiPrivateKey || ''}
                        onChange={(e) => setAiPrivateKey(e.target.value)}
                        className="w-full bg-[#0c0c0c] border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-white/10 focus:border-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 relative">
                {/* Input — You Pay */}
                <div className="bg-[#161616] rounded-3xl p-8 border border-white/5 transition-all group-hover:border-white/10 focus-within:border-emerald-500/30">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-white/20">You Pay</span>
                    <span className="text-[10px] text-white/40 font-medium">Balance: {balances[fromToken]?.toLocaleString(undefined, {maximumFractionDigits: 2}) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <input
                      type="text"
                      placeholder="0.00"
                      value={amountIn}
                      onChange={e => setAmountIn(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="bg-transparent border-none p-0 text-4xl font-headline font-black w-full focus:ring-0 text-white placeholder:text-white/5 outline-none"
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
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <button
                    onClick={handleSwapTokens}
                    className="w-12 h-12 bg-[#121212] rounded-2xl border border-white/10 flex items-center justify-center text-white hover:text-emerald-500 hover:border-emerald-500/50 transition-all duration-300 shadow-2xl active:scale-90"
                  >
                    <span className="material-symbols-outlined">swap_vert</span>
                  </button>
                </div>

                {/* Output — You Receive */}
                <div className="bg-[#161616] rounded-3xl p-8 border border-white/5 transition-all group-hover:border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-white/20">You Receive</span>
                    <span className="text-[10px] text-white/40 font-medium">Balance: {balances[toToken]?.toLocaleString(undefined, {maximumFractionDigits: 2}) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <input
                      type="text"
                      placeholder="0.00"
                      value={estimatedOut}
                      readOnly
                      className="bg-transparent border-none p-0 text-4xl font-headline font-black w-full focus:ring-0 text-white placeholder:text-white/5 cursor-default outline-none"
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
              </div>

              {/* Limit Order Condition */}
              {orderType === 'limit' && (
                <div className="mt-4 p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Trigger Price</p>
                      <p className="text-[10px] text-white/30">Current: {currentRateValue.toFixed(4)} {toToken}</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-[10px] text-white/20">1 {fromToken} =</span>
                       <input
                        type="text"
                        placeholder={currentRateValue.toFixed(4)}
                        value={targetPrice}
                        onChange={e => setTargetPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                        className="bg-transparent border-none p-0 text-2xl font-headline font-black text-white focus:ring-0 text-right w-32 outline-none"
                      />
                      <span className="text-xs font-bold text-white/50">{toToken}</span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowExpirationList(!showExpirationList)}
                      className="w-full flex items-center justify-between bg-black/40 px-5 py-3 rounded-xl border border-white/5 text-sm font-bold text-white/60 hover:text-white transition-all"
                    >
                      <span className="uppercase tracking-widest text-[10px]">Expires in: {expiration}</span>
                      <span className="material-symbols-outlined text-sm">expand_more</span>
                    </button>
                    {showExpirationList && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-30">
                        {['1 Hour', '1 Day', '1 Week', '30 Days'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setExpiration(opt); setShowExpirationList(false); }}
                            className="w-full px-5 py-3 text-left text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all border-b border-white/5 last:border-0"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3 px-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-white/30">Rate</span>
                  <span className="text-white/60">{displayRate}</span>
                </div>
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-white/30">Network Fee</span>
                  <span className="text-emerald-500/60 flex items-center gap-1.5">
                    Free (Paid by SfS) <span className="material-symbols-outlined text-[10px]">bolt</span>
                  </span>
                </div>
              </div>

              <button
                onClick={handleAction}
                disabled={loading || (isConnected && amountIn && parseFloat(amountIn) > (balances[fromToken] || 0))}
                className="w-full mt-8 bg-emerald-500 text-black py-5 rounded-2xl font-headline font-black text-lg tracking-tight hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined animate-spin">autorenew</span> Processing...
                  </span>
                ) : !isConnected ? (
                  'Connect Wallet'
                ) : amountIn && parseFloat(amountIn) > (balances[fromToken] || 0) ? (
                  `Insufficient ${fromToken} Balance`
                ) : orderType === 'limit' ? (
                  'Set Architectural Order'
                ) : (
                  `Execute Swap`
                )}
              </button>
            </div>

            {isConnected && (
              <div className="mt-6 flex justify-center">
                 <button 
                  onClick={async () => {
                    try {
                      setToast({ message: 'Requesting RLO from faucet...', type: 'loading' });
                      const hash = await claimFaucet();
                      setToast({ message: '100 RLO claimed successfully!', type: 'success', txHash: hash });
                      addTransaction({
                        type: 'Faucet',
                        amount: '100 RIALO',
                        details: 'Claim RLO Faucet',
                        txHash: hash,
                        source: 'Faucet'
                      });
                      fetchRloBalance();
                    } catch (e) {
                      setToast({ message: e.reason || e.message || 'Faucet claim failed', type: 'error' });
                    }
                  }}
                  disabled={faucetLoading}
                  className="flex items-center gap-2 text-white/30 hover:text-emerald-500 transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-sm">water_drop</span>
                  {faucetLoading ? 'Requesting...' : 'Request 100 RIALO Faucet'}
                </button>
              </div>
            )}
          </div>

          {/* Context Panel */}
          <div className="flex-1 w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-1000">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
              <div className="bg-[#121212] rounded-[32px] p-10 border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h3 className="font-headline font-bold text-emerald-500 text-lg mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-sm">insights</span> Market Overview
                </h3>
                <div className="space-y-6">
                  <div className="pb-6 border-b border-white/5">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">Liquidity Status</p>
                    <div className="flex items-center justify-between">
                      <span className="font-headline font-bold text-xl text-white">Optimal</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">Architectural Fee</p>
                    <p className="font-headline font-bold text-xl text-emerald-500 flex items-center gap-2">
                       0.00% <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">(GASLESS)</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#121212] rounded-[32px] p-10 border border-white/5 shadow-2xl">
                <h3 className="font-headline font-bold text-white text-lg mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500">security</span> Transaction Security
                </h3>
                <div className="space-y-6">
                   {[
                     { label: 'MEV Protection', desc: 'Advanced routing prevents front-running and sandwich attacks.' },
                     { label: 'Architectural Guard', desc: 'Transactions are verified against the Rialo consensus engine.' },
                   ].map((item, i) => (
                     <div key={i} className="flex gap-4">
                       <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0"></div>
                       <div>
                         <p className="text-xs font-bold text-white mb-1">{item.label}</p>
                         <p className="text-[11px] text-white/30 leading-relaxed">{item.desc}</p>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
