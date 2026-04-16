import { Zap, Lock, Coins, Flame, MousePointer2 } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useStaking } from '../hooks/useStaking';
import Link from 'next/link';

const BalanceCard = ({ title, value, unit, icon: Icon, color, trend }) => {
  return (
    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all group/card relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.1em]">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
              {typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : value}
            </span>
            <span className={`text-xs font-bold ${color} opacity-80`}>{unit}</span>
          </div>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <p className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-wider">Live & Ticking</p>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color.replace('text-', 'from-')}/20 to-transparent border border-white/5 ${color} transition-all duration-500 group-hover/card:bg-white group-hover/card:text-black group-hover/card:scale-110 group-hover/card:shadow-[0_0_20px_rgba(255,255,255,0.2)]`}>
          <Icon className="w-5 h-5 transition-colors duration-500" />
        </div>
      </div>
      
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color.replace('text-', 'from-')}/5 to-transparent blur-2xl rounded-full translate-x-12 -translate-y-12 pointer-events-none group-hover/card:scale-125 transition-transform duration-500`} />
    </div>
  );
};

export default function ActivityWidget() {
  const { isConnected } = useWallet();
  const { tickingCredits, tickingRewards } = useStaking();

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0c0c0c] border border-white/5 rounded-3xl group transition-all duration-300 hover:bg-[#111111] hover:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden min-h-[420px]">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Real-time Feed</h3>
          <p className="text-lg font-black text-white tracking-tighter">Ecosystem Balances</p>
        </div>
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 group-hover:bg-white group-hover:text-black transition-all duration-500">
          <Zap className="w-5 h-5 fill-current transition-colors duration-500" />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {!isConnected ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-12">
             <Lock className="w-10 h-10 mb-3" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">Connect wallet to<br/>sync live feeds</p>
          </div>
        ) : (
          <>
            <BalanceCard 
              title="Staking Rewards"
              value={tickingRewards}
              unit="stRLO"
              icon={Coins}
              color="text-emerald-400"
              trend={tickingRewards > 0}
            />
            
            <BalanceCard 
              title="Service Credits"
              value={tickingCredits}
              unit="ϕ"
              icon={Flame}
              color="text-orange-400"
              trend={tickingCredits > 0}
            />
          </>
        )}
      </div>

      <div className="mt-8 space-y-3">
        <Link href="/staking" className="block w-full">
          <button className="w-full py-4 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.15em] hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2">
            <MousePointer2 className="w-3.5 h-3.5" />
            Manage Staking
          </button>
        </Link>
        
        <p className="text-[9px] text-center text-white/20 font-bold uppercase tracking-widest">
          SFS Allocation: Optimized by Rialo AI
        </p>
      </div>
    </div>
  );
}
