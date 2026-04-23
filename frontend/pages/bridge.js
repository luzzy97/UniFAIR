import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { ethers } from 'ethers';

const NETWORKS = [
  { id: 'ethereum-sepolia', name: 'Ethereum Sepolia', icon: '/eth-icon-new.png', chainId: 11155111 },
  { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', icon: '/arbitrum-icon.jpg', chainId: 421614 },
  { id: 'rialo-network',    name: 'Rialo Network',    icon: '/rialo-icon-new.png', chainId: 12345 },
];

const TOKENS = [
  { symbol: 'RIALO', name: 'Rialo Token', icon: '/rialo-icon.png' },
  { symbol: 'ETH',   name: 'Ethereum',    icon: '/eth-icon.png' },
  { symbol: 'USDC',  name: 'USD Coin',    icon: '/usdc-icon.webp' },
  { symbol: 'USDT',  name: 'Tether USD',  icon: '/usdt-icon.png' },
];

/* ─── Custom Token Dropdown ─── */
function TokenDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = TOKENS.find(t => t.symbol === value) || TOKENS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative mb-6">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label block mb-3">
        Send
      </span>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-[#161616] rounded-2xl px-5 py-4 flex items-center justify-between border border-white/5 hover:border-white/20 transition-all shadow-inner focus:outline-none group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 bg-white/5">
            <img src={selected.icon} alt={selected.name} className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-white font-bold text-base leading-none mb-1">{selected.symbol}</span>
            <span className="text-white/40 text-[10px] font-medium uppercase tracking-wider">{selected.name}</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-full bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fadeIn">
          {TOKENS.map(token => (
            <button
              key={token.symbol}
              onClick={() => { onChange(token.symbol); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors ${value === token.symbol ? 'bg-white/5' : ''}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 bg-white/5">
                <img src={token.icon} alt={token.name} className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-semibold text-sm leading-none mb-0.5">{token.symbol}</span>
                <span className="text-white/20 text-[9px] font-medium uppercase tracking-wider">{token.name}</span>
              </div>
              {value === token.symbol && (
                <svg className="w-4 h-4 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Custom Network Dropdown ─── */
function NetworkDropdown({ label, value, onChange, exclude }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = NETWORKS.find(n => n.id === value) || NETWORKS[0];
  const options  = NETWORKS.filter(n => n.id !== exclude);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Label */}
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label block mb-3">
        {label}
      </span>

      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-[#161616] rounded-2xl px-5 py-4 flex items-center justify-between border border-white/5 hover:border-white/20 transition-all shadow-inner focus:outline-none group"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 bg-white"
          >
            <img
              src={selected.icon}
              alt={selected.name}
              className={`w-full h-full ${selected.id === 'arbitrum' ? 'scale-[1.2] object-cover' : 'object-contain'}`}
            />
          </div>
          <span className="text-white font-bold text-base">{selected.name}</span>
        </div>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-full mt-2 w-full bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fadeIn">
          {options.map(network => (
            <button
              key={network.id}
              onClick={() => { onChange(network.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors ${
                value === network.id ? 'bg-white/5' : ''
              }`}
            >
              <div
                className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex items-center justify-center flex-shrink-0 bg-white"
              >
                <img
                  src={network.icon}
                  alt={network.name}
                  className={`w-full h-full ${network.id === 'arbitrum' ? 'scale-[1.2] object-cover' : 'object-contain'}`}
                />
              </div>
              <span className="text-white font-semibold text-sm">{network.name}</span>
              {value === network.id && (
                <svg className="w-4 h-4 text-white/60 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Bridge Page ─── */
export default function BridgePage() {
  const { isConnected, address, provider, connect, balances: walletBalances, addTransaction, globalRates, fetchEthBalance, updateBalances, showToast, switchNetwork } = useWallet();
  const { balance: rloBal, fetchBalance: fetchRloBalance } = useRLO();

  const [fromNetwork, setFromNetwork] = useState('ethereum-sepolia');
  const [toNetwork,   setToNetwork]   = useState('arbitrum-sepolia');
  const [token,       setToken]       = useState('RIALO');
  const [amount,      setAmount]      = useState('');
  const [loading,     setLoading]     = useState(false);

  const balances = { ...walletBalances, RIALO: parseFloat(rloBal || '0') };
  const sourceBalance = balances[token] || 0;
  const receiveAmount = amount || '0.00';

  /* Swap From↔To */
  const handleSwapNetworks = () => {
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
  };

  /* Prevent same network on both sides */
  const handleFromChange = (id) => {
    setFromNetwork(id);
    if (id === toNetwork) {
      const other = NETWORKS.find(n => n.id !== id);
      setToNetwork(other.id);
    }

    const net = NETWORKS.find(n => n.id === id);
    if (net && switchNetwork) {
      if (id === 'ethereum-sepolia') {
        switchNetwork(11155111);
      } else if (id === 'arbitrum-sepolia') {
        switchNetwork(421614, {
          chainId: '0x66eee',
          chainName: 'Arbitrum Sepolia Testnet',
          nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
          blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
        });
      } else if (id === 'rialo-network') {
        switchNetwork(12345, { // Example config for Rialo Network
          chainId: '0x3039',
          chainName: 'Rialo Network',
          nativeCurrency: { name: 'Rialo', symbol: 'RLO', decimals: 18 },
          rpcUrls: ['https://rpc.rialo.network'], // Placeholder
          blockExplorerUrls: ['https://explorer.rialo.network'], // Placeholder
        });
      }
    }
  };
  const handleToChange = (id) => {
    setToNetwork(id);
    if (id === fromNetwork) {
      setFromNetwork(toNetwork);
    }
  };

  const handleBridge = async () => {
    if (!isConnected) { connect(); return; }
    if (!amount || parseFloat(amount) <= 0) {
      showToast({ message: 'Enter an amount greater than 0', type: 'error' });
      return;
    }
    if (parseFloat(amount) > sourceBalance) {
      showToast({ message: 'Insufficient balance', type: 'error' });
      return;
    }

    setLoading(true);
    let timeLeft = 30;
    const targetNetName = NETWORKS.find(n=>n.id===toNetwork)?.name || 'Network';
    showToast({ message: `Bridging to ${targetNetName} in ${timeLeft}s`, type: 'loading' });

    const timer = setInterval(() => {
      timeLeft -= 5;
      if (timeLeft > 0) {
        showToast({ message: `Bridging to ${targetNetName} in ${timeLeft}s`, type: 'loading' });
      } else {
        clearInterval(timer);
      }
    }, 5000);

    try {
      const signer = await provider.getSigner();
      let tx;
      if (token === 'ETH') {
        tx = await signer.sendTransaction({
          to: '0x000000000000000000000000000000000000dEaD',
          value: ethers.parseEther(amount),
        });
      } else {
        tx = await signer.sendTransaction({
          to: '0x000000000000000000000000000000000000dEaD',
          value: 0,
        });
      }
      const receipt = await tx.wait();
      clearInterval(timer);
      const hash = receipt.hash;

      showToast({
        message: `Bridge initiated! ${amount} ${token} → ${targetNetName}`,
        type: 'success',
        txHash: hash,
      });

      addTransaction({
        type: 'Bridge',
        amount: `${amount} ${token}`,
        details: `${NETWORKS.find(n=>n.id===fromNetwork)?.name} → ${targetNetName}`,
        txHash: hash,
        source: 'Direct',
      });

      if (address && provider) { fetchEthBalance(address, provider); fetchRloBalance(); }
      if (updateBalances) {
        updateBalances({ [token]: -parseFloat(amount) });
      }
      setAmount('');
    } catch (err) {
      clearInterval(timer);
      const msg = err.message || '';
      if (msg.includes('user rejected') || msg.includes('4001')) {
        showToast({ message: 'Transaction rejected in MetaMask.', type: 'error' });
      } else {
        showToast({ message: `Bridge failed. ${msg.slice(0, 60)}${msg.length > 60 ? '...' : ''}`, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const fromNet = NETWORKS.find(n => n.id === fromNetwork);
  const toNet   = NETWORKS.find(n => n.id === toNetwork);

  return (
    <div className="bg-white text-zinc-900 antialiased selection:bg-primary selection:text-white font-body">
      <Navbar />
      <main className="min-h-[819px] flex flex-col items-center justify-center px-6 py-20">

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl text-black mb-4">Bridge Assets</h1>
          <p className="text-zinc-500 max-w-md mx-auto font-medium">
            Seamlessly move your assets across networks. A simplified bridging experience designed to remove complexity.
          </p>
        </div>

        {/* Bridge Card */}
        <div className="w-full max-w-[520px] bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-visible">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50 pointer-events-none" />

          {/* Token Selection */}
          <TokenDropdown
            value={token}
            onChange={setToken}
          />

          {/* From Network */}
          <NetworkDropdown
            label="From Network"
            value={fromNetwork}
            onChange={handleFromChange}
            exclude={toNetwork}
          />

          {/* Amount input */}
          <div className="mt-4 mb-4 bg-[#161616] rounded-2xl px-5 py-4 border border-white/5 focus-within:border-white/20 transition-all shadow-inner flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">Amount</span>
            <input
              type="text"
              placeholder="0.0"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="bg-transparent border-none p-0 text-right text-3xl font-headline font-bold text-white focus:ring-0 w-40 placeholder:text-white/10 outline-none"
            />
          </div>
          <div className="flex justify-end mb-6">
            <span className="text-xs text-white/30 font-medium">
              Balance: <span className="text-white/50">{sourceBalance.toLocaleString('en-US', { minimumFractionDigits: 4 })} {token}</span>
            </span>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center -my-2 relative z-10 mb-4">
            <button
              onClick={handleSwapNetworks}
              className="bg-[#1a1a1a] p-2.5 rounded-xl border border-white/10 hover:border-white/30 hover:scale-110 transition-all cursor-pointer outline-none shadow-lg"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Network */}
          <NetworkDropdown
            label="To Network"
            value={toNetwork}
            onChange={handleToChange}
            exclude={fromNetwork}
          />

          {/* You Receive */}
          <div className="mt-4 mb-8 bg-[#161616] rounded-2xl px-5 py-4 border border-white/5 shadow-inner flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">You Receive</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-headline font-extrabold text-white/20">{receiveAmount}</span>
              <span className="text-xs font-bold text-white/10 tracking-widest uppercase">{token}</span>
            </div>
          </div>

          {/* Meta Info */}
          <div className="space-y-3 mb-8">
            {[
              ['Route',             `${fromNet?.name} → ${toNet?.name}`],
              ['Rate',              `1 ${token} = 1 ${token}`],
              ['Network Fee',       `0.001 ETH`],
              ['Estimated Arrival', '~2 minutes'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-white/30 font-body">{label}</span>
                <span className="text-white/80 font-headline font-bold">{value}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleBridge}
            disabled={loading || (isConnected && amount && parseFloat(amount) > sourceBalance)}
            className="w-full bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> Bridging…
              </span>
            ) : !isConnected ? (
              'Connect Wallet'
            ) : amount && parseFloat(amount) > sourceBalance ? (
              'Insufficient Balance'
            ) : (
              `Bridge ${fromNet?.name} → ${toNet?.name}`
            )}
          </button>
        </div>

      </main>
      <Footer />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.15s ease; }
      `}</style>
    </div>
  );
}
