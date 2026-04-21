import React, { useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

export default function GlobalToast() {
  const { toast, showToast } = useWallet();

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => showToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .global-toast {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(18, 18, 18, 0.95);
          backdrop-filter: blur(24px) saturate(180%);
          color: #fff;
          padding: 16px 24px;
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08);
          animation: slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          min-width: 380px;
          max-width: 480px;
        }

        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .toast-status-icon {
          width: 34px;
          height: 34px;
          background: #2a2a2a;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .toast-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .toast-headline {
          font-weight: 700;
          font-size: 15px;
          color: #fff;
          letter-spacing: -0.01em;
        }

        .toast-subline {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          line-height: 1.4;
        }

        .explorer-link {
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          text-decoration: underline;
          text-underline-offset: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .explorer-link:hover { opacity: 1; }

        .toast-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.2);
          cursor: pointer;
          padding: 4px;
          margin-right: -8px;
          transition: color 0.2s;
        }
        .toast-close:hover { color: #fff; }
      `}} />

      <div className="global-toast">
        <div className="toast-status-icon">
          {toast.type === 'error' ? (
            <span className="material-symbols-outlined text-[18px] text-[#ef4444]">error</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
              <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        
        <div className="toast-body">
          <div className="toast-headline">{toast.message}</div>
          {toast.detail && <div className="toast-subline">{toast.detail}</div>}
          
          {toast.txHash && !toast.txHash.startsWith('simulated_') && (
            <a href={`https://sepolia.etherscan.io/tx/${toast.txHash}`} target="_blank" rel="noopener noreferrer" className="explorer-link">
              VERIFY ON EXPLORER ↗
            </a>
          )}
          {toast.txHash && toast.txHash.startsWith('simulated_') && (
            <span className="explorer-link" style={{ textDecoration: 'none', cursor: 'help', color: '#ffa500' }}>
              INTERNAL SIGNAL (SIMULATED) ↗
            </span>
          )}
        </div>

        <button className="toast-close" onClick={() => showToast(null)}>
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </>
  );
}
