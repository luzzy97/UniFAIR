import React from 'react';
import { useWallet } from '../hooks/useWallet';

export default function ActiveTasks() {
  const { scheduledTxs, removeScheduledTx } = useWallet();

  if (scheduledTxs.length === 0) return null;

  return (
    <>
      <style>{`
        .active-tasks-container {
          position: fixed;
          bottom: 100px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          pointer-events: none;
        }

        .active-task-pill {
          background: rgba(14, 14, 15, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 165, 0, 0.2);
          border-radius: 16px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          animation: slideInRight 0.3s ease;
          pointer-events: auto;
          min-width: 240px;
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .task-timer-circle {
          width: 32px;
          height: 32px;
          border: 2px solid #ffa500;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #ffa500;
          flex-shrink: 0;
          background: rgba(255,165,0,0.1);
        }

        .task-info {
          flex: 1;
        }

        .task-label {
          font-size: 10px;
          font-weight: 800;
          color: #ffa500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .task-desc {
          font-size: 12px;
          color: #fff;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        .task-cancel {
          background: none;
          border: none;
          color: rgba(255,255,255,0.2);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .task-cancel:hover {
          color: #ff4b4b;
        }
      `}</style>

      <div className="active-tasks-container">
        {scheduledTxs.map(tx => (
          <div key={tx.id} className="active-task-pill">
            <div className="task-timer-circle">
              {tx.remainingSec > 60 ? `${Math.ceil(tx.remainingSec/60)}m` : `${tx.remainingSec}s`}
            </div>
            <div className="task-info">
              <div className="task-label">{tx.type}</div>
              <div className="task-desc">{tx.detail}</div>
            </div>
            <button 
              className="task-cancel"
              onClick={() => removeScheduledTx(tx.id)}
              title="Cancel task"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
