import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import { RLO_ADDRESS } from '../lib/ethers';
import deployedContracts from '../lib/contracts/deployedContracts.json';

const TOKENS = [
  { symbol: 'ETH', icon: '/eth-icon.png', isImage: true, iconClass: 'p-0.5', poolIndex: null },
  { symbol: 'RIALO', icon: '/rialo-icon.png', isImage: true, iconClass: 'p-0.5', poolIndex: 0 },
  { symbol: 'stRLO', icon: '/rialo-icon.png', isImage: true, iconClass: 'p-0.5', poolIndex: 1 },
  { symbol: 'USDC', icon: '/usdc-icon.webp', isImage: true, iconClass: 'p-0.5', poolIndex: 2 },
  { symbol: 'USDT', icon: '/usdt-icon.png', isImage: true, iconClass: 'p-0.5', poolIndex: 3 },
];

const TokenSelector = ({ value, onChange, show, setShow, excludeToken, walletBalances }) => (
  <div className="relative">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setShow(!show);
      }}
      className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/5 hover:border-white/20 transition-colors duration-200"
      style={{ backgroundColor: 'rgba(169,221,211,0.06)' }}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden pointer-events-none ${TOKENS.find(t => t.symbol === value)?.iconClass}`}>
        {TOKENS.find(t => t.symbol === value)?.isImage ? (
          <img src={TOKENS.find(t => t.symbol === value)?.icon} className="w-full h-full object-contain" alt={value} />
        ) : (
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {TOKENS.find(t => t.symbol === value)?.icon}
          </span>
        )}
      </div>
      <span className="font-black text-sm text-white tracking-widest uppercase pointer-events-none" style={{ textShadow: 'none', filter: 'none' }}>{value}</span>
      <span className="material-symbols-outlined text-sm text-white/60 pointer-events-none">expand_more</span>
    </button>
    {show && (
      <div className="absolute right-0 top-full mt-2 bg-[#010101] rounded-2xl shadow-2xl border border-white/10 z-[100] min-w-[140px] overflow-hidden animate-in fade-in duration-200">
        {TOKENS.filter(t => t.symbol !== excludeToken).map(t => (
          <button
            key={t.symbol}
            onClick={() => { onChange(t.symbol); setShow(false); }}
            className="flex items-center gap-3 w-full px-5 py-4 hover:bg-white/5 transition-colors text-white group border-b border-white/5 last:border-0"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden pointer-events-none ${t.iconClass}`}>
              {t.isImage ? (
                <img src={t.icon} className="w-full h-full object-contain" alt={t.symbol} />
              ) : (
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
              )}
            </div>
            <span className="font-black text-xs text-white uppercase tracking-widest pointer-events-none" style={{ textShadow: 'none', filter: 'none' }}>{t.symbol}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

