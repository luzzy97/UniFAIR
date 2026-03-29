import { useState, useEffect } from "react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';
import { useStaking } from '../hooks/useStaking';
import { useRouter } from 'next/router';

export default function StakingPage() {
  const router = useRouter();
  const { isConnected, connect, balances: walletBalances, addTransaction } = useWallet();
  const { balance: rloBal } = useRLO();
  const { 
    stakedBalance: stakedBalStr, 
    pendingRewards: pendingRewStr, 
    totalStaked: totalProtStakedStr, 
    sfsFraction: contractSfsFraction,
    sponsorshipPaths: activePaths,
    loading: stakingLoading, 
    stake: stakeAction, 
    withdraw: withdrawAction, 
    claimRewards: claimAction,
    updateSfsFraction,
    addSponsorshipPath
  } = useStaking();

  const balances = { ...walletBalances, RIALO: parseFloat(rloBal || '0') };
  const stakedBalance = parseFloat(stakedBalStr || '0');
  const pendingRewards = parseFloat(pendingRewStr || '0');
  const totalProtocolStaked = parseFloat(totalProtStakedStr || '1450200');

  // Toast (Using standard project Toast)
  const [toast, setToast] = useState(null);

  // Staking input state
  const [rloAmount, setRloAmount] = useState('');
  const [localSfsFraction, setLocalSfsFraction] = useState(50);
  const [sponsorAddress, setSponsorAddress] = useState('');
  const [sponsorAmount, setSponsorAmount] = useState('');
  const [isUpdatingFraction, setIsUpdatingFraction] = useState(false);
  const [isAddingPath, setIsAddingPath] = useState(false);

  useEffect(() => {
    setLocalSfsFraction(contractSfsFraction);
  }, [contractSfsFraction]);

  const numRlo = parseFloat(rloAmount) || 0;
  const networkApy = 0.184; // 18.4% as per metrics
  const totalYield = (isConnected ? (stakedBalance + numRlo) : numRlo) * networkApy;
  
  const rawYieldToServiceCredits = (isConnected ? stakedBalance : 0) * networkApy * (localSfsFraction / 100);
  const yieldToWallet = (isConnected ? stakedBalance : 0) * networkApy - rawYieldToServiceCredits;

  const totalAllocated = activePaths.reduce((sum, path) => sum + path.amount, 0);
  const availableServiceCredits = Math.max(0, rawYieldToServiceCredits - totalAllocated);

  const handleStake = async () => {
    if (!isConnected) { connect(); return; }
    if (numRlo < 10) {
      setToast({ message: "Minimum staking amount is 10 RIALO", type: "error" });
      return;
    }
    const currentBalance = balances['RIALO'] || 0;
    if (numRlo > currentBalance) {
      setToast({ message: "Insufficient RIALO balance", type: "error" });
      return;
    }
    
    setToast({ message: "Submitting staking transaction...", type: "loading" });
    try {
      const hash = await stakeAction(rloAmount);
      setToast({ message: `Successfully staked ${numRlo.toLocaleString()} RLO!`, type: "success", txHash: hash });
      setRloAmount("");
      addTransaction({
        type: 'Stake',
        amount: `${numRlo} RIALO`,
        details: 'SfS Staking',
        txHash: hash,
        source: 'Direct'
      });
      // Refresh balances from chain after confirmation
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
    } catch (e) {
      setToast({ message: e.reason || e.message || "Staking failed", type: "error" });
    }
  };

  const handleUnstake = async () => {
    if (!isConnected) { connect(); return; }
    if (stakedBalance <= 0) {
      setToast({ message: "No RLO staked", type: "error" });
      return;
    }
    setToast({ message: "Submitting unstaking transaction...", type: "loading" });
    try {
      const hash = await withdrawAction(stakedBalStr);
      setToast({ message: `Successfully unstaked ${stakedBalance.toFixed(2)} RLO!`, type: "success", txHash: hash });
      addTransaction({
        type: 'Unstake',
        amount: `${stakedBalance.toFixed(2)} RIALO`,
        details: 'SfS Unstaking',
        txHash: hash,
        source: 'Direct'
      });
      // Refresh balances from chain after confirmation
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
    } catch (e) {
      setToast({ message: e.reason || e.message || "Unstaking failed", type: "error" });
    }
  };

  const handleClaim = async () => {
    if (!isConnected) { connect(); return; }
    if (pendingRewards <= 0) {
      setToast({ message: "No rewards to claim", type: "error" });
      return;
    }
    setToast({ message: "Claiming rewards...", type: "loading" });
    try {
      const hash = await claimAction();
      setToast({ message: "Rewards claimed successfully!", type: "success", txHash: hash });
      addTransaction({
        type: 'Claim Rewards',
        amount: `${pendingRewards.toFixed(2)} RIALO`,
        details: 'Staking Rewards',
        txHash: hash,
        source: 'Direct'
      });
      // Refresh balances from chain after confirmation
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
    } catch (e) {
      setToast({ message: e.reason || e.message || "Claim failed", type: "error" });
    }
  };

  const handleUpdateFraction = async () => {
    if (!isConnected) { connect(); return; }
    setIsUpdatingFraction(true);
    setToast({ message: "Syncing SfS Fraction with blockchain...", type: "loading" });
    try {
      const hash = await updateSfsFraction(localSfsFraction);
      setToast({ message: "SfS Fraction updated successfully!", type: "success", txHash: hash });
      // Refresh balances from chain after confirmation
      if (address && provider) {
        fetchEthBalance(address, provider);
        fetchRloBalance();
      }
    } catch (e) {
      setToast({ message: e.reason || e.message || "Update failed", type: "error" });
    } finally {
      setIsUpdatingFraction(false);
    }
  };

  const handleCreatePath = async () => {
    if (!isConnected) { connect(); return; }
    if (!sponsorAddress) {
      setToast({ message: "Please enter a valid address", type: "error" });
      return;
    }
    const amountVal = parseFloat(sponsorAmount) || 0;
    if (amountVal <= 0) {
      setToast({ message: "Please enter a valid amount", type: "error" });
      return;
    }

    setIsAddingPath(true);
    setToast({ message: "Creating sponsorship path on-chain...", type: "loading" });
    try {
      const hash = await addSponsorshipPath(sponsorAddress, amountVal);
      setToast({ message: "Sponsorship path added successfully!", type: "success", txHash: hash });
      setSponsorAddress("");
      setSponsorAmount("");
    } catch (e) {
      setToast({ message: e.reason || e.message || "Failed to create path", type: "error" });
    } finally {
      setIsAddingPath(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-20">
        
        {/* Header - Matching Swap. style */}
        <div className="mb-20 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="font-headline font-extrabold tracking-tighter text-primary mb-4" style={{ fontSize: '3.5rem' }}>Stake.</h1>
          <p className="font-body text-on-surface/50 max-w-xl mx-auto">Precise liquidity for the architectural void. Stake RLO, receive stRLO, and fund your transactions via Service for Staking (SfS).</p>
        </div>

        {/* Statistics Cards at the Top */}
        <div className="mb-20 animate-in fade-in slide-in-from-top-2 duration-700 delay-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/10">
               <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-4 block">Total Protocol Staked</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-headline font-extrabold text-white text-4xl tracking-tighter text-emerald-400">{totalProtocolStaked.toLocaleString()}</span>
                 <span className="font-label text-[10px] text-white/20 font-bold uppercase tracking-widest">RLO</span>
               </div>
            </div>
            
            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/10">
               <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-4 block">Network APY</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-headline font-extrabold text-white text-4xl tracking-tighter">18.4</span>
                 <span className="font-label text-[10px] text-white/20 font-bold uppercase tracking-widest">%</span>
               </div>
            </div>

            <div className="bg-[#0c0c0c] rounded-2xl p-8 shadow-2xl border border-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/10">
               <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-4 block">Personal Staked</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-headline font-extrabold text-white text-4xl tracking-tighter">{isConnected ? stakedBalance.toFixed(2) : '0.00'}</span>
                 <span className="font-label text-[10px] text-white/20 font-bold uppercase tracking-widest">RLO</span>
               </div>
               {!isConnected && (
                  <button onClick={connect} className="mt-2 text-[10px] font-bold text-primary hover:text-primary/70 underline underline-offset-4 uppercase tracking-[0.2em] transition-colors">Connect Wallet</button>
               )}
            </div>
          </div>
        </div>

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-20">
          
          {/* LEFT COLUMN: Stake RLO */}
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
            <div className="bg-[#0c0c0c] rounded-2xl p-10 shadow-2xl border border-white/5 relative overflow-hidden group/card hover:border-white/10 transition-colors duration-500">
              <div className="space-y-6">
                <div>
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4 block">Stake Rialo</span>
                  <div className="bg-[#161616] rounded-2xl p-6 flex flex-col border border-white/5 focus-within:border-white/20 transition-all shadow-inner">
                    <label className="font-label text-[10px] text-white/20 mb-2 font-bold uppercase tracking-widest">RLO amount</label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-grow">
                        <img src="/rialo-icon.png" className="w-8 h-8 object-contain mr-3" alt="RLO" />
                        <input
                          type="number"
                          value={rloAmount}
                          onChange={(e) => setRloAmount(e.target.value)}
                          className="bg-transparent text-4xl font-headline font-extrabold text-white outline-none w-full placeholder:text-white/5"
                          placeholder="0.0"
                        />
                      </div>
                      <button 
                        onClick={() => setRloAmount((balances['RIALO'] || 0).toString())}
                        className="font-headline font-bold text-[11px] text-black bg-white hover:bg-white/90 px-4 py-2 rounded-xl transition-all uppercase tracking-widest shadow-md"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#161616] rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                      SfS Routing Fraction (ϕ)
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-headline font-bold text-white bg-white/10 px-3 py-1 rounded-lg text-sm">
                        {localSfsFraction}%
                      </span>
                      {localSfsFraction !== contractSfsFraction && (
                        <button 
                          onClick={handleUpdateFraction}
                          disabled={isUpdatingFraction}
                          className="text-[10px] font-bold text-primary hover:text-primary/70 uppercase tracking-widest border border-primary/20 px-2 py-1 rounded-md transition-all"
                        >
                          {isUpdatingFraction ? 'Syncing...' : 'Sync'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="font-body text-xs text-white/40 mb-6 leading-relaxed">
                    Route a percentage of your yield to the <span className="text-white font-bold border-b border-white/20">ServicePaymaster</span> to automate gas costs.
                  </p>
                  
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={localSfsFraction} 
                    onChange={(e) => setLocalSfsFraction(Number(e.target.value))}
                    className="w-full h-1 bg-[#0c0c0c] rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                  />
                  <div className="flex justify-between text-[9px] text-white/20 mt-3 font-bold uppercase tracking-widest font-label">
                    <span>100% Wallet</span>
                    <span>100% Gas Credits</span>
                  </div>
                </div>

                <div className="space-y-4 px-2">
                  <div className="flex justify-between items-center">
                    <span className="font-label text-[10px] font-bold uppercase tracking-widest text-white/30">Estimated APR</span>
                    <span className="font-headline font-bold text-emerald-400 bg-emerald-400/5 px-2.5 py-1 rounded text-xs tracking-tighter">18.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label text-[10px] font-bold uppercase tracking-widest text-white/30">Total Yield</span>
                    <span className="font-headline font-extrabold text-white tracking-tight">
                      {totalYield.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-white/20 text-[9px] uppercase">RLO/yr</span>
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={handleStake}
                    disabled={stakingLoading}
                    className={`flex-1 bg-white text-black py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 flex justify-center items-center gap-3`}
                  >
                    {stakingLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-xl">autorenew</span>
                        Processing…
                      </>
                    ) : !isConnected ? (
                      'Connect Wallet'
                    ) : (
                      "Stake"
                    )}
                  </button>
                  {isConnected && stakedBalance > 0 && (
                    <button 
                      onClick={handleUnstake}
                      disabled={stakingLoading}
                      className="flex-1 bg-[#161616] text-white py-5 rounded-2xl font-headline font-extrabold text-lg tracking-tight border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Unstake
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SfS Router */}
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="bg-[#0c0c0c] rounded-2xl p-10 shadow-2xl border border-white/5 relative overflow-hidden group/card hover:border-white/10 transition-colors duration-500 min-h-full">
              <div className="space-y-8 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-extrabold text-2xl text-white flex items-center gap-3">
                    <span className="material-symbols-outlined text-white text-3xl">alt_route</span>
                    SfS Router
                  </h3>
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-white/40 text-xl">info</span>
                  </div>
                </div>

                <div className="bg-[#161616] rounded-2xl p-8 border border-white/5 shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 block">Claimable Rewards</span>
                    <button 
                      onClick={handleClaim}
                      disabled={stakingLoading || pendingRewards <= 0}
                      className="text-[10px] font-bold text-primary hover:text-primary/70 uppercase tracking-widest disabled:opacity-30 transition-all"
                    >
                      Claim All
                    </button>
                  </div>
                  <div className="font-headline font-extrabold text-4xl text-white tracking-tighter flex items-baseline gap-3">
                    {pendingRewards.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})} 
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">RLO</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 block px-1">Create Sponsorship Allocation</span>
                  <div className="flex flex-col gap-4">
                    <input 
                      type="text" 
                      value={sponsorAddress}
                      onChange={(e) => setSponsorAddress(e.target.value)}
                      placeholder="Destination Address (0x...)" 
                      className="w-full bg-[#161616] border border-white/5 rounded-2xl px-6 py-4 text-sm font-body text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all"
                    />
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input 
                        type="number" 
                        value={sponsorAmount}
                        onChange={(e) => setSponsorAmount(e.target.value)}
                        placeholder="Allocation Amount" 
                        className="flex-grow bg-[#161616] border border-white/5 rounded-2xl px-6 py-4 text-white font-headline font-bold placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all"
                      />
                      <button 
                        onClick={handleCreatePath}
                        disabled={isAddingPath}
                        className={`sm:min-w-[160px] bg-white text-black py-4 px-6 rounded-2xl font-headline font-extrabold text-sm tracking-tight hover:bg-white/90 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2`}
                      >
                        {isAddingPath ? (
                          <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">add</span>
                            Create Path
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-grow pt-4">
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-6 block">Active Router Paths</span>
                  <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {activePaths.length === 0 ? (
                      <div className="py-12 text-center text-white/20 text-sm font-medium italic border-2 border-dashed border-white/5 rounded-2xl">No sponsorship paths active.</div>
                    ) : (
                      activePaths.map((path, index) => (
                        <div key={index} className="px-5 py-4 bg-[#161616] rounded-2xl flex items-center justify-between hover:bg-[#1c1c1c] transition-colors border border-white/5 group">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-white/20 text-lg">alt_route</span>
                            </div>
                            <div className="overflow-hidden">
                              <span className="font-mono text-white text-xs block mb-0.5 truncate">{path.address}</span>
                              <span className="font-label text-[9px] font-bold uppercase tracking-widest text-white/10">Active Contract Path</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-headline font-extrabold text-white block leading-none">{path.amount.toFixed(2)}</span>
                            <span className="font-label text-[9px] font-bold uppercase tracking-widest text-white/10 mt-1 block">RLO Allocated</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Metrics Grid */}
        <div className="pt-20 border-t border-white/5">
           <div className="flex items-center justify-between mb-12">
             <h2 className="font-headline font-extrabold text-3xl text-primary flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-4xl">analytics</span>
                Protocol Metrics
             </h2>
             <button 
               onClick={() => router.push('/dashboard')}
               className="flex items-center gap-2 font-headline font-bold text-[10px] text-primary/60 uppercase tracking-widest hover:text-primary transition-colors group"
             >
               View Explorer
               <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Routers', value: '1,240,842' },
                { label: 'Total Credits', value: '840.2M' },
                { label: 'Validator Nodes', value: '448' },
                { label: 'Governance', value: '124' }
              ].map((stat, i) => (
                <div key={i} className="bg-surface-container-low/50 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                   <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface/40 mb-3">{stat.label}</p>
                   <p className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">{stat.value}</p>
                </div>
              ))}
           </div>
        </div>

      </main>

      <Footer />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
