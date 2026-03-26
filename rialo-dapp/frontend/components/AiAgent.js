import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

// Mock logic matching the system prompt
const getAiResponse = (input) => {
  const lower = input.toLowerCase();
  
  // Scheduling detection (e.g., "in 5 minutes", "dalam 2 jam")
  const delayMatch = lower.match(/(?:in|dalam)\s+([\d.]+)\s+(minute|minutes|menit|hour|hours|jam)/i);
  let delaySec = 0;
  if (delayMatch) {
    const val = parseFloat(delayMatch[1]);
    const unit = delayMatch[2].toLowerCase();
    if (unit.startsWith('m')) delaySec = val * 60;
    else if (unit.startsWith('h') || unit.startsWith('j')) delaySec = val * 3600;
  }

  // Direct swap execution (e.g., "swap 100 rialo to eth")
  const swapMatch = lower.match(/(?:swap|tukar)\s+([\d.]+)\s+([a-z0-9]+)\s+(?:to|ke)\s+([a-z0-9]+)/i);
  if (swapMatch) {
    const amount = swapMatch[1];
    const fromToken = swapMatch[2].toUpperCase();
    const toToken = swapMatch[3].toUpperCase();
    return {
      insight: `Optimal route found for ${amount} ${fromToken} to ${toToken}.${delaySec ? ` (Scheduled for ${delayMatch[1]} ${delayMatch[2]})` : ''}`,
      options: ["1. Aggregator Route (Executed)"],
      recommendation: delaySec ? "Transaction will be processed automatically." : "Swap has been optimized and processed.",
      action: delaySec ? `Scheduled: ${amount} ${fromToken} -> ${toToken}` : `Transaction successful. ${amount} ${fromToken} -> ${toToken} has been completed.`,
      delaySec: delaySec
    };
  }

  // Direct bridge execution (ETH to RIALO only)
  const bridgeMatch = lower.match(/(?:bridge|kirim)\s+([\d.]+)\s+eth\s+(?:to|ke)\s+rialo/i);
  if (bridgeMatch) {
    const amount = parseFloat(bridgeMatch[1]);
    if (amount < 0.01) {
      return {
        insight: "Bridge requirements not met.",
        options: ["1. Increase amount to 0.01 ETH or more"],
        recommendation: "Minimal bridge amount is 0.01 ETH.",
        action: "Failed: Minimal bridge is 0.01 ETH."
      };
    }
    return {
      insight: `Rialo Bridge is clear. ETH -> RIALO migration processed.${delaySec ? ` (Scheduled in ${delayMatch[1]} ${delayMatch[2]})` : ''}`,
      options: ["1. Native Rialo Bridge (Executed)"],
      recommendation: "Bridge protocol completed successfully.",
      action: delaySec ? `Scheduled: ${amount} ETH -> RIALO` : `Transaction successful. ${amount} ETH -> RIALO has been completed.`,
      delaySec: delaySec
    };
  }

  // Direct stake execution (e.g., "stake 1000 rialo")
  const stakeMatch = lower.match(/(?:stake|staking)\s+([\d.]+)\s+([a-z0-9]+)/i);
  if (stakeMatch) {
    const amount = stakeMatch[1];
    const token = stakeMatch[2].toUpperCase();
    return {
      insight: `${token} staking pool processed.${delaySec ? ` (Scheduled in ${delayMatch[1]} ${delayMatch[2]})` : ''}`,
      options: ["1. Standard Staking Pool (Active)"],
      recommendation: "Funds are now earning rewards.",
      action: delaySec ? `Scheduled Stake: ${amount} ${token}` : `Transaction successful. Staking ${amount} ${token} is now active.`,
      delaySec: delaySec
    };
  }

  // Generic Swap
  if (lower.includes('swap') || lower.includes('tukar')) {
    return {
      insight: "Liquidity is strong and gas is currently reasonable on Layer 2s.",
      options: ["1. Swap on Ethereum mainnet (higher gas, deeper liquidity)", "2. Swap via Arbitrum (lower fees)"],
      recommendation: "Use Arbitrum for lower fees unless you're swapping a large amount.",
      action: "Provide amount and preferred tokens (e.g., 'swap 100 RIALO to ETH')."
    };
  }
  
  // Generic Bridge
  if (lower.includes('bridge') || lower.includes('kirim')) {
    return {
      insight: "Rialo Bridge is optimized for liquidity migration from Ethereum.",
      options: ["1. ETH to RIALO (Standard Route)"],
      recommendation: "Currently, only ETH to RIALO bridging is supported for maximum safety.",
      action: "Specify your amount (e.g., 'bridge 0.5 ETH to RIALO')."
    };
  }

  // Generic Stake
  if (lower.includes('stake') || lower.includes('yield') || lower.includes('staking')) {
    return {
      insight: "Several stable pools currently offer strong APY with moderate risk.",
      options: ["1. Stablecoin pool (lower risk)", "2. ETH staking (moderate risk, long-term)"],
      recommendation: "Start with a stable pool if you want safer yield.",
      action: "Specify your details (e.g., 'stake 1000 RIALO')."
    };
  }

  return {
    raw: "I am ready to optimize your next DeFi move. Example: 'swap 100 RIALO to ETH', 'bridge 0.5 ETH to RIALO', or 'stake 100 RIALO'."
  };
};

