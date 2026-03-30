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
        
        {/* Top Header Row for AI Settings */}
        <div className="flex justify-end mb-8 relative z-50 animate-in fade-in">
          <div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${showSettings ? 'bg-white text-black border-white' : 'bg-[#121212] text-white/80 border-black/10 hover:border-black/20 shadow-sm'}`}
            >
              <span className="material-symbols-outlined text-sm">settings</span>
              <span className="font-headline font-bold text-[10px] uppercase tracking-widest">AI Agent Settings</span>
            </button>
            
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
          </div>
        </div>

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch mb-16">
          
          {/* LEFT COLUMN: Stake RLO */}
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="text-center mb-8">
              <h1 className="font-headline font-extrabold text-white text-3xl tracking-tighter mb-2">Stake RLO</h1>
              <p className="font-body text-white/60 text-sm max-w-sm mx-auto">Stake RLO, receive sRLO, and fund your transactions via SfS.</p>
            </div>

            <div className="bg-[#1c1c1c] rounded-[24px] p-8 border border-white/10 shadow-2xl relative flex-grow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-20 border-t border-white/10 rounded-t-[24px]"></div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-label text-[10px] uppercase tracking-widest text-white/40 font-bold">RLO AMOUNT</label>
                  <button 
                    onClick={() => setRloAmount((balances['RIALO'] || 0).toString())}
                    className="font-headline font-bold text-[10px] text-black bg-white hover:bg-white/90 px-3 py-1 rounded-md transition-all uppercase tracking-widest"
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
                <div className="mt-4 flex flex-col gap-1 px-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">On-Chain Stake:</span>
                    <span className="text-[10px] text-white font-bold">{stakedBalance.toFixed(2)} RRIALO</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Synced Phi (Fraction):</span>
                    <span className="text-[10px] text-white font-bold">{contractSfsFraction}%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-8">
                  <button 
                    onClick={handleStake}
                    disabled={stakingLoading}
                    className={`flex-1 bg-white text-black py-4 rounded-xl font-headline font-bold text-lg hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50 flex justify-center items-center gap-3`}
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
                    SfS Routing Fraction (ϕ)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-black text-sm bg-white/90 px-2 py-0.5 rounded border border-white/10">
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
                <p className="font-body text-[11px] text-white/40 mb-5 leading-relaxed">
                  Route a percentage of your yield to the <span className="text-white border-b border-white/20 border-dashed">ServicePaymaster</span> for gas costs.
                </p>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={localSfsFraction} 
                  onChange={(e) => setLocalSfsFraction(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
                />
                <div className="flex justify-between text-[9px] text-white/30 mt-3 font-bold uppercase tracking-widest font-label">
                  <span>0% All Native</span>
                  <span>100% All Gas</span>
                </div>
              </div>

              <div className="space-y-4 px-1 mx-2 pt-2 text-[12px] font-body">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-white/40 font-medium">You will receive</span>
                  <span className="font-headline font-bold text-white">{numRlo.toLocaleString()} sRLO</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-white/40 font-medium">Network APY</span>
                  <span className="font-headline font-bold text-emerald-400">18.4%</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-white/40 font-medium flex items-center gap-1.5">Yield to Wallet <span className="material-symbols-outlined text-[12px] opacity-60">info</span></span>
                  <span className="font-headline font-bold text-white">{simulatedYieldToWallet.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-[10px] text-white/30 font-medium">RLO/yr</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 font-medium flex items-center gap-1.5">Total Yield Router <span className="material-symbols-outlined text-[12px] opacity-60">info</span></span>
                  <span className="font-headline font-bold text-white">{simulatedRawYieldToServiceCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-[10px] text-white/50 font-medium">Credits/yr</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SfS Router */}
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="text-center mb-8">
              <h1 className="font-headline font-extrabold text-white text-3xl tracking-tighter mb-2 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-white text-3xl">route</span>
                SfS Router: Sponsorship
              </h1>
              <p className="font-body text-white/60 text-sm max-w-sm mx-auto">Manage your Service Credits and sponsor external addresses.</p>
            </div>

            <div className="bg-[#1c1c1c] rounded-[24px] p-8 border border-white/10 shadow-2xl relative flex-grow">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-20 border-t border-white/10 rounded-t-[24px]"></div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8 flex justify-between items-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[12px] text-white/40">info</span>
                    <label className="font-label text-[10px] uppercase tracking-widest text-white/40 font-bold block">AVAILABLE SERVICE CREDITS</label>
                  </div>
                  <div className="font-headline font-extrabold text-3xl text-white tracking-tighter flex items-end gap-2">
                    {availableServiceCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    <span className="font-label text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5">Credits/yr</span>
                  </div>
                </div>
                <div className="relative z-10 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                  <span className="material-symbols-outlined text-white text-2xl">water_drop</span>
                </div>
              </div>

              <div className="mb-10">
                <div className="flex justify-between items-center mb-4 px-1">
                  <label className="font-headline font-bold text-sm text-white">Create Sponsorship Path</label>
                  <span className="font-body text-[10px] text-white/40 tracking-wider">Allocated: {totalAllocated.toFixed(2)}</span>
                </div>
                <div className="space-y-4 flex flex-col items-stretch">
                  <input 
                    type="text" 
                    value={sponsorAddress}
                    onChange={(e) => setSponsorAddress(e.target.value)}
                    placeholder="Enter wallet/Contract Address" 
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-5 py-3 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all shadow-inner" 
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="number" 
                      value={sponsorAmount}
                      onChange={(e) => setSponsorAmount(e.target.value)}
                      placeholder="Credits to allocate" 
                      className="w-full sm:w-1/3 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-headline font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all shadow-inner" 
                    />
                    <button 
                      onClick={handleCreatePath}
                      disabled={isAddingPath}
                      className="flex-1 bg-white hover:bg-white/90 text-black rounded-xl px-4 py-3 font-headline font-bold text-sm transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 shadow-md"
                    >
                      {isAddingPath ? (
                        <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                      ) : (
                        <>
                          <span className="text-black font-extrabold text-lg mr-1 leading-none">+</span> Add to Router Path
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
                <div className="bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
                  {activePaths.length === 0 ? (
                    <div className="py-6 text-center text-white/30 text-[11px] font-body italic flex justify-center items-center gap-2">
                       <span className="material-symbols-outlined text-sm opacity-50">route</span> No active sponsor paths.
                    </div>
                  ) : (
                    activePaths.map((path, index) => (
                      <div key={index} className="flex justify-between items-center px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                            <span className="material-symbols-outlined text-[10px] text-white/40">alt_route</span>
                          </div>
                          <span className="font-mono text-[11px] text-white/70">{path.address.slice(0,6)}...{path.address.slice(-4)}</span>
                        </div>
                        <span className="font-headline text-[11px] font-bold text-black bg-white/90 px-2 py-1 rounded">
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
            <h3 className="font-headline font-bold text-sm text-black">Rialo Protocol Statistics</h3>
            <button onClick={() => router.push('/dashboard')} className="font-body text-xs text-black/40 hover:underline hover:text-black/80 transition-colors">View on Explorer</button>
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