export default function SwapPage() {
  const { isConnected, address, provider, connect, balances: walletBalances, updateBalance, updateBalances, addTransaction, globalRates, addTriggerOrder, fetchEthBalance, sessionActive, activateSession, deactivateSession, showToast } = useWallet();
  const { balance: rloBal, claimFaucet, loading: faucetLoading, transfer, fetchBalance: fetchRloBalance } = useRLO();
  const { tickingCredits, deductCredits } = useStaking();

  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('RIALO');
  const [amountIn, setAmountIn] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFromTokenList, setShowFromTokenList] = useState(false);
  const [showToTokenList, setShowToTokenList] = useState(false);

  const balances = { ...walletBalances };
  const [orderType, setOrderType] = useState('swap');
  const [targetPrice, setTargetPrice] = useState('');
  const [expiration, setExpiration] = useState('1 Day');
  const [showExpirationList, setShowExpirationList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [liveEthPrice, setLiveEthPrice] = useState(2308);
  const [realBalances, setRealBalances] = useState({ ETH: '0.00', RIALO: '0.00', stRLO: '0.00', USDC: '0.00', USDT: '0.00' });

  // ─── ACCENT HELPERS ──────────────────────────────────
  const accent = '#a9ddd3';
  const bgDark = '#010101';
  const cardStyle = { backgroundColor: bgDark, boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)' };
  const accentText = { color: accent };
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const data = await response.json();
        if (data.ethereum && data.ethereum.usd) {
          setLiveEthPrice(data.ethereum.usd);
        }
      } catch (e) {
        console.error("Gagal update harga");
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAllBalances = async () => {
      if (!isConnected || !address || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tempBalances = { ...realBalances };

        const ethBal = await provider.getBalance(address);
        tempBalances.ETH = parseFloat(ethers.formatEther(ethBal)).toFixed(4);

        const tokenList = [
          { sym: 'RIALO', addr: deployedContracts.address.RLO, dec: 18 },
          { sym: 'stRLO', addr: deployedContracts.address.stRLO, dec: 18 },
          { sym: 'USDC', addr: deployedContracts.address.USDC, dec: 6 },
          { sym: 'USDT', addr: deployedContracts.address.USDT, dec: 6 }
        ];

        for (const t of tokenList) {
          if (t.addr) {
            const contract = new ethers.Contract(t.addr, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(address);
            tempBalances[t.sym] = parseFloat(ethers.formatUnits(bal, t.dec)).toFixed(2);
          }
        }
        setRealBalances(tempBalances);
      } catch (e) {
        console.error("Gagal update saldo:", e);
      }
    };
    fetchAllBalances();
    const interval = setInterval(fetchAllBalances, 5000);
    return () => clearInterval(interval);
  }, [isConnected, address]);

  const getRate = (from, to) => {
    if (globalRates?.[from]?.[to]) return globalRates[from][to];
    const prices = { ETH: liveEthPrice, RIALO: 1, stRLO: 1, USDC: 1, USDT: 1 };
    const p1 = prices[from] || 1;
    const p2 = prices[to] || 1;
    return p1 / p2;
  };

  const currentRateValue = getRate(fromToken, toToken);
  const activeRate = orderType === 'limit' && targetPrice ? parseFloat(targetPrice) : currentRateValue;
  const estimatedOut = amountIn ? parseFloat((parseFloat(amountIn) * activeRate).toFixed(6)).toString() : '';
  const displayRate = `1 ${fromToken} ≈ ${parseFloat(activeRate.toFixed(8)).toString()} ${toToken}`;

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
      showToast({ message: 'Enter an amount greater than 0', type: 'error' });
      return;
    }
    const currentBalance = balances[fromToken] || 0;
    if (parseFloat(amountIn) > currentBalance) {
      showToast({ message: `Insufficient ${fromToken} balance`, type: 'error' });
      return;
    }

    setLoading(true);
    showToast({ message: 'Confirming transaction in MetaMask...', type: 'loading' });
    try {
      const signer = await provider.getSigner();
      const parsedAmount = ethers.parseEther(amountIn.toString());
      const swapAddress = deployedContracts.address.UniFairSwap;
      const swapAbi = deployedContracts.abi.UniFairSwap;
      const swapContract = new ethers.Contract(swapAddress, swapAbi, signer);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const fromTokenData = TOKENS.find(t => t.symbol === fromToken);
      const toTokenData = TOKENS.find(t => t.symbol === toToken);
      const fromTokenId = fromTokenData?.poolIndex;
      const toTokenId = toTokenData?.poolIndex;

      let hash;
      if (fromToken === 'ETH') {
        const tx = await swapContract.swapExactETHForTokens(toTokenId, 0, deadline, { value: parsedAmount });
        await tx.wait();
        hash = tx.hash;
      } else if (toToken === 'ETH') {
        const sourceTokenAddress = deployedContracts.address[fromToken === 'RIALO' ? 'RLO' : fromToken];
        const tokenContract = new ethers.Contract(sourceTokenAddress, deployedContracts.abi.RLO, signer);
        const approveTx = await tokenContract.approve(swapAddress, parsedAmount);
        await approveTx.wait();
        const tx = await swapContract.swapExactTokensForETH(fromTokenId, parsedAmount, 0, deadline);
        await tx.wait();
        hash = tx.hash;
      } else {
        const sourceTokenAddress = deployedContracts.address[fromToken === 'RIALO' ? 'RLO' : fromToken];
        const tokenContract = new ethers.Contract(sourceTokenAddress, deployedContracts.abi.RLO, signer);
        const approveTx = await tokenContract.approve(swapAddress, parsedAmount);
        await approveTx.wait();
        const tx = await swapContract.swapTokensForTokens(fromTokenId, toTokenId, parsedAmount, 0, deadline);
        await tx.wait();
        hash = tx.hash;
      }

      showToast({ message: `Swap successful!`, type: 'success', txHash: hash });
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
      addTransaction({
        type: 'SWAP',
        details: `Swapped ${fromToken} to ${toToken}`,
        amount: `${amountIn} ${fromToken}`,
        txHash: hash
      });
      setAmountIn('');
    } catch (err) {
      showToast({ message: `Swap failed: ${err.message.slice(0, 50)}...`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-body antialiased flex flex-col transition-colors duration-500" style={{ backgroundColor: '#f8f9fa', color: '#1a1a1a' }}>
      <Navbar />
      <main className="min-h-[calc(100vh-250px)] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-[480px]">

          {/* Header */}
          <div className="mb-8 text-center" style={{ color: '#1a1a1a' }}>
            <h1 className="mb-2 font-black tracking-tighter" style={{ fontSize: '3.5rem' }}>Swap</h1>
            <p className="font-bold text-gray-500 mb-6">Seamless trading across the unified ecosystem</p>

            {isConnected && (
              <button
                onClick={async () => {
                  try {
                    showToast({ message: 'Requesting RLO from faucet...', type: 'loading' });
                    const hash = await claimFaucet();
                    showToast({ message: '100 RLO claimed successfully!', type: 'success', txHash: hash });
                    addTransaction({
                      type: 'Faucet',
                      amount: '100 RIALO',
                      details: 'Claim RLO Faucet',
                      txHash: hash,
                      source: 'Faucet'
                    });
                    fetchRloBalance();
                  } catch (e) {
                    showToast({ message: e.reason || e.message || 'Faucet claim failed', type: 'error' });
                  }
                }}
                disabled={faucetLoading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:brightness-110"
                style={cardStyle}
              >
                <span className="material-symbols-outlined text-sm" style={accentText}>water_drop</span>
                <span className="text-white">{faucetLoading ? 'Claiming...' : 'Claim 100 RLO Faucet'}</span>
              </button>
            )}
          </div>

          {/* Swap Card */}
          <div className="rounded-2xl p-8 relative overflow-hidden border border-white/5" style={cardStyle}>

            {/* Top Actions */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-1 p-1 rounded-full border border-white/5" style={{ backgroundColor: '#060606' }}>
                <button
                  onClick={() => setOrderType('swap')}
                  className={`font-black text-[10px] uppercase tracking-widest transition-all px-5 py-2 rounded-full ${orderType === 'swap' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                >Swap</button>
                <button
                  onClick={() => setOrderType('limit')}
                  className={`font-black text-[10px] uppercase tracking-widest transition-all px-5 py-2 rounded-full ${orderType === 'limit' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
                >Limit</button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`transition-colors flex items-center justify-center w-8 h-8 rounded-full ${showSettings ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </button>

                {/* Settings Dropdown */}
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-2xl p-5 z-50 border border-white/10" style={{ backgroundColor: bgDark }}>
                    <h3 className="font-black text-xs uppercase tracking-widest text-white mb-4">Transaction Settings</h3>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3 block">Slippage Tolerance</label>
                      <div className="flex gap-2">
                        {['Auto', '0.1', '0.5', '1.0'].map(val => (
                          <button
                            key={val}
                            onClick={() => setSlippage(val === 'Auto' ? 'Auto' : val)}
                            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${(val === 'Auto' && slippage === 'Auto') || val === slippage ? 'bg-white text-black border-white' : 'bg-[#060606] text-white/60 hover:text-white border-white/5'}`}
                          >
                            {val === 'Auto' ? 'Auto' : `${val}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input — You Pay */}
            <div className="rounded-2xl p-6 mb-2 border border-white/5 focus-within:border-white/20 transition-all" style={{ backgroundColor: '#060606' }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(169,221,211,0.4)' }}>You pay</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Balance: {realBalances[fromToken] || '0.00'} {fromToken}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="0"
                    value={amountIn}
                    onChange={e => setAmountIn(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 outline-none"
                  />
                  {/* 👇 INI DIA TAMBAHAN HARGA USD-NYA 👇 */}
                  {amountIn && parseFloat(amountIn) > 0 && (
                    <div className="text-[11px] font-bold text-white/30 mt-1">
                      ≈ ${(parseFloat(amountIn) * (fromToken === 'ETH' ? liveEthPrice : 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  )}
                </div>
                <div className="shrink-0">
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
            </div>

            {/* Swap Divider (Arrow) */}
            <div className="flex justify-center -my-6 relative z-10">
              <button
                onClick={handleSwapTokens}
                className="p-3 rounded-2xl shadow-xl border border-white/5 hover:border-white/20 hover:scale-110 transition-all"
                style={{ backgroundColor: '#060606' }}
              >
                <span className="material-symbols-outlined" style={accentText}>arrow_downward</span>
              </button>
            </div>

            {/* Output — You Receive */}
            <div className={`rounded-2xl p-6 border border-white/5 focus-within:border-white/20 transition-all ${orderType === 'limit' ? 'mb-2' : 'mb-8'}`} style={{ backgroundColor: '#060606' }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(169,221,211,0.4)' }}>You receive</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Balance: {realBalances[toToken] || '0.00'} {toToken}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="0"
                    value={estimatedOut}
                    readOnly
                    className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 cursor-default outline-none"
                  />
                  {/* 👇 INI DIA TAMBAHAN HARGA USD-NYA 👇 */}
                  {estimatedOut && parseFloat(estimatedOut) > 0 && (
                    <div className="text-[11px] font-bold text-white/30 mt-1">
                      ≈ ${(parseFloat(estimatedOut) * (toToken === 'ETH' ? liveEthPrice : 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </div>
                  )}
                </div>
                <div className="shrink-0">
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
            </div>

            {/* Details Area */}
            <div className="space-y-4 mb-8 px-2 text-white">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Exchange Rate</span>
                <span className="text-sm font-black text-white">{displayRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Price Impact</span>
                <span className="text-sm font-black text-white" style={accentText}>&lt; 0.01%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Max Slippage</span>
                <span className="text-sm font-black text-white">{slippage === 'Auto' ? '0.5%' : `${slippage}%`}</span>
              </div>
            </div>

            {/* Main CTA Button */}
            <button
              onClick={handleAction}
              disabled={loading || (isConnected && amountIn && parseFloat(amountIn) > (balances[fromToken] || 0))}
              className="w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] transition-all shadow-2xl disabled:opacity-50 hover:brightness-110"
              style={loading || (isConnected && amountIn && parseFloat(amountIn) > (balances[fromToken] || 0))
                ? { backgroundColor: '#333', color: '#888' }
                : { backgroundColor: accent, color: bgDark }
              }
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> Processing…
                </span>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : amountIn && parseFloat(amountIn) > (balances[fromToken] || 0) ? (
                `Insufficient ${fromToken} Balance`
              ) : orderType === 'limit' ? (
                `Place Limit Order`
              ) : (
                `Swap ${fromToken} \u2192 ${toToken}`
              )}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}