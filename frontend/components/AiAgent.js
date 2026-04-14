import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useStaking } from '../hooks/useStaking';
import { ethers } from 'ethers';


export default function AiAgent() {
  const { isConnected, address, balances, transactions, provider, executeAiTransaction, addTriggerOrder, globalRates, scheduledTxs, addScheduledTx, removeScheduledTx, toast, showToast, sessionActive, sessionExpiry, sessionSigner, activateSession, deactivateSession, seedSession, withdrawSessionBalance, aiMessages: messages, addAiMessage, tickingCredits } = useWallet();
  const { stakedBalance, stakedEthBalance } = useStaking();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [showAiWalletPanel, setShowAiWalletPanel] = useState(false);
  const [sessionBalance, setSessionBalance] = useState('0');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(1);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [schedData, setSchedData] = useState({ type: 'Swap', amount: '10', fromToken: 'USDC', toToken: 'RIALO', timeVal: '5', timeUnit: 'minutes' });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scheduledTxs.map(tx => tx.id).join(',')]); 

  // PERSISTENT BALANCE TRACKING
  useEffect(() => {
    if (sessionActive && sessionSigner && provider) {
      const fetchBal = async () => {
        try {
          const bal = await provider.getBalance(sessionSigner.address);
          setSessionBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
        } catch (e) {
          console.error("Balance fetch error:", e);
        }
      };
      fetchBal();
      const interval = setInterval(fetchBal, 3000); // Fast polling for snappy UI
      return () => clearInterval(interval);
    }
  }, [sessionActive, sessionSigner, provider]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    addAiMessage({ role: 'user', content: { raw: userMsg } });
    setInput('');
    setIsThinking(true);

    try {
      // Collect current wallet/ecosystem context for the AI
      const ctx = {
        isConnected,
        address,
        balances,
        stakedBalance,
        stakedEthBalance,
        tickingCredits,
        globalRates,
        operationsCount: transactions.length,
        currentPage: window.location.pathname
      };

      const resp = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: ctx })
      });

      if (!resp.ok) throw new Error('AI Service unavailable');
      
      const response = await resp.json();
      addAiMessage({ role: 'ai', content: response });
      setIsThinking(false);
      
      // If successful transaction, trigger toast or schedule
      if (response.action?.includes('successful') || response.action?.includes('active') || response.action?.includes('Scheduled') || response.action?.includes('Trigger Order Placed')) {
        let type = "Swap";
        if (userMsg.toLowerCase().includes('bridge')) type = "Bridge";
        if (userMsg.toLowerCase().includes('stake')) type = "Stake";
        if (response.action?.includes('Trigger Order')) type = "Trigger";
        
        // Extract symbols or just show successful
        const detail = response.action.replace('Transaction successful. ', '').replace(' has been completed.', '').replace(' is now active.', '').replace('Scheduled: ', '').replace('Scheduled Stake: ', '').replace('Trigger Order Placed: ', '');
        
        if (type === "Trigger") {
          const currentRate = globalRates[response.fromToken]?.[response.toToken] || 1;
          const condition = response.targetPrice >= currentRate ? '>=' : '<=';
          addTriggerOrder({
            fromToken: response.fromToken,
            toToken: response.toToken,
            amountIn: response.amount,
            targetPrice: response.targetPrice,
            condition: condition,
            expiration: '1 Day'
          });
          showToast({
            message: `Limit Order Placed!`,
            detail: detail
          });
        } else if (response.delaySec > 0) {
          // SCHEDULE IT (global — persists on navigation)
          addScheduledTx({
            type: type,
            userMsg: userMsg,
            detail: detail,
            remainingSec: response.delaySec
          });
          showToast({
            message: `Scheduled ${type}!`,
            detail: detail
          });
        } else {
          // EXECUTE ON-CHAIN
          const statusMsg = sessionActive 
            ? `🤖 **Session Key Active**: Automating **${type}** on-chain without popups...` 
            : `🔄 Initiating **${type}** on-chain. Please confirm the transaction in your wallet.`;
          
          addAiMessage({ role: 'ai', content: { raw: statusMsg } });

          executeAiTransaction(type, userMsg, detail, true, response.gas_type || 'ETH').then(res => {
            showToast({
              message: `${type} successful!`,
              detail: res.detail,
              txHash: res.hash
            });
             addAiMessage({ role: 'ai', content: { raw: `✅ **${type}** execution successful!` } });
          }).catch(err => {
            const errorMsg = err.reason || err.message || 'Transaction failed';
            showToast({ message: `${type} failed`, detail: errorMsg, type: 'error' });
            addAiMessage({ role: 'ai', content: { raw: `❌ **${type}** failed: ${errorMsg}` } });
          });
        }
      }
    } catch (err) {
      console.error('AI Error:', err);
      addAiMessage({ role: 'ai', content: { raw: `❌ **Error**: ${err.message}. Please check if your API key is configured.` } });
      setIsThinking(false);
    }
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
  };

  return (
    <>

      <div className="ai-widget">
        <div className="ai-window">
          <div className="ai-header">
            <div className="ai-title">
              <span className="ai-status-dot"></span>
              Rialo AI Assistant
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={`automation-badge ${sessionActive ? 'active' : ''}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {sessionActive ? 'bolt' : 'front_hand'}
                </span>
                {sessionActive ? 'SESSION ACTIVE' : 'MANUAL APPROVAL'}
              </div>
              <button 
                className="ai-settings-btn"
                onClick={() => setShowAiWalletPanel(!showAiWalletPanel)}
                title="Session Control"
              >
                <span className="material-symbols-outlined">{sessionActive ? 'shield_person' : 'lock_open'}</span>
              </button>
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
                      onClick={() => removeScheduledTx(tx.id)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isThinking && (
              <div className="ai-msg ai">
                <div className="ai-raw italic opacity-50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  Rialo AI is thinking...
                </div>
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

            {showAiWalletPanel && (
              <div className="ai-wallet-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="ai-sched-label" style={{ margin: 0 }}>Session Control (EIP-7702)</h3>
                  <button onClick={() => setShowAiWalletPanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  {sessionActive 
                    ? `Your session is ACTIVE. AI can execute swaps, bridges, and stakes without further popups.` 
                    : `Start a temporary session to allow the AI Agent to execute transactions "from the inside." This only requires ONE initial signature.`
                  }
                </p>
                
                {sessionActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ padding: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>Expires In</div>
                        <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>
                          {sessionExpiry ? Math.max(0, Math.ceil((sessionExpiry - Date.now()) / (60 * 1000))) : 0} Min
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                          Gas Balance
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(sessionSigner?.address || "");
                              showToast({ message: "Address Copied!", detail: (sessionSigner?.address || "").slice(0, 10) + '...' });
                            }}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, opacity: 0.5 }}
                            title="Copy Wallet Address"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>content_copy</span>
                          </button>
                        </div>
                        <div style={{ fontSize: '18px', color: '#fff', fontWeight: '700' }}>
                          {sessionBalance} ETH
                        </div>
                      </div>
                    </div>

                    {parseFloat(sessionBalance) < 0.005 && (
                      <button 
                        className="ai-sched-btn"
                        disabled={isSeeding}
                        onClick={async () => {
                          setIsSeeding(true);
                          try {
                            await seedSession('0.01');
                            showToast({ message: "AI Wallet Seeded!", detail: "0.01 ETH transferred for gas." });
                            if (provider && sessionSigner) {
                               const bal = await provider.getBalance(sessionSigner.address);
                               setSessionBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
                            }
                          } catch (e) {
                            showToast({ message: "Seeding Failed", detail: e.message, type: 'error' });
                          } finally {
                            setIsSeeding(false);
                          }
                        }}
                        style={{ background: '#10b981', color: '#000' }}
                      >
                        {isSeeding ? 'Seeding...' : 'Seed AI Wallet (0.01 ETH)'}
                      </button>
                    )}

                    {parseFloat(sessionBalance) > 0 && (
                      <button 
                        className="ai-sched-btn" 
                        disabled={isWithdrawing}
                        onClick={async () => {
                          setIsWithdrawing(true);
                          try {
                            await withdrawSessionBalance();
                            showToast({ message: "Withdrawal Complete", detail: "Funds returned to your main wallet." });
                            if (provider && sessionSigner) {
                               const bal = await provider.getBalance(sessionSigner.address);
                               setSessionBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
                            }
                          } catch (e) {
                            showToast({ message: "Withdrawal Failed", detail: e.message, type: 'error' });
                          } finally {
                            setIsWithdrawing(false);
                          }
                        }}
                        style={{ border: '1px solid #10b981', color: '#10b981', background: 'transparent' }}
                      >
                        {isWithdrawing ? 'Withdrawing...' : `Withdraw Balance (${sessionBalance} ETH)`}
                      </button>
                    )}

                    <button 
                      className="ai-sched-btn" 
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      disabled={isRevoking}
                      onClick={async () => {
                        setIsRevoking(true);
                        try {
                          await deactivateSession();
                          showToast({ message: "Session Deactivated", detail: "AI automation paused.", type: 'error' });
                        } catch (e) {
                          showToast({ message: "Action Failed", detail: e.message, type: 'error' });
                        } finally {
                          setIsRevoking(false);
                        }
                      }}
                    >
                      {isRevoking ? 'Revoking...' : 'Terminate Session'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Session Duration</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="range" 
                          min="1" 
                          max="24" 
                          value={sessionDuration}
                          onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                          style={{ accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '800', minWidth: '45px' }}>{sessionDuration}H</span>
                      </div>
                    </div>
                    <button 
                      className="ai-sched-btn" 
                      onClick={async () => {
                        try {
                          await activateSession(sessionDuration);
                          setShowAiWalletPanel(false);
                          showToast({ message: "Session Started!", detail: `Zero-popup automation active for ${sessionDuration} hour(s).` });
                        } catch (e) {
                          showToast({ message: "Activation Failed", detail: e.message, type: 'error' });
                        }
                      }}
                    >
                      Authorize {sessionDuration}-Hour Session
                    </button>
                  </div>
                )}
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
              <button onClick={() => setInput("swap 1 ETH to USDC at 2500")} className="ai-command-chip">Auto Buy/Sell</button>
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
