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

  const icons = { success: 'check_circle', error: 'error', loading: 'hourglass_top' };
  const colors = {
    success: 'bg-primary text-on-primary',
    error: 'bg-[#ba1a1a] text-white',
    loading: 'bg-surface-container text-on-surface',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-5 py-4 rounded-xl shadow-xl max-w-sm ${colors[type]} transition-all`}>
      <span className="material-symbols-outlined text-xl mt-0.5">{icons[type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm">{message}</p>
        {txHash && !txHash.startsWith('simulated_') && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline opacity-80 hover:opacity-100 mt-1 block truncate"
          >
            View on Etherscan ↗
          </a>
        )}
        {txHash && txHash.startsWith('simulated_') && (
          <span className="text-xs text-[#ffaa00] opacity-90 mt-1 block truncate cursor-help" title="Configure AI Wallet for on-chain execution">
            Simulated Execution (Offline)
          </span>
        )}
      </div>
      <button onClick={() => { setVisible(false); onClose?.(); }} className="opacity-60 hover:opacity-100 ml-2">
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
