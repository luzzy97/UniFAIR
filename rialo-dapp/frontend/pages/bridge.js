import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { ethers } from 'ethers';

const CHAINS = [
  { id: '1', name: 'Ethereum', icon: '/eth-icon-new.png', isImage: true },
  { id: '42161', name: 'Arbitrum', icon: 'layers' },
  { id: '10', name: 'Optimism', icon: 'layers' },
  { id: '137', name: 'Polygon', icon: 'layers' },
];

export default function BridgePage() {
  const { isConnected, address, provider, connect, balances: walletBalances, addTransaction, globalRates, fetchEthBalance, updateBalance } = useWallet();
  const { balance: rloBal, fetchBalance: fetchRloBalance } = useRLO();
  const [fromChain, setFromChain] = useState('1');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDeposit, setIsDeposit] = useState(true);

  const ethPrice = globalRates['ETH']?.['USDC'] || 3500;
  const receiveAmount = amount || '0.00';

  const balances = { ...walletBalances, RIALO: parseFloat(rloBal || '0') };

  const fromChainName = CHAINS.find(c => c.id === fromChain)?.name || 'Ethereum';
  const sourceBalance = isDeposit ? (balances['ETH'] || 0) : (balances['ETH_RIALO'] || 0);
  const destBalance = isDeposit ? (balances['ETH_RIALO'] || 0) : (balances['ETH'] || 0);

  const handleBridge = async () => {
    if (!isConnected) { connect(); return; }
    if (!amount || parseFloat(amount) <= 0) {
      setToast({ message: 'Enter an amount greater than 0', type: 'error' });
      return;
    }
    
    if (parseFloat(amount) > sourceBalance) {
      setToast({ message: `Insufficient ${isDeposit ? 'ETH' : 'Rialo L1'} balance`, type: 'error' });
      return;
    }

    setLoading(true);
    setToast({ message: isDeposit ? 'Initiating bridge (locking ETH)…' : 'Initiating withdraw (burning ETH on Rialo L1)…', type: 'loading' });
    try {
      const signer = await provider.getSigner();
      let tx;
      if (isDeposit) {
        tx = await signer.sendTransaction({
          to: '0x000000000000000000000000000000000000dEaD',
          value: ethers.parseEther(amount)
        });
      } else {
        tx = await signer.sendTransaction({
          to: address, // Send 0 ETH to self to trigger metamask for mock purposes
          value: 0
        });
      }
      
      const receipt = await tx.wait();
      const hash = receipt.hash;
      
      setToast({
        message: isDeposit ? `Bridge initiated! ${amount} ETH locked on Sepolia.` : `Withdraw initiated! ${amount} ETH returning to Sepolia.`,
        type: 'success',
        txHash: hash,
      });
      
      // Add to history
      addTransaction({
        type: 'Bridge',
        amount: isDeposit ? `${amount} ETH → Rialo L1` : `${amount} Rialo L1 → ETH`,
        details: isDeposit ? 'Cross-chain Bridge Out' : 'Cross-chain Bridge In',
        txHash: hash,
        source: 'Direct'
      });
      
      // Update balances
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
      
      if (updateBalance) {
        if (isDeposit) {
          updateBalance('ETH_RIALO', parseFloat(amount));
        } else {
          updateBalance('ETH_RIALO', -parseFloat(amount));
        }
      }
      
      setAmount('');

    } catch (err) {
      setToast({ message: err.reason || err.message || 'Bridge failed', type: 'error' });
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
          <p className="text-on-surface/60 max-w-md mx-auto">Seamlessly move your assets across networks. A simplified bridging experience designed to remove complexity</p>
        </div>

        {/* Bridge Card */}
        <div className="w-full max-w-[520px] bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

          {/* From */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">From</span>
              <span className="text-xs font-medium text-white/20">Balance: {sourceBalance?.toFixed(2) || '0.00'} ETH</span>
            </div>
            <div className="bg-[#161616] rounded-2xl p-6 flex items-center justify-between border border-white/5 focus-within:border-white/20 transition-all shadow-inner">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center p-2 overflow-hidden border border-white/10 ${isDeposit ? 'bg-white/5' : 'bg-white shadow-2xl'}`}>
                  {isDeposit ? (
                    CHAINS.find(c => c.id === fromChain)?.isImage ? (
                      <img src={CHAINS.find(c => c.id === fromChain)?.icon} className="w-full h-full object-contain p-2" alt="chain" />
                    ) : (
                      <span className="material-symbols-outlined text-white">
                        {CHAINS.find(c => c.id === fromChain)?.icon}
                      </span>
                    )
                  ) : (
                    <img src="/rialo-icon-new.png" className="w-full h-full object-contain" alt="Rialo" />
                  )}
                </div>
                <div className="flex flex-col">
                  {isDeposit ? (
                    <select
                      value={fromChain}
                      onChange={e => setFromChain(e.target.value)}
                      className="bg-transparent border-none p-0 text-white font-bold text-xl focus:ring-0 cursor-pointer appearance-none"
                    >
                      {CHAINS.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#0c0c0c] text-white">{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-white font-bold text-xl">ETH <span className="text-sm font-normal text-white/50">(Rialo L1)</span></span>
                  )}
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

          {/* Direction Icon Toggle */}
          <div className="flex justify-center -my-6 relative z-10 w-full">
            <button 
              onClick={() => setIsDeposit(!isDeposit)} 
              className="bg-[#0c0c0c] p-3 rounded-2xl shadow-xl border border-white/10 hover:scale-110 transition-transform cursor-pointer outline-none focus:outline-none"
            >
              <div className="text-white flex items-center justify-center">
                <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: isDeposit ? 'rotate(0deg)' : 'rotate(180deg)' }}>south</span>
              </div>
            </button>
          </div>

          {/* To */}
          <div className="space-y-4 mt-6 mb-10">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 font-label">To</span>
              <span className="text-xs font-medium text-white/20">Balance: {destBalance?.toFixed(2) || '0.00'} ETH</span>
            </div>
            <div className="bg-[#161616] rounded-2xl p-6 flex items-center justify-between border border-white/5 shadow-inner">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center p-2 overflow-hidden border border-white/10 ${!isDeposit ? 'bg-white/5' : 'bg-white shadow-2xl'}`}>
                  {!isDeposit ? (
                    CHAINS.find(c => c.id === fromChain)?.isImage ? (
                      <img src={CHAINS.find(c => c.id === fromChain)?.icon} className="w-full h-full object-contain p-2" alt="chain" />
                    ) : (
                      <span className="material-symbols-outlined text-white">
                        {CHAINS.find(c => c.id === fromChain)?.icon}
                      </span>
                    )
                  ) : (
                    <img src="/rialo-icon-new.png" className="w-full h-full object-contain" alt="Rialo L1 ETH" />
                  )}
                </div>
                <div className="flex flex-col">
                  {!isDeposit ? (
                    <span className="text-white font-bold text-xl">{fromChainName}</span>
                  ) : (
                    <span className="text-white font-bold text-xl">ETH <span className="text-sm font-normal text-white/50">(Rialo L1)</span></span>
                  )}
                  <span className="text-[10px] text-white/20 tracking-wider font-bold uppercase mt-1">Destination Chain</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-headline font-extrabold text-white/10">
                  {receiveAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="space-y-4 mb-10">
            {[
              ['1 ETH = 1 ETH', 'Rate'],
              ['Network Fee', '0.001 ETH'],
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
                <span className="material-symbols-outlined animate-spin text-xl">autorenew</span> {isDeposit ? 'Bridging…' : 'Withdrawing…'}
              </span>
            ) : !isConnected ? (
              'Connect Wallet'
            ) : amount && parseFloat(amount) > sourceBalance ? (
              `Insufficient ${isDeposit ? 'ETH' : 'Rialo L1'} Balance`
            ) : (
              isDeposit ? 'Bridge ETH to Rialo L1' : 'Withdraw ETH to Sepolia'
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