export default function AiAgent() {
  const { isConnected, executeAiTransaction } = useWallet();
  const [messages, setMessages] = useState([
    { role: 'ai', content: { raw: "Rialo AI is online. How can I optimize your on-chain operations today?" } }
  ]);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState(null); // { message, type, txHash }
  const [scheduledTxs, setScheduledTxs] = useState([]); // Array of { id, type, userMsg, detail, remainingSec }
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [schedData, setSchedData] = useState({ type: 'Swap', amount: '10', fromToken: 'USDC', toToken: 'RIALO', timeVal: '5', timeUnit: 'minutes' });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scheduledTxs]);

  // Timer effect for scheduled transactions
  useEffect(() => {
    if (scheduledTxs.length === 0) return;

    const interval = setInterval(() => {
      setScheduledTxs(prev => {
        const next = [];
        prev.forEach(tx => {
          if (tx.remainingSec <= 1) {
            // EXECUTE NOW
            const txHash = executeAiTransaction(tx.type, tx.userMsg, tx.detail);
            setToast({
              message: `Auto ${tx.type} completed!`,
              detail: tx.detail,
              txHash: txHash
            });
            // Don't add to next
          } else {
            next.push({ ...tx, remainingSec: tx.remainingSec - 1 });
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scheduledTxs, executeAiTransaction]);

  // Clear toast after 6 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: { raw: userMsg } }]);
    setInput('');

    // Simulate network delay
    setTimeout(() => {
      const response = getAiResponse(userMsg);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
      
      // If successful transaction, trigger toast or schedule
      if (response.action?.includes('successful') || response.action?.includes('active') || response.action?.includes('Scheduled')) {
        let type = "Swap";
        if (userMsg.toLowerCase().includes('bridge')) type = "Bridge";
        if (userMsg.toLowerCase().includes('stake')) type = "Stake";
        
        // Extract symbols or just show successful
        const detail = response.action.replace('Transaction successful. ', '').replace(' has been completed.', '').replace(' is now active.', '').replace('Scheduled: ', '').replace('Scheduled Stake: ', '');
        
        if (response.delaySec > 0) {
          // SCHEDULE IT
          setScheduledTxs(prev => [...prev, {
            id: Math.random().toString(16).slice(2, 8),
            type: type,
            userMsg: userMsg,
            detail: detail,
            remainingSec: response.delaySec
          }]);
        } else {
          // EXECUTE IMMEDIATELY
          const txHash = executeAiTransaction(type, userMsg, detail);
          setToast({
            message: `${type} successful!`,
            detail: detail,
            txHash: txHash
          });
        }
      }
    }, 600);
  };

  const submitScheduledForm = (e) => {
    e.preventDefault();
    let cmd = "";
    if (schedData.type === 'Swap') {
      cmd = `swap ${schedData.amount} ${schedData.fromToken} to ${schedData.toToken} in ${schedData.timeVal} ${schedData.timeUnit}`;
    } else if (schedData.type === 'Bridge') {
      cmd = `bridge ${schedData.amount} ETH to RIALO in ${schedData.timeVal} ${schedData.timeUnit}`;
    } else {
      cmd = `stake ${schedData.amount} ${schedData.fromToken} in ${schedData.timeVal} ${schedData.timeUnit}`;
    }
    setInput(cmd);
    setShowSchedulePanel(false);
    // Automatically trigger sending if you want, but letting user see the generated command is safer/better for demo
  };

  return (
    <>
      <style>{`
        .ai-widget {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          font-family: inherit;
        }

        /* ── Toast Styled to match screenshot ── */
        .ai-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #000;
          color: #fff;
          padding: 10px 20px;
          border-radius: 999px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.5);
          animation: slideInToast 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(255,255,255,0.1);
          min-width: 280px;
        }
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ai-toast-icon {
          width: 24px;
          height: 24px;
          background: #fff;
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ai-toast-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .ai-toast-title {
          font-weight: 700;
          font-size: 13px;
          letter-spacing: -0.01em;
        }
        .ai-toast-link {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          text-decoration: underline;
          margin-top: 2px;
          transition: color 0.2s;
        }
        .ai-toast-link:hover {
          color: #fff;
        }

        .ai-window {
          width: 100%;
          height: calc(100vh - 220px);
          min-height: 500px;
          background: #0e0e0f;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          box-shadow: 0 16px 64px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ai-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.02);
        }
        .ai-title {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ai-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }
        .ai-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 20px;
          transition: color 0.2s;
        }
        .ai-close:hover {
          color: #fff;
        }
        .ai-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ai-msg {
          max-width: 85%;
          font-size: 13px;
          line-height: 1.5;
        }
        .ai-msg.user {
          align-self: flex-end;
          background: rgba(255,255,255,0.1);
          color: #fff;
          padding: 10px 14px;
          border-radius: 12px 12px 0 12px;
        }
        .ai-msg.ai {
          align-self: flex-start;
          color: rgba(255,255,255,0.85);
          width: 100%;
        }
        .ai-structured {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ai-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          margin-bottom: 4px;
        }
        .ai-section-content {
          color: rgba(255,255,255,0.9);
        }
        .ai-options {
          margin: 0;
          padding-left: 16px;
        }
        .ai-recommendation {
          color: #22c55e;
          font-weight: 500;
        }
        .ai-raw {
          background: rgba(255,255,255,0.05);
          padding: 10px 14px;
          border-radius: 12px 12px 12px 0;
        }
        .ai-footer {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.01);
        }
        .ai-form {
          display: flex;
          gap: 8px;
        }
        .ai-input {
          flex: 1;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .ai-input:focus {
          border-color: rgba(255,255,255,0.3);
        }
        .ai-send {
          background: #fff;
          color: #0e0e0f;
          border: none;
          border-radius: 8px;
          padding: 0 16px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .ai-send:hover {
          opacity: 0.8;
        }
        /* Scrollbar */
        .ai-body::-webkit-scrollbar { width: 4px; }
        .ai-body::-webkit-scrollbar-track { background: transparent; }
        .ai-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        
        @media (max-width: 640px) {
          .ai-window {
            width: calc(100vw - 32px);
            right: -8px;
            bottom: 72px;
          }
        }
        .ai-scheduled-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }
        .ai-scheduled-item {
          background: #1a1a1b;
          border: 1px solid rgba(255,165,0,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideInUp 0.3s ease;
        }
        .ai-scheduled-timer {
          width: 32px;
          height: 32px;
          border: 2px solid #ffa500;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #ffa500;
          flex-shrink: 0;
        }
        .ai-scheduled-info {
          flex: 1;
        }
        .ai-scheduled-title {
          font-size: 11px;
          font-weight: 800;
          color: #ffa500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ai-scheduled-detail {
          font-size: 12px;
          color: #fff;
          margin-top: 1px;
        }
        
        /* Advanced Schedule Panel */
        .ai-sched-panel {
          background: #111;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 20px;
          animation: slideInUp 0.3s ease;
        }
        .ai-sched-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .ai-sched-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ai-sched-label {
          font-size: 10px;
          font-weight: 800;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .ai-sched-input, .ai-sched-select {
          background: #1a1a1b;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          outline: none;
        }
        .ai-sched-input:focus, .ai-sched-select:focus {
          border-color: #ffa500;
        }
        .ai-sched-btn {
          width: 100%;
          background: #ffa500;
          color: #000;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ai-sched-btn:hover {
          background: #ffb733;
          transform: translateY(-1px);
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ai-quick-commands {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .ai-quick-commands::-webkit-scrollbar { display: none; }
        .ai-command-chip {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ai-command-chip:hover {
          background: rgba(255,255,255,0.1);
          border-color: #ffa500;
          color: #ffa500;
        }
      `}</style>

      <div className="ai-widget">
        {toast && (
          <div className="ai-toast">
            <div className="ai-toast-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="ai-toast-content">
              <div className="ai-toast-title">{toast.message} {toast.detail}</div>
              <a href={`https://etherscan.io/tx/${toast.txHash}`} target="_blank" rel="noopener noreferrer" className="ai-toast-link">
                View on Etherscan ↗
              </a>
            </div>
          </div>
        )}

        <div className="ai-window">
          <div className="ai-header">
            <div className="ai-title">
              <span className="ai-status-dot"></span>
              Rialo AI Assistant
            </div>
          </div>
          
          <div className="ai-body">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                {m.role === 'user' ? (
                  m.content.raw
                ) : m.content.raw ? (
                  <div className="ai-raw">{m.content.raw}</div>
                ) : (
                  <div className="ai-structured">
                    {m.content.insight && (
                      <div>
                        <div className="ai-section-title">Insight</div>
                        <div className="ai-section-content">{m.content.insight}</div>
                      </div>
                    )}
                    {m.content.options && (
                      <div>
                        <div className="ai-section-title">Options</div>
                        <ul className="ai-options ai-section-content">
                          {m.content.options.map((opt, idx) => (
                            <li key={idx}>{opt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.content.recommendation && (
                      <div>
                        <div className="ai-section-title">Recommendation</div>
                        <div className="ai-section-content ai-recommendation">{m.content.recommendation}</div>
                      </div>
                    )}
                    {m.content.action && (
                      <div>
                        <div className="ai-section-title">Action</div>
                        <div className="ai-section-content">{m.content.action}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {scheduledTxs.length > 0 && (
              <div className="ai-scheduled-list">
                {scheduledTxs.map(tx => (
                  <div key={tx.id} className="ai-scheduled-item">
                    <div className="ai-scheduled-timer">
                      {tx.remainingSec > 60 ? `${Math.ceil(tx.remainingSec/60)}m` : `${tx.remainingSec}s`}
                    </div>
                    <div className="ai-scheduled-info">
                      <div className="ai-scheduled-title">Scheduled {tx.type}</div>
                      <div className="ai-scheduled-detail">{tx.detail}</div>
                    </div>
                    <button 
                      onClick={() => setScheduledTxs(prev => prev.filter(t => t.id !== tx.id))}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-footer">
            {showSchedulePanel && (
              <div className="ai-sched-panel">
                <form onSubmit={submitScheduledForm}>
                  <div className="ai-sched-grid">
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Action</label>
                      <select 
                        className="ai-sched-select"
                        value={schedData.type}
                        onChange={e => setSchedData({...schedData, type: e.target.value})}
                      >
                        <option>Swap</option>
                        <option>Bridge</option>
                        <option>Stake</option>
                      </select>
                    </div>
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Amount</label>
                      <input 
                        type="number" 
                        className="ai-sched-input" 
                        value={schedData.amount}
                        onChange={e => setSchedData({...schedData, amount: e.target.value})}
                      />
                    </div>
                    {schedData.type !== 'Bridge' && (
                      <div className="ai-sched-field">
                        <label className="ai-sched-label">Token</label>
                        <select 
                          className="ai-sched-select"
                          value={schedData.fromToken}
                          onChange={e => setSchedData({...schedData, fromToken: e.target.value})}
                        >
                          <option>RIALO</option>
                          <option>USDC</option>
                          <option>USDT</option>
                          <option>ETH</option>
                        </select>
                      </div>
                    )}
                    {schedData.type === 'Swap' && (
                      <div className="ai-sched-field">
                        <label className="ai-sched-label">To Token</label>
                        <select 
                          className="ai-sched-select"
                          value={schedData.toToken}
                          onChange={e => setSchedData({...schedData, toToken: e.target.value})}
                        >
                          <option>RIALO</option>
                          <option>ETH</option>
                          <option>USDC</option>
                          <option>USDT</option>
                        </select>
                      </div>
                    )}
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Time Value</label>
                      <input 
                        type="number" 
                        className="ai-sched-input" 
                        value={schedData.timeVal}
                        onChange={e => setSchedData({...schedData, timeVal: e.target.value})}
                      />
                    </div>
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Unit</label>
                      <select 
                        className="ai-sched-select"
                        value={schedData.timeUnit}
                        onChange={e => setSchedData({...schedData, timeUnit: e.target.value})}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="ai-sched-btn">Generate Command</button>
                </form>
              </div>
            )}

            <div className="ai-quick-commands">
              <button 
                onClick={() => setShowSchedulePanel(!showSchedulePanel)} 
                className={`ai-command-chip ${showSchedulePanel ? 'border-[#ffa500] text-[#ffa500]' : ''}`}
                style={{ background: showSchedulePanel ? 'rgba(255,165,0,0.1)' : '' }}
              >
                <span className="material-symbols-outlined text-[12px] align-middle mr-1">schedule</span>
                Advanced Schedule
              </button>
              <button onClick={() => setInput("swap 10 USDC to RIALO in 1 minute")} className="ai-command-chip">Swap 10 (1m)</button>
              <button onClick={() => setInput("stake 100 RIALO in 5 minutes")} className="ai-command-chip">Stake 100 (5m)</button>
            </div>
            <form className="ai-form" onSubmit={handleSend}>
              <input 
                type="text" 
                className="ai-input" 
                placeholder="Ask about swaps, bridging, or staking..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button type="submit" className="ai-send">Send</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
