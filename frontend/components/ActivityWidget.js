import { User, Calendar, Clock, Zap, ArrowUpRight, ArrowDownLeft, Lock, Unlock, Droplets, Gift } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import Link from 'next/link';

const ActivityCard = ({ tx }) => {
  const typeConfig = {
    'Stake':   { icon: Lock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    'Unstake': { icon: Unlock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    'Swap':    { icon: ArrowUpRight, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    'Bridge':  { icon: ArrowDownLeft, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    'Faucet':  { icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    'Claim':   { icon: Gift, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  };

  const cfg = typeConfig[tx.type] || { icon: Zap, color: 'text-white/40', bg: 'bg-white/5' };
  const Icon = cfg.icon;
  const date = new Date(tx.timestamp);

  return (
    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{tx.type}</span>
            <span className="text-[10px] text-white/30 font-medium">{tx.amount}</span>
          </div>
        </div>
        <div className={`px-2 py-0.5 ${cfg.bg} rounded ${cfg.color} text-[8px] font-black uppercase tracking-wider`}>
          Success
        </div>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="flex items-center gap-1 text-white/20">
          <Calendar className="w-3 h-3" />
          <span className="text-[10px] font-bold">{date.toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 text-white/20">
          <Clock className="w-3 h-3" />
          <span className="text-[10px] font-bold">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export default function ActivityWidget() {
  const { transactions, isConnected } = useWallet();
  const recentTxs = transactions.slice(0, 3);

  return (
    <div className="w-full h-full flex flex-col p-6 bg-[#0c0c0c] border border-white/5 rounded-3xl group transition-all duration-300 hover:bg-[#111111] hover:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden min-h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Live Feed</h3>
          <p className="text-lg font-black text-white tracking-tighter">Recent activity</p>
        </div>
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 group-hover:text-primary transition-colors">
          <Zap className="w-5 h-5 fill-current" />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
        {!isConnected ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <Lock className="w-8 h-8 mb-2" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-center">Connect wallet to<br/>see activity</p>
          </div>
        ) : recentTxs.length > 0 ? (
          recentTxs.map((tx, idx) => (
            <ActivityCard key={tx.id || idx} tx={tx} />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
             <Zap className="w-8 h-8 mb-2" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-center">No recent<br/>transactions</p>
          </div>
        )}
      </div>

      <Link href="/dashboard" className="mt-6 block w-full">
        <button className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
          View All History
        </button>
      </Link>
    </div>
  );
}
