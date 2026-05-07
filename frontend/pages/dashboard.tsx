import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, parseEther } from 'viem';

// ─── CONTRACT ADDRESSES ──────────────────────────────────────────────
const STAKING_V5 = '0x72c6abd9c48c9511e8c0d660091a974f6422d782' as `0x${string}`;
const RLO_TOKEN = '0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015' as `0x${string}`;
const USDC_TOKEN = '0x14064d2b438ed62d00c62f57f9fa77ddd0f770bb' as `0x${string}`;
const XAUT_TOKEN = '0x09213033579472F2B13ce9b2a52c826b901efFd8' as `0x${string}`;
const STRLO_TOKEN = '0x8800efA432fc1C44BbeBcDa0915a34B76475780d' as `0x${string}`;
const CHAIN_ID = 11155111;

// ─── ABI FRAGMENTS ───────────────────────────────────────────────────
const balanceOfAbi = [{
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

const userCreditsAbi = [{
  name: 'userCredits', type: 'function', stateMutability: 'view',
  inputs: [{ name: '', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const;

const approveAbi = [{
  name: 'approve', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const;

const stakeRloAbi = [{
  name: 'stakeRlo', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: '_amount', type: 'uint256' },
    { name: '_lockMonths', type: 'uint256' },
    { name: '_expectedReward', type: 'uint256' },
    { name: '_credits', type: 'uint256' },
  ],
  outputs: [],
}] as const;

// ─── HELPER: Format BigInt safely ────────────────────────────────────
function useSafeBalance(tokenAddr: `0x${string}`, decimals: number, address: `0x${string}` | undefined) {
  const { data } = useReadContract({
    address: tokenAddr, abi: balanceOfAbi, functionName: 'balanceOf',
    args: address ? [address] : undefined, chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 6000 },
  });
  const raw = data ? parseFloat(formatUnits(data, decimals)) : 0;
  return isNaN(raw) ? 0 : raw;
}

export default function DashboardPage() {
  const { transactions, connect, addTransaction } = useWallet();
  const { address } = useAccount();
  const isConnected = !!address;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── 1. ASSET BALANCES (Row 1) ───────────────────────────────────
  const rloBalance = useSafeBalance(RLO_TOKEN, 18, address);
  const usdcBalance = useSafeBalance(USDC_TOKEN, 6, address);
  const xautBalance = useSafeBalance(XAUT_TOKEN, 18, address);
  const strloBalance = useSafeBalance(STRLO_TOKEN, 18, address);

  const [ethBalance, setEthBalance] = useState(0);
  useEffect(() => {
    if (!address || typeof window === 'undefined' || !window.ethereum) return;
    const fetchEth = async () => {
      try {
        const { ethers } = await import('ethers');
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(address);
        setEthBalance(parseFloat(ethers.formatEther(bal)));
      } catch { setEthBalance(0); }
    };
    fetchEth();
    const iv = setInterval(fetchEth, 8000);
    return () => clearInterval(iv);
  }, [address]);

  // ─── 2. CREDITS (Center card) ────────────────────────────────────
  const { data: rawCredits } = useReadContract({
    address: STAKING_V5, abi: userCreditsAbi, functionName: 'userCredits',
    args: address ? [address] : undefined, chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const credits = rawCredits ? Number(rawCredits) : 0;

  // ─── 3. STAKING FORM (Right card) ────────────────────────────────
  const [stakeAmount, setStakeAmount] = useState('');
  const [lockDuration, setLockDuration] = useState(12);
  const [sfsFraction, setSfsFraction] = useState(16);
  const [ethPrice, setEthPrice] = useState(0);
  const [txStep, setTxStep] = useState<'idle' | 'approving' | 'staking' | 'done'>('idle');

  useEffect(() => {
    const f = async () => {
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const d = await r.json();
        setEthPrice(d.ethereum?.usd || 3000);
      } catch { setEthPrice(3000); }
    };
    f(); const iv = setInterval(f, 60000); return () => clearInterval(iv);
  }, []);

  // APY & Yield calculation (RLO = $1 each)
  const baseApy = 12 + (10 * (lockDuration - 1) / 47);
  const inputVal = parseFloat(stakeAmount) || 0;
  const totalYield = (baseApy / 12 / 100) * lockDuration * inputVal;
  const yieldToWallet = totalYield * (100 - sfsFraction) / 100;
  const routedCredits = Math.floor(totalYield * sfsFraction / 100 * 500);

  // Wagmi write hooks
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeStake, data: stakeHash } = useWriteContract();
  const { isSuccess: approveOk } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: stakeOk } = useWaitForTransactionReceipt({ hash: stakeHash });

  useEffect(() => {
    if (approveOk && txStep === 'approving') {
      setTxStep('staking');
      const amtBig = parseUnits(Number(inputVal).toFixed(18), 18);
      const rewardBig = parseUnits(Number(yieldToWallet).toFixed(6), 6);
      const creditsBig = BigInt(routedCredits);
      writeStake({
        address: STAKING_V5, abi: stakeRloAbi, functionName: 'stakeRlo',
        args: [amtBig, BigInt(lockDuration), rewardBig, creditsBig],
        chainId: CHAIN_ID,
      });
    }
  }, [approveOk]);

  // Cari blok ini di sekitar baris 140
  useEffect(() => {
    if (stakeOk && txStep === 'staking') {
      addTransaction({
        type: 'Stake',
        details: 'RLO Staking',
        amount: stakeAmount + ' RLO',
        txHash: stakeHash
      });

      setTxStep('done');
      alert(`✅ Staked ${stakeAmount} RLO for ${lockDuration} months! +${routedCredits} Credits`);
      setStakeAmount('');
      setTimeout(() => setTxStep('idle'), 2000);
    }
  }, [stakeOk]);

  const handleStake = () => {
    if (!address || inputVal <= 0) return;
    setTxStep('approving');
    const amtBig = parseUnits(Number(inputVal).toFixed(18), 18);
    writeApprove({
      address: RLO_TOKEN, abi: approveAbi, functionName: 'approve',
      args: [STAKING_V5, amtBig], chainId: CHAIN_ID,
    });
  };

  const stakeBtnLabel =
    txStep === 'approving' ? 'Approving RLO...' :
      txStep === 'staking' ? 'Staking...' :
        txStep === 'done' ? '✅ Success!' : 'Stake RLO';

  // ─── ACCENT HELPERS ──────────────────────────────────────────────
  const accent = '#a9ddd3';
  const bg = '#010101';
  const cardStyle: React.CSSProperties = { backgroundColor: bg, boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)' };
  const accentText = { color: accent };

  const fmt = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // ─── RENDER ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-body antialiased flex flex-col" style={{ backgroundColor: '#f8f9fa', color: '#1a1a1a' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 flex-grow w-full">

        {/* ═══════════ ROW 1: ASSET BALANCES ═══════════ */}
        <section className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 text-gray-800">
            Asset Balances
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'RIALO', value: rloBalance, decimals: 2, img: '/rialo-icon.png' },
              { label: 'ETH', value: ethBalance, decimals: 4, img: '/eth-icon.png' },
              { label: 'USDC', value: usdcBalance, decimals: 2, img: '/usdc-icon.webp' },
              // Menggunakan URL resmi Tether Gold agar ikonnya langsung muncul tanpa perlu buat file lokal
              { label: 'XAUt', value: xautBalance, decimals: 4, img: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x68749665FF8D2d112Fa859AA293F07A622782F38/logo.png' },
            ].map((t) => (
              <div
                key={t.label}
                className="p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
                style={cardStyle}
              >
                <div className="flex items-center justify-between mb-3">
                  {/* Container Ikon Bulat Premium ala Swap */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-white/10 border border-white/10 p-1">
                    <img
                      src={t.img}
                      alt={t.label}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback jika gambar tidak ditemukan, akan muncul ikon koin emas
                        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png';
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(169,221,211,0.4)' }}>{t.label}</span>
                </div>
                <p className="text-2xl font-black text-white">
                  {!mounted ? '—' : (isConnected ? fmt(t.value, t.decimals) : '—')}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ ROW 2: ECOSYSTEM CENTER ═══════════ */}
        <section className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 text-gray-800">
            Ecosystem Center
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* LEFT: Yield Breakdown */}
            <div className="p-6 rounded-2xl border border-white/5" style={cardStyle}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Yield Breakdown
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">stRLO Balance</p>
                  <p className="text-3xl font-black text-white">
                    {!mounted ? '—' : (isConnected ? fmt(strloBalance, 2) : '0.00')}
                  </p>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">USDC Upfront (Historical)</p>
                  <p className="text-3xl font-black" style={accentText}>
                    ${!mounted ? '—' : (isConnected ? fmt(usdcBalance) : '0.00')}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT: Service Credits */}
            <div
              className="p-6 rounded-2xl border-2 relative overflow-hidden"
              style={{ backgroundColor: bg, borderColor: accent, boxShadow: `0 20px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15), 0 0 40px rgba(169,221,211,0.06)` }}
            >
              <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(circle at 50% 0%, ${accent}, transparent 70%)` }} />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest mb-5" style={accentText}>
                  Service Credits
                </p>
                <p className="text-5xl font-black mb-3" style={accentText}>
                  {!mounted ? '—' : (isConnected ? credits.toLocaleString('en-US') : '—')}
                </p>
                <p className="text-[11px] text-white/30">
                  Credits earned from staking via SFS Routing. Use for AI Agent transactions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ ROW 3: TRANSACTION HISTORY ═══════════ */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-800">
              Transaction History
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={accentText}>
                {!mounted ? 0 : transactions.length} ops
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden" style={cardStyle}>
            {(mounted && isConnected) ? (
              transactions.length > 0 ? (

                <div className="divide-y divide-white/5">
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_1fr_auto_auto] gap-3 px-5 py-3 border-b border-white/5" style={{ backgroundColor: '#060606' }}>
                    <div />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Transaction</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-right">Amount</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20 text-right">Receipt</span>
                  </div>

                  {transactions.slice(0, 12).map((tx: any, i: number) => {
                    const icons: Record<string, string> = {
                      Swap: '↔', Bridge: '🌐', Stake: '🔒', Unstake: '🔓',
                      Faucet: '💧', Claim: '🎁', Credits: '⚡',
                    };
                    const icon = icons[tx.type] || '📋';
                    const shortHash = tx.txHash && !tx.txHash.startsWith('local-') && !tx.txHash.startsWith('simulated_')
                      ? `${tx.txHash.slice(0, 6)}...${tx.txHash.slice(-4)}` : null;

                    return (
                      <div
                        key={tx.id || i}
                        className="grid grid-cols-[40px_1fr_auto_auto] gap-3 items-center px-5 py-4 hover:bg-white/[0.01] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: 'rgba(169,221,211,0.06)' }}>
                          {icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'rgba(169,221,211,0.08)', color: accent }}
                            >
                              {tx.type}
                            </span>
                            <span className="text-xs font-bold text-white">{tx.details || tx.type}</span>
                          </div>
                          <span className="text-[10px] text-white/20 mt-0.5 block">{new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-white">{tx.amount}</span>
                        </div>
                        <div className="text-right">
                          {shortHash ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-[9px] font-black uppercase tracking-widest hover:brightness-150 transition-all"
                              style={accentText}
                            >
                              SCAN ↗
                            </a>
                          ) : (
                            <span className="text-[9px] font-black text-white/15 uppercase tracking-widest">Local</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-white/15 text-xs font-black uppercase tracking-widest">No transactions yet</p>
                </div>
              )
            ) : (
              <div className="py-16 text-center">
                <button
                  onClick={connect}
                  className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  style={{ backgroundColor: accent, color: bg }}
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
