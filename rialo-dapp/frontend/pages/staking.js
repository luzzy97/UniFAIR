import { useState, useEffect } from "react";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';

export default function StakingPage() {
  const { isConnected, connect, stakedBalance, updateBalance, updateStakedBalance, addTransaction } = useWallet();
  const [rloAmount, setRloAmount] = useState("1000");
  const [sfsFraction, setSfsFraction] = useState(25);
  
  // Interactive States
  const [isStaking, setIsStaking] = useState(false);
  const [isAddingPath, setIsAddingPath] = useState(false);
  
  // Simulation: using a totalStaked state instead of a constant for realism
  const [totalProtocolStaked, setTotalProtocolStaked] = useState(1450200);
  
  const [sponsorAddress, setSponsorAddress] = useState("");
  const [sponsorAmount, setSponsorAmount] = useState("");
  const [sponsoredPaths, setSponsoredPaths] = useState([
    { address: "0x71C...9A4", amount: 5.00 }
  ]);

  // Toast (Local state to match new staking layout)
  const [toast, setToast] = useState(null);

  const numRlo = parseFloat(rloAmount) || 0;
  const networkApy = 0.18; // 18% as per design
  const totalYield = (isConnected ? (stakedBalance + numRlo) : numRlo) * networkApy;
  
  const rawYieldToServiceCredits = (isConnected ? stakedBalance : 0) * networkApy * (sfsFraction / 100);
  const yieldToWallet = (isConnected ? stakedBalance : 0) * networkApy - rawYieldToServiceCredits;

  const totalAllocated = sponsoredPaths.reduce((sum, path) => sum + path.amount, 0);
  const availableServiceCredits = Math.max(0, rawYieldToServiceCredits - totalAllocated);

  // Clear toast after 3s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleStake = () => {
    if (!isConnected) { connect(); return; }
    if (numRlo <= 0) {
      setToast({ message: "Please enter a valid RLO amount", type: "error" });
      return;
    }
    setIsStaking(true);
    setTimeout(() => {
      setTotalProtocolStaked(prev => prev + numRlo);
      updateBalance('RIALO', -numRlo);
      updateStakedBalance(numRlo);
      setIsStaking(false);
      setToast({ message: `Successfully staked ${numRlo.toLocaleString()} RLO!`, type: "success" });
      
      addTransaction({
        type: 'Stake',
        amount: `${numRlo} RIALO`,
        details: 'SfS Staking',
        txHash: '0x789...012',
        source: 'Direct'
      });
    }, 2000);
  };

  const handleAddSponsor = () => {
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
    if (amountVal > availableServiceCredits) {
      setToast({ message: "Amount exceeds available Service Credits", type: "error" });
      return;
    }

    setIsAddingPath(true);
    setTimeout(() => {
      setSponsoredPaths(prev => [...prev, { address: sponsorAddress, amount: amountVal }]);
      setSponsorAddress("");
      setSponsorAmount("");
      setIsAddingPath(false);
      setToast({ message: "Sponsorship path added successfully!", type: "success" });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-orange-500/30 relative">
      <Navbar />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'} backdrop-blur-md border border-white/10`}>
          <span className="material-symbols-outlined text-white">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto mt-12 md:mt-20 px-4 pb-20">
        
        {/* Statistics Cards (Shared, Full Width) at the Top */}
        <div className="mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1E1E1E] rounded-[1.25rem] p-8 shadow-2xl border border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700">
               <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 block">Total Protocol Staked</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-extrabold text-white text-4xl tracking-tighter transition-all text-emerald-400">{totalProtocolStaked.toLocaleString()}</span>
                 <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">RLO</span>
               </div>
            </div>
            
            <div className="bg-[#1E1E1E] rounded-[1.25rem] p-8 shadow-2xl border border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700">
               <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 block">Network APY</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-extrabold text-white text-4xl tracking-tighter">18.4</span>
                 <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">%</span>
               </div>
            </div>

            <div className="bg-[#1E1E1E] rounded-[1.25rem] p-8 shadow-2xl border border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700">
               <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-4 block">Personal Staked</span>
               <div className="flex items-baseline gap-2">
                 <span className="font-extrabold text-white text-4xl tracking-tighter">{isConnected ? stakedBalance.toFixed(2) : '0.00'}</span>
                 <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">RLO</span>
               </div>
               {!isConnected && (
                  <button onClick={connect} className="mt-2 text-[10px] font-bold text-orange-500 underline underline-offset-4 uppercase tracking-[0.2em] hover:text-orange-400 transition-colors">Connect Wallet</button>
               )}
            </div>
          </div>
        </div>

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT COLUMN: Stake RLO */}
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
            <div className="mb-8">
              <h1 className="text-[2.5rem] md:text-[2.75rem] font-extrabold mb-3 tracking-tight text-white drop-shadow-sm">Stake RLO</h1>
              <p className="text-slate-400 text-sm md:text-base font-medium">Stake RLO, receive stRLO, and fund your transactions via Service for Staking (SfS).</p>
            </div>

            <div className="bg-[#1E1E1E] rounded-3xl p-5 md:p-8 shadow-2xl border border-slate-800/80 mb-8 relative overflow-hidden backdrop-blur-xl group/card hover:border-slate-700/80 transition-colors duration-500">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 opacity-90"></div>

              <div className="bg-slate-950/60 rounded-2xl p-4 md:p-6 mb-6 border border-slate-800/80 flex items-center justify-between focus-within:ring-1 focus-within:ring-orange-500/50 transition-all shadow-inner">
                <div className="flex flex-col flex-grow">
                  <label className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">RLO amount</label>
                  <div className="flex items-center">
                    <span className="material-symbols-outlined text-orange-500 mr-3 text-3xl">water_drop</span>
                    <input
                      type="number"
                      value={rloAmount}
                      onChange={(e) => setRloAmount(e.target.value)}
                      className="bg-transparent text-2xl md:text-4xl font-bold text-white outline-none w-full placeholder-slate-700"
                      placeholder="0.0"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setRloAmount("10000")}
                  className="text-[11px] font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 rounded-xl transition-colors ml-4 uppercase tracking-widest border border-orange-500/20"
                >
                  MAX
                </button>
              </div>

              <button 
                onClick={handleStake}
                disabled={isStaking}
                className={`w-full font-bold py-5 rounded-2xl mb-8 transition-all shadow-[0_4px_24px_rgba(0,163,255,0.25)] text-lg flex justify-center items-center gap-3
                  ${isStaking ? 'bg-slate-700 text-slate-300 shadow-none cursor-not-allowed' : 'bg-[#00A3FF] hover:bg-[#0092E6] text-white hover:shadow-[0_6px_30px_rgba(0,163,255,0.35)] hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isStaking ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">autorenew</span>
                    Staking...
                  </>
                ) : (
                  "Confirm Staking"
                )}
              </button>

              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-6 mb-8 border border-white/5 text-sm shadow-inner relative overflow-hidden group">
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors duration-500"></div>
                
                <div className="flex justify-between items-center mb-3 relative z-10">
                  <span className="font-bold text-slate-200 uppercase tracking-widest text-[10px]">
                    SfS Routing Fraction (ϕ)
                  </span>
                  <span className="font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-3 py-1 rounded-lg text-sm shadow-inner">
                    {sfsFraction}%
                  </span>
                </div>
                
                <p className="text-xs text-slate-400 mb-6 relative z-10 font-medium leading-relaxed">
                  Route a percentage of your yield to the <span className="text-slate-200 font-bold underline decoration-slate-700 decoration-2 underline-offset-4">ServicePaymaster</span> to automate gas costs for all future transactions.
                </p>
                
                <div className="relative z-10 px-1">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sfsFraction} 
                    onChange={(e) => setSfsFraction(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-widest">
                    <span>100% Wallet</span>
                    <span>100% Gas Credits</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">You will receive</span>
                  <span className="font-bold text-white">{numRlo.toLocaleString()} stRLO</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Estimated APR</span>
                  <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded text-xs tracking-tighter">18.4%</span>
                </div>
                
                <div className="h-px bg-slate-800/80 my-4 w-full"></div>
                
                <div className="flex justify-between text-slate-300 items-center">
                  <span className="text-slate-400 flex items-center font-bold uppercase tracking-widest text-[10px]">
                    Monthly Yield to Wallet
                  </span>
                  <span className="font-bold text-white tracking-tight">
                    {(yieldToWallet / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-slate-500 text-[10px] ml-1 uppercase">RLO/mo</span>
                  </span>
                </div>
                
                <div className="flex justify-between text-slate-300 items-center">
                  <span className="text-slate-400 flex items-center font-bold uppercase tracking-widest text-[10px]">
                    SfS Credit Accrual
                  </span>
                  <span className="font-bold text-orange-400 tracking-tight">
                    {(rawYieldToServiceCredits / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-orange-900/60 text-[10px] ml-1 uppercase">Credits/mo</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SfS Router */}
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <div className="mb-8">
              <h1 className="text-[2.5rem] md:text-[2.75rem] font-extrabold mb-3 tracking-tight text-white drop-shadow-sm flex items-center gap-4">
                <span className="material-symbols-outlined text-orange-500 text-5xl">alt_route</span>
                SfS Router
              </h1>
              <p className="text-slate-400 text-sm md:text-base font-medium">Manage your generated Service Credits and sponsor external target addresses.</p>
            </div>

            <div className="bg-[#1E1E1E] rounded-3xl p-5 md:p-8 shadow-2xl border border-slate-800/80 relative overflow-hidden backdrop-blur-xl h-full flex flex-col group/card hover:border-slate-700/80 transition-colors duration-500">
               <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-orange-400 via-orange-500 to-amber-500 opacity-90"></div>
              
              <div className="bg-gradient-to-br from-slate-900/60 to-slate-900/20 rounded-2xl p-6 mb-8 border border-white/5 flex items-center justify-between shadow-inner">
                <div>
                  <h3 className="text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Available Service Credits
                  </h3>
                  <div className="text-4xl font-extrabold text-orange-400 drop-shadow-lg flex items-baseline gap-2">
                    {availableServiceCredits.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                    <span className="text-orange-500/40 text-[11px] font-bold uppercase tracking-widest">Credits</span>
                  </div>
                </div>
                <div className="w-16 h-16 shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 transform rotate-3">
                  <span className="material-symbols-outlined text-black text-3xl">account_balance_wallet</span>
                </div>
              </div>

              <div className="mb-8 space-y-5">
                <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 block flex items-center justify-between px-1">
                  <span>New Sponsorship Allocation</span>
                  <span className="text-orange-500/60 lowercase font-normal italic">Allocated: {totalAllocated.toFixed(2)}</span>
                </label>
                <div className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={sponsorAddress}
                    onChange={(e) => setSponsorAddress(e.target.value)}
                    placeholder="Enter Destination Address (0x...)" 
                    className="w-full bg-slate-950/60 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all font-mono"
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                     <div className="relative flex-grow">
                        <input 
                          type="number" 
                          value={sponsorAmount}
                          onChange={(e) => setSponsorAmount(e.target.value)}
                          placeholder="Allocation Amount" 
                          className="w-full bg-slate-950/60 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all font-bold"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/20 uppercase tracking-widest">Credits/yr</span>
                     </div>
                    <button 
                      onClick={handleAddSponsor}
                      disabled={isAddingPath}
                      className={`flex-grow sm:flex-none sm:min-w-[180px] font-bold px-8 py-4 rounded-2xl transition-all shadow-[0_4px_24px_rgba(249,115,22,0.25)] text-sm flex items-center justify-center gap-3
                        ${isAddingPath ? 'bg-orange-950 text-orange-400 shadow-none cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 text-white hover:shadow-[0_6px_30px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 active:translate-y-0'}`}
                    >
                      {isAddingPath ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-sm">autorenew</span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Create Path
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-white/5 overflow-hidden">
                <h3 className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-sm">activity_zone</span>
                  Active Router Paths
                </h3>
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {sponsoredPaths.length === 0 ? (
                     <div className="py-12 text-center text-slate-600 text-sm font-medium italic border-2 border-dashed border-white/5 rounded-2xl">No sponsorship paths active.</div>
                   ) : (
                     sponsoredPaths.map((path, index) => (
                       <div key={index} className="px-5 py-4 bg-slate-950/40 rounded-2xl flex items-center justify-between text-sm hover:bg-slate-950 transition-colors border border-white/5 group/item group">
                         <div className="flex items-center gap-4 overflow-hidden">
                           <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                             <span className="material-symbols-outlined text-white/20 group-hover:text-white/40 text-lg">alt_route</span>
                           </div>
                           <div>
                              <span className="font-mono text-white text-xs block mb-0.5">{path.address.length > 14 ? `${path.address.substring(0, 10)}...${path.address.substring(path.address.length - 6)}` : path.address}</span>
                              <span className="text-white/20 text-[9px] uppercase font-bold tracking-widest">Path ID: #SfS-{index+100}</span>
                           </div>
                         </div>
                         <div className="text-right">
                            <span className="text-orange-400 font-extrabold text-lg block leading-none">
                              {path.amount.toFixed(2)}
                            </span>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1 block">Credits/yr</span>
                         </div>
                       </div>
                     ))
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Statistics Section */}
        <div className="mt-24 pt-16 border-t border-white/5">
           <div className="flex items-center justify-between mb-12">
             <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-4">
                <span className="material-symbols-outlined text-white text-4xl">analytics</span>
                Rialo Protocol Metrics
             </h2>
             <a href="#" className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase tracking-widest hover:text-cyan-300 transition-colors group">
               View Protocol Explorer
               <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
             </a>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Active Routers', value: '1,240,842', color: 'text-white' },
                { label: 'Total Credits Minted', value: '840.2M', color: 'text-orange-400' },
                { label: 'Validator Nodes', value: '448', color: 'text-white' },
                { label: 'Governance Votes', value: '124', color: 'text-white' }
              ].map((stat, i) => (
                <div key={i} className="bg-[#1E1E1E] border border-white/5 p-6 rounded-3xl hover:border-white/10 transition-colors">
                   <p className="text-white/20 text-[9px] uppercase font-bold tracking-[0.2em] mb-3">{stat.label}</p>
                   <p className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                </div>
              ))}
           </div>
        </div>

      </main>

      <Footer />

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
