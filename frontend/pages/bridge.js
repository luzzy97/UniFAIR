import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { ethers } from 'ethers';
import deployedContracts from '../lib/contracts/deployedContracts.json';

/* ─── Custom Token Dropdown ─── */
const NETWORKS = [
  { id: 'ethereum-sepolia', name: 'Ethereum Sepolia', icon: '/eth-icon-new.png', chainId: 11155111 },
  { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', icon: '/arbitrum-icon.jpg', chainId: 421614 },
  { id: 'rialo-network', name: 'Rialo Network', icon: '/rialo-icon-new.png', chainId: 12345 },
];

const TOKENS = [
  { symbol: 'RIALO', name: 'Rialo Token', icon: '/rialo-icon.png' },
  { symbol: 'ETH', name: 'Ethereum', icon: '/eth-icon.png' },
  { symbol: 'USDC', name: 'USD Coin', icon: '/usdc-icon.webp' },
  { symbol: 'USDT', name: 'Tether USD', icon: '/usdt-icon.png' },
];

// ─── ACCENT HELPERS (DARI UNIHUB) ──────────────────────────────────
const accent = '#a9ddd3';
const bgDark = '#010101';
const cardStyle = { backgroundColor: bgDark, boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)' };
const inputBg = '#060606';
const accentText = { color: accent };
// ─────────────────────────────────────────────────────────────────

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
      <span className="text-[10px] font-black uppercase tracking-widest block mb-3" style={{ color: 'rgba(169,221,211,0.4)' }}>
        Asset to Bridge
      </span>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-2xl px-6 py-5 flex items-center justify-between border border-white/5 hover:border-white/20 transition-all focus:outline-none group"
        style={{ backgroundColor: inputBg }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/5">
            <img src={selected.icon} alt={selected.name} className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-white font-black text-lg uppercase tracking-widest leading-none mb-1">{selected.symbol}</span>
            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">{selected.name}</span>
          </div>
        </div>
        <span className="material-symbols-outlined text-white/40 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-full border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fadeIn" style={{ backgroundColor: bgDark }}>
          {TOKENS.map(token => (
            <button
              key={token.symbol}
              onClick={() => { onChange(token.symbol); setOpen(false); }}
              className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${value === token.symbol ? 'bg-white/5' : ''}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/5">
                <img src={token.icon} alt={token.name} className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1">{token.symbol}</span>
                <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">{token.name}</span>
              </div>
              {value === token.symbol && (
                <span className="material-symbols-outlined ml-auto text-sm" style={accentText}>check</span>
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
  const options = NETWORKS.filter(n => n.id !== exclude);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative mb-2">
      <span className="text-[10px] font-black uppercase tracking-widest block mb-3" style={{ color: 'rgba(169,221,211,0.4)' }}>
        {label}
      </span>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-2xl px-6 py-4 flex items-center justify-between border border-white/5 hover:border-white/20 transition-all focus:outline-none group"
        style={{ backgroundColor: inputBg }}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0 border border-white/5">
            <img src={selected.icon} alt={selected.name} className={`w-full h-full ${selected.id === 'arbitrum-sepolia' ? 'scale-[1.2] object-cover' : 'object-contain'}`} />
          </div>
          <span className="text-white font-black text-sm uppercase tracking-widest">{selected.name}</span>
        </div>
        <span className="material-symbols-outlined text-white/40 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-2 w-full border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fadeIn" style={{ backgroundColor: bgDark }}>
          {options.map(network => (
            <button
              key={network.id}
              onClick={() => { onChange(network.id); setOpen(false); }}
              className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${value === network.id ? 'bg-white/5' : ''}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0 border border-white/5">
                <img src={network.icon} alt={network.name} className={`w-full h-full ${network.id === 'arbitrum-sepolia' ? 'scale-[1.2] object-cover' : 'object-contain'}`} />
              </div>
              <span className="text-white font-black text-xs uppercase tracking-widest">{network.name}</span>
              {value === network.id && (
                <span className="material-symbols-outlined ml-auto text-sm" style={accentText}>check</span>
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
  const [toNetwork, setToNetwork] = useState('arbitrum-sepolia');
  const [token, setToken] = useState('RIALO');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [realBalances, setRealBalances] = useState({
    ETH: '0', RIALO: '0', USDC: '0', USDT: '0'
  });

  useEffect(() => {
    const fetchAllBalances = async () => {
      if (!isConnected || !address || !window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tempBalances = { ...realBalances };

        const ethBal = await provider.getBalance(address);
        tempBalances.ETH = parseFloat(ethers.formatEther(ethBal)).toString();

        const tokenList = [
          { sym: 'RIALO', addr: deployedContracts.address.RLO, dec: 18 },
          { sym: 'USDC', addr: deployedContracts.address.USDC, dec: 6 },
          { sym: 'USDT', addr: deployedContracts.address.USDT, dec: 6 }
        ];

        for (const t of tokenList) {
          if (t.addr) {
            const contract = new ethers.Contract(t.addr, ["function balanceOf(address) view returns (uint256)"], provider);
            const bal = await contract.balanceOf(address);
            tempBalances[t.sym] = parseFloat(ethers.formatUnits(bal, t.dec)).toString();
          }
        }
        setRealBalances(tempBalances);
      } catch (e) { console.error("Gagal update saldo bridge:", e); }
    };

    fetchAllBalances();
    const interval = setInterval(fetchAllBalances, 5000);
    return () => clearInterval(interval);
  }, [isConnected, address, fromNetwork]);

  const sourceBalance = realBalances[token] || '0';
  const receiveAmount = amount ? parseFloat(amount).toString() : '0';

  const handleSwapNetworks = () => {
    setFromNetwork(toNetwork);
    setToNetwork(fromNetwork);
  };

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
        switchNetwork(12345, {
          chainId: '0x3039',
          chainName: 'Rialo Network',
          nativeCurrency: { name: 'Rialo', symbol: 'RLO', decimals: 18 },
          rpcUrls: ['https://rpc.rialo.network'],
          blockExplorerUrls: ['https://explorer.rialo.network'],
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
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const decimals = (token === 'USDC' || token === 'USDT') ? 6 : 18;
      const parsedAmount = ethers.parseUnits(amount, decimals);

      const targetNetName = NETWORKS.find(n => n.id === toNetwork)?.name || 'Network';
      showToast({ message: `Initiating ${token} bridge to ${targetNetName}...`, type: 'loading' });

      if (token === 'ETH') {
        const tx = await signer.sendTransaction({
          to: address,
          value: parsedAmount
        });
        await tx.wait();
      } else {
        const tokenKey = token === 'RIALO' ? 'RLO' : token;
        const tokenAddress = deployedContracts.address[tokenKey];

        if (!tokenAddress) throw new Error(`Contract address for ${token} not found!`);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function transfer(address to, uint256 amount) public returns (bool)"],
          signer
        );
        const tx = await tokenContract.transfer(address, parsedAmount);
        await tx.wait();
      }

      showToast({
        message: `Success! ${amount} ${token} bridged to ${targetNetName}.`,
        type: 'success'
      });
      setAmount('');
      if (fetchEthBalance) fetchEthBalance(address, provider);
      if (fetchRloBalance) fetchRloBalance();
    } catch (error) {
      console.error("Bridge Error:", error);
      showToast({ message: "Transaction failed or cancelled", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fromNet = NETWORKS.find(n => n.id === fromNetwork);
  const toNet = NETWORKS.find(n => n.id === toNetwork);

  return (
    <div className="min-h-screen font-body antialiased flex flex-col transition-colors duration-500" style={{ backgroundColor: '#f8f9fa', color: '#1a1a1a' }}>
      <Navbar />
      <main className="min-h-[calc(100vh-250px)] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-[560px]">

          {/* Header */}
          <div className="mb-8 text-center" style={{ color: '#1a1a1a' }}>
            <h1 className="mb-2 font-black tracking-tighter" style={{ fontSize: '3.5rem' }}>Bridge</h1>
            <p className="font-bold text-gray-500 mb-6">Seamlessly move your assets across networks</p>
          </div>

          {/* Bridge Card */}
          <div className="rounded-2xl p-8 relative overflow-hidden border border-white/5" style={cardStyle}>

            {/* Token Selection */}
            <TokenDropdown value={token} onChange={setToken} />

            {/* From Network */}
            <NetworkDropdown label="From Network" value={fromNetwork} onChange={handleFromChange} exclude={toNetwork} />

            {/* Amount input */}
            <div className="rounded-2xl p-6 mt-4 mb-2 border border-white/5 focus-within:border-white/20 transition-all" style={{ backgroundColor: inputBg }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(169,221,211,0.4)' }}>Amount</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Balance: {parseFloat(sourceBalance).toFixed(4)} {token}</span>
              </div>
              <input
                type="text"
                placeholder="0.0"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 outline-none"
              />
            </div>

            {/* Swap Divider (Arrow) */}
            <div className="flex justify-center -my-6 relative z-10 mb-4 mt-2">
              <button
                onClick={handleSwapNetworks}
                className="p-3 rounded-2xl shadow-xl border border-white/5 hover:border-white/20 hover:scale-110 transition-all"
                style={{ backgroundColor: inputBg }}
              >
                <span className="material-symbols-outlined" style={accentText}>arrow_downward</span>
              </button>
            </div>

            {/* To Network */}
            <NetworkDropdown label="To Network" value={toNetwork} onChange={handleToChange} exclude={fromNetwork} />

            {/* You Receive */}
            <div className="rounded-2xl p-6 mt-4 mb-8 border border-white/5 transition-all" style={{ backgroundColor: inputBg }}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(169,221,211,0.4)' }}>You receive</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <input
                  type="text"
                  placeholder="0"
                  value={receiveAmount}
                  readOnly
                  className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 cursor-default"
                />
                <span className="text-lg font-black text-white/40 tracking-widest uppercase">{token}</span>
              </div>
            </div>

            {/* Details Area */}
            <div className="space-y-4 mb-8 px-2 text-white">
              {[
                ['Route', `${fromNet?.name} → ${toNet?.name}`],
                ['Rate', `1 ${token} = 1 ${token}`],
                ['Network Fee', `0.001 ETH`],
                ['Estimated Arrival', '~2 minutes'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
                  <span className="text-xs font-black text-white">{val}</span>
                </div>
              ))}
            </div>

            {/* Main CTA Button */}
            <button
              onClick={handleBridge}
              disabled={loading || (isConnected && amount && parseFloat(amount) > sourceBalance)}
              className="w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] transition-all shadow-2xl disabled:opacity-50 hover:brightness-110"
              style={loading || (isConnected && amount && parseFloat(amount) > sourceBalance)
                ? { backgroundColor: '#333', color: '#888' }
                : { backgroundColor: accent, color: bgDark }
              }
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> Bridging…
                </span>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : amount && parseFloat(amount) > sourceBalance ? (
                `Insufficient ${token} Balance`
              ) : (
                `Bridge ${fromNet?.name} → ${toNet?.name}`
              )}
            </button>
          </div>
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