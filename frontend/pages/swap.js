import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import { RLO_ADDRESS } from '../lib/ethers';
// import { swapTokens } from '../lib/api';

const TOKENS = [
  { symbol: 'ETH', icon: '/eth-icon.png', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'RIALO', icon: '/rialo-icon.png', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'USDC', icon: '/usdc-icon.webp', isImage: true, iconClass: 'p-0.5' },
  { symbol: 'USDT', icon: '/usdt-icon.png', isImage: true, iconClass: 'p-0.5' },
];

export default function SwapPage() {
  const { isConnected, address, provider, connect, balances: walletBalances, updateBalance, updateBalances, addTransaction, globalRates, addTriggerOrder, fetchEthBalance, sessionActive, activateSession, deactivateSession } = useWallet();
  const { balance: rloBal, claimFaucet, loading: faucetLoading, transfer, fetchBalance: fetchRloBalance } = useRLO();
  const { tickingCredits, deductCredits } = useStaking();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('RIALO');
  const [amountIn, setAmountIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFromTokenList, setShowFromTokenList] = useState(false);
  const [showToTokenList, setShowToTokenList] = useState(false);
  const [useCreditsForGas, setUseCreditsForGas] = useState(false);
  const SWAP_GAS_CREDIT_COST = 0.05; // credits per swap

  const balances = {
    ...walletBalances
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
      
      addTransaction({
        type: 'Limit',
        amount: `${amountIn} ${fromToken} → ${toToken}`,
        details: `Limit Order Placed @ ${tp}`,
        source: 'Direct'
      });
      
      setToast({ message: `Limit order placed: ${amountIn} ${fromToken} at ${tp} ${toToken}`, type: 'success' });
      setAmountIn('');
      setTargetPrice('');
      return;
    }

    setLoading(true);
    setToast({ message: 'Confirming actual transaction in MetaMask…', type: 'loading' });
    
    // Check credits for gas before proceeding
    if (useCreditsForGas) {
      if ((tickingCredits || 0) < SWAP_GAS_CREDIT_COST) {
        setToast({ message: `Insufficient credits. Need ${SWAP_GAS_CREDIT_COST} credits for gas. Falling back to normal gas.`, type: 'error' });
        setLoading(false);
        return;
      }
    }

    try {
      let hash;
      const signer = await provider.getSigner();
      
      if (fromToken === 'ETH') {
        // Real ETH transfer to a dead address to avoid contract reverts
        // Send the actual amount for better simulation
        const tx = await signer.sendTransaction({
          to: '0x000000000000000000000000000000000000dEaD',
          value: ethers.parseEther(amountIn.toString())
        });
        await tx.wait();
        hash = tx.hash;
      } else if (fromToken === 'RIALO') {
        // Real RLO transfer (burn)
        hash = await transfer('0x000000000000000000000000000000000000dEaD', amountIn);
      } else {
        // For other tokens (USDC/USDT) since we don't have them on Sepolia, 
        // we'll trigger a 0 ETH transaction to the user's address to ensure MetaMask pops up without reverting
        const tx = await signer.sendTransaction({
          to: address,
          value: 0
        });
        await tx.wait();
        hash = tx.hash;
      }

      setToast({ message: `Blockchain operation successful!`, type: 'success', txHash: hash });
      
      // Deduct credits for gas if enabled
      if (useCreditsForGas && deductCredits) {
        await deductCredits(SWAP_GAS_CREDIT_COST);
        setToast({ message: `Swap successful! Gas paid with ${SWAP_GAS_CREDIT_COST} credits.`, type: 'success', txHash: hash });
      }
      
      // Update balances from chain
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }

      // Handle mock token balance updates (USDC, USDT, etc.)
      const outVal = parseFloat(estimatedOut);
      const inVal = parseFloat(amountIn);

      // Update balances atomically for instant feedback
      updateBalances({
        [fromToken]: -inVal,
        [toToken]: outVal
      });
      
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
      const msg = err.message || "";
      if (msg.includes('user rejected') || msg.includes('4001')) {
        setToast({ message: "Transaction rejected in MetaMask.", type: "error" });
      } else {
        setToast({ message: `Swap failed. ${msg.slice(0, 60)}${msg.length > 60 ? '...' : ''}`, type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

const TokenSelector = ({ value, onChange, show, setShow, excludeToken, walletBalances }) => (
  <div className="relative">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setShow(!show);
      }}
      className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full shadow-sm hover:bg-white/10 active:scale-[0.98] transition-[background-color,transform,border-color,box-shadow] duration-200 border border-white/10"
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
      <span className="font-headline font-bold text-sm text-white tracking-tight" style={{ textShadow: 'none' }}>{value}</span>
      <span className="material-symbols-outlined text-sm text-white/60">expand_more</span>
    </button>
    {show && (
      <div className="absolute right-0 top-full mt-2 bg-[#161616] rounded-xl shadow-2xl border border-white/10 z-[100] min-w-[140px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
        {TOKENS.filter(t => t.symbol !== excludeToken).map(t => (
          <button
            key={t.symbol}
            onClick={() => { onChange(t.symbol); setShow(false); }}
            className="flex items-center gap-2 w-full px-4 py-3 hover:bg-white/5 transition-colors text-white group"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden ${t.iconClass} transition-transform group-hover:scale-110`}>
              {t.isImage ? (
                <img src={t.icon} className="w-full h-full object-contain" alt={t.symbol} />
              ) : (
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
              )}
            </div>
            <span className="font-headline font-bold text-sm text-white group-hover:text-primary transition-colors" style={{ textShadow: 'none' }}>{t.symbol}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

export default function SwapPage() {
    <div className="bg-white font-body text-zinc-900 antialiased selection:bg-primary-container selection:text-zinc-900">
      <Navbar />
      <main className="min-h-[calc(100vh-250px)] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-[480px]">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-black mb-2" style={{ fontSize: '3.5rem' }}>Swap</h1>
            <p className="font-body text-zinc-500 mb-6">Seamless trading across the unified ecosystem</p>
            
            {isConnected && (
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
                className="inline-flex items-center gap-2 bg-black/5 text-black border border-black/10 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-black/10 transition-all"
              >
                <span className="material-symbols-outlined text-sm">water_drop</span>
                {faucetLoading ? 'Claiming...' : 'Claim 100 RLO Faucet'}
              </button>
            )}
          </div>

          {/* Swap Card */}
          <div className="bg-[#0c0c0c] rounded-2xl shadow-2xl p-8 relative overflow-hidden border border-white/5">
            {/* Top Actions */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-1 bg-[#161616] p-1 rounded-full border border-white/5">
                <button 
                  onClick={() => setOrderType('swap')}
                  className={`font-headline font-bold text-sm tracking-tight transition-all px-4 py-1.5 rounded-full ${orderType === 'swap' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                >Swap</button>
                <button 
                  onClick={() => setOrderType('limit')}
                  className={`font-headline font-bold text-sm tracking-tight transition-all px-4 py-1.5 rounded-full ${orderType === 'limit' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                >Limit</button>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`transition-colors flex items-center justify-center w-8 h-8 rounded-full ${showSettings ? 'bg-white/10 text-white' : 'text-on-surface/40 hover:text-white hover:bg-white/5'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl p-5 z-50">
                    <h3 className="font-headline font-bold text-sm text-white mb-4">Transaction Settings</h3>
                    <div>
                      <label className="font-label text-xs uppercase tracking-widest text-white/30 font-bold mb-3 block">Slippage Tolerance</label>
                      <div className="flex gap-2">
                        {['Auto', '0.1', '0.5', '1.0'].map(val => (
                          <button
                            key={val}
                            onClick={() => setSlippage(val === 'Auto' ? 'Auto' : val)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                              (val === 'Auto' && slippage === 'Auto') || val === slippage 
                                ? 'bg-white text-black border-white' 
                                : 'bg-[#0c0c0c] text-white/60 hover:text-white border-white/5'
                            }`}
                          >
                            {val === 'Auto' ? 'Auto' : `${val}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <label className="font-label text-xs uppercase tracking-widest text-white/30 font-bold">AI Session Control</label>
                        <span className="material-symbols-outlined text-primary text-xs">{sessionActive ? 'shield_person' : 'no_accounts'}</span>
                      </div>
                      <p className="text-[10px] text-white/20 mb-3 leading-relaxed">
                        {sessionActive 
                          ? "Session Active: AI can execute transactions from the inside without popups." 
                          : "No session active. All transactions will require manual MetaMask approval."}
                      </p>
                      <button
                        onClick={async () => {
                          if (sessionActive) deactivateSession();
                          else await activateSession(1);
                        }}
                        className={`w-full py-3 rounded-xl text-xs font-bold transition-all border ${
                          sessionActive 
                            ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' 
                            : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                        }`}
                      >
                        {sessionActive ? 'End Session' : 'Start 1-Hour Session'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                  walletBalances={balances}
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
            <div className={`bg-[#161616] rounded-2xl p-6 transition-all border border-white/5 focus-within:border-white/20 ${orderType === 'limit' ? 'mb-2' : 'mb-8'}`}>
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
                  walletBalances={balances}
                />
              </div>
            </div>

            {/* Limit Order Condition block */}
            {orderType === 'limit' && (
              <div className="bg-[#161616] rounded-2xl p-6 mb-8 transition-all border border-white/5 space-y-4">
                <div>
                  <div className="flex justify-between flex-wrap gap-2 mb-2">
                    <span className="font-label text-xs uppercase tracking-widest text-zinc-400 font-bold">Trigger Price</span>
                    <span className="font-label text-xs text-zinc-400">Current: {currentRateValue.toFixed(4)} {toToken}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0c0c0c] p-4 rounded-2xl border border-white/10 transition-all focus-within:border-white/20 overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-1">Trigger Rate</span>
                      <span className="font-headline font-bold text-sm text-white/80 whitespace-nowrap">1 {fromToken} =</span>
                    </div>
                    <input
                      type="text"
                      placeholder={currentRateValue.toFixed(4)}
                      value={targetPrice}
                      onChange={e => setTargetPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="bg-transparent border-none p-0 text-2xl md:text-3xl font-headline font-extrabold flex-1 focus:ring-0 text-white text-right placeholder:text-white/10 tracking-tight outline-none ml-4 min-w-0"
                    />
                  </div>
                </div>
                
                <div>
                  <span className="font-label text-xs uppercase tracking-widest text-white/30 font-bold mb-2 block">Expiration</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowExpirationList(!showExpirationList)}
                      className="w-full flex items-center justify-between bg-[#0c0c0c] p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors text-white"
                    >
                      <span className="font-headline font-bold text-sm">{expiration}</span>
                      <span className="material-symbols-outlined text-sm text-white/60">expand_more</span>
                    </button>
                    {showExpirationList && (
                      <div className="absolute left-0 top-full mt-2 w-full bg-[#161616] rounded-xl shadow-xl border border-white/10 z-20 overflow-hidden">
                        {['1 Hour', '1 Day', '1 Week', '30 Days'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setExpiration(opt); setShowExpirationList(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-white/5 text-white font-headline font-bold text-sm transition-colors"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-4 mb-6 px-2">
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
                <span className="font-headline font-bold text-white/80">{slippage === 'Auto' ? '0.5%' : `${slippage}%`}</span>
              </div>

              {/* Gas Fee Selection */}
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-white/30 font-body text-sm">Gas Fee</span>
                  {useCreditsForGas && (
                    <span className="text-[10px] text-white/20 mt-0.5">
                      Balance: {(tickingCredits || 0).toFixed(2)} ϕ
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!useCreditsForGas && (
                    <span className="font-headline font-bold text-white/50 text-sm">ETH (Normal)</span>
                  )}
                  {useCreditsForGas && (
                    <span className={`font-headline font-bold text-sm ${
                      (tickingCredits || 0) >= SWAP_GAS_CREDIT_COST ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {SWAP_GAS_CREDIT_COST} ϕ Credit
                    </span>
                  )}
                  {/* Toggle */}
                  <button
                    id="credits-gas-toggle"
                    onClick={() => setUseCreditsForGas(prev => !prev)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                      useCreditsForGas ? 'bg-emerald-500' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                      useCreditsForGas ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Credits Tooltip */}
              {useCreditsForGas && (tickingCredits || 0) < SWAP_GAS_CREDIT_COST && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
                  <span className="text-red-400 text-xs font-bold">Insufficient credits for gas. Need {SWAP_GAS_CREDIT_COST} ϕ.</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleAction}
              disabled={
                loading ||
                (isConnected && amountIn && parseFloat(amountIn) > (balances[fromToken] || 0)) ||
                (isConnected && useCreditsForGas && (tickingCredits || 0) < SWAP_GAS_CREDIT_COST)
              }
              className={`w-full py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 ${
                useCreditsForGas && (tickingCredits || 0) >= SWAP_GAS_CREDIT_COST
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                  : 'bg-white hover:bg-white/90 text-black'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> Processing…
                </span>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : amountIn && parseFloat(amountIn) > (balances[fromToken] || 0) ? (
                `Insufficient ${fromToken} Balance`
              ) : useCreditsForGas && (tickingCredits || 0) < SWAP_GAS_CREDIT_COST ? (
                `Insufficient Credits (Need ${SWAP_GAS_CREDIT_COST} ϕ)`
              ) : orderType === 'limit' ? (
                `Place Limit Order`
              ) : useCreditsForGas ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  {`Swap ${fromToken} → ${toToken} (Gas via Credits)`}
                </span>
              ) : (
                `Swap ${fromToken} → ${toToken}`
              )}
            </button>
          </div>

          {/* Contextual Info */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-[#0c0c0c] p-4 rounded-xl border border-white/5 shadow-xl">
              <p className="font-label text-xs uppercase text-white/20 mb-1">Network Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-headline font-bold text-sm text-white">Testnet Node Active</span>
              </div>
            </div>
            <div className="bg-[#0c0c0c] p-4 rounded-xl border border-white/5 shadow-xl">
              <p className="font-label text-xs uppercase text-white/20 mb-1">Gas Estimation</p>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-white/20">local_gas_station</span>
                <span className="font-headline font-bold text-sm text-white">$4.12 USD</span>
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
