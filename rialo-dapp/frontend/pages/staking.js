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
  const { isConnected, address, provider, connect, balances: walletBalances, addTransaction, fetchEthBalance, aiPrivateKey, setAiPrivateKey } = useWallet();
  const { balance: rloBal, fetchBalance: fetchRloBalance } = useRLO();
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
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setLocalSfsFraction(contractSfsFraction);
  }, [contractSfsFraction]);

  // --- SIMULATED METRICS (Left Column Calculator) ---
  const numRlo = parseFloat(rloAmount) || 0;
  const networkApy = 0.184; // 18.4% as per metrics
  const simulatedTotal = (isConnected ? stakedBalance : 0) + numRlo;
  const simulatedTotalYield = simulatedTotal * networkApy;
  
  const simulatedRawYieldToServiceCredits = simulatedTotal * networkApy * (localSfsFraction / 100);
  const simulatedYieldToWallet = simulatedTotalYield - simulatedRawYieldToServiceCredits;

  // --- REAL METRICS (Right Column Allocation) ---
  const realRawYieldToServiceCredits = (isConnected ? stakedBalance : 0) * networkApy * (contractSfsFraction / 100);
  const totalAllocated = activePaths.reduce((sum, path) => sum + path.amount, 0);
  const availableServiceCredits = Math.max(0, realRawYieldToServiceCredits - totalAllocated);

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
        type: 'Claim',
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
      console.error("Fraction update error:", e);
      const errorMsg = e.data?.message || e.reason || e.message || "Update failed";
      setToast({ message: errorMsg, type: "error" });
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
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen pb-10">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-16 relative">
        
        {/* Hero Section */}
        <header className="mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="material-symbols-outlined text-[10px]">account_balance</span>
            <span className="font-headline font-bold text-[9px] uppercase tracking-[0.2em]">SfS Yield Allocation</span>
          </div>
          <h1 className="font-headline text-[4.5rem] font-black leading-[0.9] tracking-tighter mb-8 bg-gradient-to-br from-white via-white to-emerald-500/40 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Stake For<br/>Service (SfS)
          </h1>
          <p className="font-body text-white/40 max-w-xl text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Allocate your RIALO yield directly to cover infrastructure costs. Our unique SfS model allows you to generate Service Credits to automate and secure your on-chain operations.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Dashboard Left Column: Calculator */}
          <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="bg-[#121212] rounded-[32px] p-10 border border-white/5 shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-[100px] group-hover:bg-emerald-500/10 transition-all duration-700"></div>
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-headline font-bold text-white text-xl">Allocation Console</h3>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${showSettings ? 'bg-emerald-500 text-on-primary border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/40 border-white/5 hover:border-emerald-500/30 hover:text-white'}`}
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  <span className="font-headline font-bold text-[9px] uppercase tracking-widest">Settings</span>
                </button>
              </div>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#121212] border border-white/20 rounded-2xl shadow-2xl p-6 z-50 text-left">
                <h3 className="font-headline font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-white text-sm">auto_fix</span>
                  AI Auto-Execution
                </h3>
                <p className="font-body text-[10px] text-white/40 mb-4 leading-relaxed">Enter a dedicated AI wallet private key to enable automated, non-custodial transaction execution through the agent.</p>
                <div>
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block">AI Wallet Secret</label>
                  <input 
                    type="password" 
                    placeholder="0x..."
                    value={aiPrivateKey || ''}
                    onChange={(e) => setAiPrivateKey(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-white/10 focus:border-white/50 outline-none transition-all"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/40 font-bold">RLO AMOUNT</label>
                  <button 
                    onClick={() => setRloAmount((balances['RIALO'] || 0).toString())}
                    className="font-headline font-bold text-[10px] text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-md transition-all uppercase tracking-widest border border-emerald-500/20"
                  >
                    MAX
                  </button>
                </div>
                <div className="bg-white/5 rounded-xl flex items-center px-4 py-3 border border-white/5 focus-within:border-white/20 transition-colors">
                  <span className="material-symbols-outlined text-white mr-4 text-2xl">local_fire_department</span>
                  <input
                    type="number"
                    value={rloAmount}
                    onChange={(e) => setRloAmount(e.target.value)}
                    className="bg-transparent font-headline font-extrabold text-3xl text-white outline-none w-full placeholder:text-white/10"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-4 mb-8">
                  <button 
                    onClick={handleStake}
                    disabled={stakingLoading}
                    className={`flex-1 bg-emerald-500 text-on-primary py-4 rounded-xl font-headline font-bold text-lg hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(16,185,129,0.2)] disabled:opacity-50 flex justify-center items-center gap-3`}
                  >
                    {stakingLoading ? 'Processing...' : 'Simulate Staking'}
                  </button>
                  {isConnected && stakedBalance > 0 && (
                    <button 
                      onClick={handleUnstake}
                      disabled={stakingLoading}
                      className="bg-[#161616] text-white px-6 rounded-xl font-headline font-bold text-sm border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50"
                      title="Unstake RLO"
                    >
                      Unstake
                    </button>
                  )}
              </div>
              
              <div className="bg-[#161616] rounded-xl p-6 border border-white/5 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-label text-[10px] font-bold uppercase tracking-widest text-white/40">
                    SfS Routing Fraction (<span className="text-white">ϕ</span>)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-on-primary text-sm bg-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                      {localSfsFraction}%
                    </span>
                    {localSfsFraction !== contractSfsFraction && (
                      <button 
                        onClick={handleUpdateFraction}
                        disabled={isUpdatingFraction}
                        className="text-[9px] font-bold text-white/70 hover:text-white uppercase tracking-widest border border-white/30 px-2 py-1 rounded transition-all"
                      >
                        {isUpdatingFraction ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={localSfsFraction} 
                  onChange={(e) => setLocalSfsFraction(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SfS Router */}
          <div className="lg:col-span-8 flex flex-col gap-10 animate-in fade-in slide-in-from-right-4 duration-1000">
            {/* Simulation Preview Card */}
            <div className="bg-[#121212] rounded-[32px] p-10 border border-white/10 shadow-3xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent)] pointer-events-none"></div>
              
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h3 className="font-headline font-bold text-white text-xl mb-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">analytics</span> Yield Allocation Projection
                  </h3>
                  <div className="space-y-8">
                    <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5">
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.25em] mb-3">Total sRLO Position</p>
                      <p className="font-headline text-4xl font-black text-white tracking-tighter">
                        {simulatedTotal.toLocaleString()} <span className="text-emerald-500/80">RLO</span>
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40">SfS Credits Allocation ({localSfsFraction}%)</span>
                        <span className="font-headline font-bold text-emerald-400">-{simulatedRawYieldToServiceCredits.toFixed(2)} Credits</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/40">Liquid RIALO Yield ({100 - localSfsFraction}%)</span>
                        <span className="font-headline font-bold text-white">{simulatedYieldToWallet.toFixed(2)} RLO/yr</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="bg-emerald-500/5 rounded-3xl p-10 border border-emerald-500/10 flex flex-col items-center justify-center text-center group-hover:bg-emerald-500/10 transition-all duration-500">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-black mb-6 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <span className="material-symbols-outlined text-2xl font-black">savings</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.25em] mb-2 font-headline">Total Estimated Yield</p>
                    <p className="font-headline text-5xl font-black text-white tracking-tighter">
                       ~{(simulatedTotalYield).toFixed(2)} <span className="text-2xl text-white/20">Credits</span>
                    </p>
                    <p className="text-[11px] text-white/40 mt-6 max-w-[200px]">Combined value of liquid rewards and service credits</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1c1c] rounded-[32px] p-10 border border-white/10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="font-headline font-bold text-white text-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-white">route</span> SfS Router: Sponsorship
                </h3>
                <div className="bg-white/5 rounded-full px-6 py-3 border border-white/5">
                  <span className="font-label text-[10px] uppercase tracking-widest text-white/40 font-bold mr-4">Available Credits</span>
                  <span className="font-headline font-extrabold text-xl text-white">{availableServiceCredits.toFixed(2)}</span>
                </div>
              </div>

              <div className="mb-10">
                <div className="space-y-4 flex flex-col items-stretch">
                  <input 
                    type="text" 
                    value={sponsorAddress}
                    onChange={(e) => setSponsorAddress(e.target.value)}
                    placeholder="Enter wallet/Contract Address" 
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-5 py-4 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all" 
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="number" 
                      value={sponsorAmount}
                      onChange={(e) => setSponsorAmount(e.target.value)}
                      placeholder="Credits to allocate" 
                      className="w-full sm:w-1/3 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-4 text-sm font-headline font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all" 
                    />
                    <button 
                      onClick={handleCreatePath}
                      disabled={isAddingPath}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-on-primary rounded-xl px-4 py-4 font-headline font-bold text-sm transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    >
                      {isAddingPath ? (
                        <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                      ) : (
                        <>
                          <span className="text-on-primary font-extrabold text-lg mr-1 leading-none">+</span> Add to Router Path
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-grow">
                <label className="font-headline font-bold text-xs text-white/50 mb-4 px-1 flex items-center gap-2 tracking-widest uppercase">
                  <span className="material-symbols-outlined text-[14px]">moving</span> ACTIVE SPONSORED PATHS
                </label>
                <div className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden">
                  {activePaths.length === 0 ? (
                    <div className="py-10 text-center text-white/30 text-[11px] font-body italic flex justify-center items-center gap-2">
                       <span className="material-symbols-outlined text-sm opacity-50">route</span> No active sponsor paths.
                    </div>
                  ) : (
                    activePaths.map((path, index) => (
                      <div key={index} className="flex justify-between items-center px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                            <span className="material-symbols-outlined text-[12px] text-white/40">alt_route</span>
                          </div>
                          <span className="font-mono text-[12px] text-white/70">{path.address.slice(0,6)}...{path.address.slice(-4)}</span>
                        </div>
                        <span className="font-headline text-[12px] font-bold text-on-primary bg-emerald-500 px-3 py-1.5 rounded-lg shadow-sm">
                          {path.amount.toFixed(2)} Credits/yr
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Claim Rewards inside the box if any */}
              {pendingRewards > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                  <div>
                    <span className="font-label text-[9px] uppercase tracking-widest text-white/40 block mb-1">Claimable Staking Rewards</span>
                    <span className="font-headline font-bold text-white text-lg">{pendingRewards.toFixed(4)} RLO</span>
                  </div>
                  <button 
                    onClick={handleClaim}
                    disabled={stakingLoading}
                    className="text-xs font-bold text-white/70 hover:text-white border border-white/30 hover:border-white/50 px-4 py-2 rounded-lg transition-all"
                  >
                    Claim
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Protocol Metrics Layout Bar */}
        <div className="w-full mt-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex justify-between items-end mb-4 px-2">
            <h3 className="font-headline font-bold text-sm text-emerald-500/60 uppercase tracking-widest">Rialo Protocol Statistics</h3>
            <button onClick={() => router.push('/dashboard')} className="font-body text-xs text-white/30 hover:underline hover:text-emerald-500 transition-colors">View on Explorer</button>
          </div>
          <div className="bg-[#121212] rounded-[16px] border border-white/5 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center shadow-2xl">
            <div className="flex-1 w-full md:border-r border-white/5 md:px-6 px-0 py-4 md:py-0 first:pl-2 last:pr-2 last:border-0 border-b md:border-b-0">
              <div className="font-body text-[11px] text-white/40 mb-1">Total staked with Rialo</div>
              <div className="font-headline font-extrabold text-2xl text-white tracking-tight">
                {totalProtocolStaked.toLocaleString()} <span className="text-[10px] text-white/20 font-normal ml-1">RLO</span>
              </div>
            </div>
            <div className="flex-1 w-full md:border-r border-white/5 md:px-6 px-0 py-4 md:py-0 first:pl-2 last:pr-2 last:border-0 border-b md:border-b-0">
              <div className="font-body text-[11px] text-white/40 mb-1">Active SfS Routers</div>
              <div className="font-headline font-extrabold text-2xl text-white tracking-tight">12,400</div>
            </div>
            <div className="flex-1 w-full md:px-6 px-0 pt-4 md:pt-0">
              <div className="font-body text-[11px] text-white/40 mb-1">Total Service Credits Minted</div>
              <div className="font-headline font-extrabold text-2xl text-white tracking-tight">350,000</div>
            </div>
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
