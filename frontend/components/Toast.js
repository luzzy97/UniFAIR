import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', txHash, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const icons = { success: 'check_circle', error: 'error', loading: 'hourglass_empty', info: 'info' };
  const colors = {
    success: 'bg-primary text-on-primary',
    error: 'bg-[#ba1a1a] text-white',
    loading: 'bg-surface-container text-on-surface',
    info: 'bg-primary/20 text-white',
  };

  return (
    <div 
      id="protocol-toast-root"
      className={`!fixed !bottom-8 !right-8 !z-[999999] flex items-center gap-4 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-2xl transition-all animate-in fade-in slide-in-from-bottom-10 duration-500 max-w-md bg-[#111111]/95 ${type === 'error' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'}`}
      style={{ left: 'auto', top: 'auto', bottom: '32px', right: '32px' }}
    >
      <span className={`material-symbols-outlined text-xl ${type === 'error' ? 'text-red-400' : 'text-white/90'}`}>{icons[type]}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-headline font-bold text-sm text-white`}>{message}</p>
        {txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[10px] font-bold uppercase tracking-wider underline opacity-60 hover:opacity-100 mt-0.5 block truncate ${type === 'error' ? 'text-red-300' : 'text-primary'}`}
          >
            Verify on Explorer ↗
          </a>
        )}
      </div>
      <button onClick={() => { setVisible(false); onClose?.(); }} className={`opacity-40 hover:opacity-100 ml-2 text-white`}>
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
