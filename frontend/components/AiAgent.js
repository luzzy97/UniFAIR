import { useState, useRef, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useStaking } from '../hooks/useStaking';
import { ethers } from 'ethers';
import { useReadContract } from 'wagmi';


export default function AiAgent() {
  const { isConnected, address, balances, transactions, provider, executeAiTransaction, addTriggerOrder, globalRates, scheduledTxs, addScheduledTx, removeScheduledTx, toast, showToast, sessionActive, sessionExpiry, sessionSigner, activateSession, deactivateSession, seedSession, withdrawSessionBalance, aiMessages: messages, addAiMessage, deductCredits } = useWallet();
  const { stakedBalance, stakedEthBalance } = useStaking();

  // 👇 JURUS WAGMI DARI DASHBOARD 👇
  const userCreditsAbi = [{
    name: 'userCredits', type: 'function', stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  }];

  const { data: rawCredits } = useReadContract({
    address: '0x72c6abd9c48c9511e8c0d660091a974f6422d782',
    abi: userCreditsAbi,
    functionName: 'userCredits',
    args: address ? [address] : undefined,
    chainId: 11155111,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const tickingCredits = rawCredits ? Number(rawCredits) : 0;
  // 👆 SAMPAI SINI 👆

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [showAiWalletPanel, setShowAiWalletPanel] = useState(false);
  const [sessionBalance, setSessionBalance] = useState('0');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(1);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [schedData, setSchedData] = useState({
    type: 'Stake',
    amount: '100',
    fromToken: 'RIALO',
    toToken: 'ETH',
    bridgeToken: 'RIALO',
    fromNetwork: 'Ethereum Sepolia',
    toNetwork: 'Arbitrum Sepolia',
    stakingAssetType: 'Solo RLO',
    payoutType: 'RLO',
    toAddress: '',
    timeVal: '7',
    timeUnit: 'minutes',
    lockMonths: '1',
    sfsFraction: '20'
  });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, scheduledTxs.map(tx => tx.id).join(',')]);

  // Reset fromToken/toToken if they become invalid for the current action type
  useEffect(() => {
    if ((schedData.type === 'Bridge' || schedData.type === 'Stake')) {
      if (schedData.fromToken === 'USDC' || schedData.fromToken === 'USDT') {
        setSchedData(prev => ({ ...prev, fromToken: 'RIALO' }));
      }
      if (schedData.toToken === 'USDC' || schedData.toToken === 'USDT') {
        setSchedData(prev => ({ ...prev, toToken: 'ETH' }));
      }
    }
  }, [schedData.type, schedData.fromToken, schedData.toToken]);

  // Persistence: Credits are managed globally via useWallet

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

    // --- Credit Check: 5 for chat, 10 for automation ---
    const CREDITS_CHAT = 5;
    const CREDITS_AUTO = 10;
    const lowerInput = input.trim().toLowerCase();
    const isAutomationIntent = lowerInput.includes('schedule') || lowerInput.includes('at ') || lowerInput.includes('limit');
    const requiredCredits = isAutomationIntent ? CREDITS_AUTO : CREDITS_CHAT;

    if (tickingCredits < requiredCredits) {
      showToast({
        message: "Insufficient Credits",
        detail: isAutomationIntent
          ? `You need at least 10 Credits for Automation strategies.`
          : `You need at least 5 Credits for AI Chat.`,
        type: 'error'
      });
      return;
    }

    const userMsg = input.trim();
    addAiMessage({ role: 'user', content: { raw: userMsg } });
    setInput('');
    setIsThinking(true);

    // Deduct 5 credits immediately for this interaction (persists to localStorage + backend)
    deductCredits(5);

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

      const contentType = resp.headers.get('content-type');
      let response;

      if (contentType && contentType.includes('application/json')) {
        response = await resp.json();
      } else {
        const text = await resp.text();
        throw new Error(resp.status === 504 ? 'Request Timeout (AI is taking too long)' : 'Server returned non-JSON response');
      }

      if (!resp.ok) {
        const error = new Error(response.error || 'AI Service unavailable');
        error.details = response.details;
        throw error;
      }

      addAiMessage({ role: 'ai', content: response });
      setIsThinking(false);

      // If successful transaction, trigger toast or schedule
      if (response.action?.includes('successful') || response.action?.includes('active') || response.action?.includes('Scheduled') || response.action?.includes('Trigger Order Placed')) {
        let type = "Swap";
        if (userMsg.toLowerCase().includes('bridge')) type = "Bridge";
        if (userMsg.toLowerCase().includes('stake')) type = "Stake";
        if (userMsg.toLowerCase().includes('send')) type = "Send";
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
          deductCredits(5); // Premium Tariff: Auto Buy/Sell costs 10 total
          showToast({
            message: `Limit Order Placed!`,
            detail: `${detail} (10 Credits total used)`
          });
        } else if (response.action?.includes('Scheduled') || Number(response.delaySec) > 0) {
          // SCHEDULE IT (global — persists on navigation)
          const delay = Number(response.delaySec) > 0 ? Number(response.delaySec) : 60; // Fallback to 60s if not specified
          addScheduledTx({
            type: type,
            userMsg: userMsg,
            detail: detail,
            remainingSec: delay,
            gasType: response.gas_type || 'ETH'
          });
          deductCredits(5); // Premium Tariff: Scheduling costs 10 total
          showToast({
            message: `Scheduled ${type}!`,
            detail: `${detail} (10 Credits total used)`
          });
        } else {
          if (!sessionActive) {
            addAiMessage({
              role: 'ai',
              content: { raw: `⚠️ **Session Inactive**: To automate this **${type}** without constant popups, please activate a **Secure Session** first. I've opened the Session Control panel for you below.` }
            });
            setShowAiWalletPanel(true);
            setIsThinking(false);
            return;
          }

          const statusMsg = `🤖 **Session Key Active**: Automating **${type}** on-chain without popups...`;
          addAiMessage({ role: 'ai', content: { raw: statusMsg } });

          executeAiTransaction(type, userMsg, detail, true, response.gas_type || 'ETH').then(res => {
            showToast({
              message: "Blockchain operation successful!",
              detail: `${type}: ${res.detail}`,
              txHash: res.hash
            });
            addAiMessage({ role: 'ai', content: { raw: `✅ **${type}** execution successful!`, hash: res.hash } });
          }).catch(err => {
            const errorMsg = err.reason || err.message || 'Transaction failed';
            showToast({ message: `${type} failed`, detail: errorMsg, type: 'error' });
            addAiMessage({ role: 'ai', content: { raw: `❌ **${type}** failed: ${errorMsg}` } });
          });
        }
      }
    } catch (err) {
      console.error('AI Error:', err);
      const detail = err.details || err.message || 'Unknown error';
      addAiMessage({
        role: 'ai',
        content: { raw: `❌ **Error**: ${detail}. ${detail.includes('API key') ? 'Please check if your API key is configured in Vercel.' : 'Please try again.'}` }
      });
      setIsThinking(false);
    }
  };


  const submitScheduledForm = (e) => {
    e.preventDefault();
    let cmd = "";
    if (schedData.type === 'Swap') {
      cmd = `swap ${schedData.amount} ${schedData.fromToken} to ${schedData.toToken} in ${schedData.timeVal} ${schedData.timeUnit}`;
    } else if (schedData.type === 'Stake') {
      cmd = `stake ${schedData.amount} ${schedData.stakingAssetType} for ${schedData.lockMonths} months with ${schedData.sfsFraction}% SFS and ${schedData.payoutType} payout in ${schedData.timeVal} ${schedData.timeUnit}`;
    } else if (schedData.type === 'Send') {
      cmd = `send ${schedData.amount} ${schedData.fromToken} to ${schedData.toAddress} in ${schedData.timeVal} ${schedData.timeUnit}`;
    } else {
      cmd = `bridge ${schedData.amount} ${schedData.bridgeToken} from ${schedData.fromNetwork} to ${schedData.toNetwork} in ${schedData.timeVal} ${schedData.timeUnit}`;
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
              UniFAIR AI Assistant
              <div className="ai-access-badge">
                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>account_balance_wallet</span>
                {tickingCredits.toFixed(2)} Credits
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className={`automation-badge ${sessionActive ? 'active' : ''}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {sessionActive ? 'bolt' : 'front_hand'}
                </span>
                AUTO APPROVAL
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

          <div className="ai-body relative">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                {m.role === 'user' ? (
                  m.content.raw
                ) : m.content.raw ? (
                  <div className="ai-raw">
                    <div>{m.content.raw}</div>
                    {m.content.hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${m.content.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ai-tx-button"
                      >
                        SCAN <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
                      </a>
                    )}
                  </div>
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
                      {tx.remainingSec > 60 ? `${Math.ceil(tx.remainingSec / 60)}m` : `${tx.remainingSec}s`}
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
                  UniFAIR AI is thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-footer">
            {showSchedulePanel && (
              <div className="ai-sched-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="ai-sched-label" style={{ margin: 0 }}>Configure {schedData.type} Command</h3>
                  <button onClick={() => setShowSchedulePanel(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} type="button">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>
                <form onSubmit={submitScheduledForm}>
                  <div className="ai-sched-grid">
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Action</label>
                      <select
                        className="ai-sched-select"
                        value={schedData.type}
                        onChange={e => setSchedData({ ...schedData, type: e.target.value })}
                      >
                        <option value="Swap">Swap</option>
                        <option value="Bridge">Bridge</option>
                        <option value="Stake">Stake</option>
                        <option value="Send">Send</option>
                      </select>
                    </div>
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Amount</label>
                      <input
                        type="number"
                        className="ai-sched-input"
                        value={schedData.amount}
                        onChange={e => setSchedData({ ...schedData, amount: e.target.value })}
                      />
                    </div>
                    {schedData.type === 'Bridge' && (
                      <div className="ai-sched-field">
                        <label className="ai-sched-label">Bridge Token</label>
                        <select
                          className="ai-sched-select"
                          value={schedData.bridgeToken}
                          onChange={e => setSchedData({ ...schedData, bridgeToken: e.target.value })}
                        >
                          <option value="RIALO">RIALO</option>
                          <option value="ETH">ETH</option>
                          <option value="USDC">USDC</option>
                          <option value="USDT">USDT</option>
                        </select>
                      </div>
                    )}

                    <div className="ai-sched-field">
                      <label className="ai-sched-label">
                        {schedData.type === 'Bridge' ? 'From Network' : schedData.type === 'Stake' ? 'Asset Tier' : 'Token'}
                      </label>
                      <select
                        className="ai-sched-select"
                        value={schedData.type === 'Bridge' ? schedData.fromNetwork : schedData.type === 'Stake' ? schedData.stakingAssetType : schedData.fromToken}
                        onChange={e => setSchedData({ ...schedData, [schedData.type === 'Bridge' ? 'fromNetwork' : schedData.type === 'Stake' ? 'stakingAssetType' : 'fromToken']: e.target.value })}
                      >
                        {schedData.type === 'Swap' ? (
                          <>
                            <option value="RIALO">RIALO</option>
                            <option value="stRLO">stRLO</option>
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                            <option value="ETH">ETH</option>
                          </>
                        ) : schedData.type === 'Bridge' ? (
                          <>
                            <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                            <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                            <option value="Rialo Network">Rialo Network</option>
                          </>
                        ) : schedData.type === 'Stake' ? (
                          <>
                            <option value="Solo RLO">Solo RLO</option>
                            <option value="Pair (RLO+ETH)">Pair (RLO+ETH)</option>
                            <option value="Solo ETH">Solo ETH</option>
                          </>
                        ) : (
                          <>
                            <option value="RIALO">RIALO</option>
                            <option value="stRLO">stRLO</option>
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                            <option value="ETH">ETH</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="ai-sched-field">
                      <label className="ai-sched-label">
                        {schedData.type === 'Bridge' ? 'To Network' : schedData.type === 'Stake' ? 'Payout' : 'To Token/Address'}
                      </label>
                      {schedData.type === 'Send' ? (
                        <input
                          type="text"
                          className="ai-sched-input"
                          placeholder="0x..."
                          value={schedData.toAddress}
                          onChange={e => setSchedData({ ...schedData, toAddress: e.target.value })}
                        />
                      ) : (
                        <select
                          className="ai-sched-select"
                          value={schedData.type === 'Bridge' ? schedData.toNetwork : schedData.type === 'Stake' ? schedData.payoutType : schedData.toToken}
                          onChange={e => setSchedData({ ...schedData, [schedData.type === 'Bridge' ? 'toNetwork' : schedData.type === 'Stake' ? 'payoutType' : 'toToken']: e.target.value })}
                        >
                          {schedData.type === 'Bridge' ? (
                            <>
                              <option value="Ethereum Sepolia">Ethereum Sepolia</option>
                              <option value="Arbitrum Sepolia">Arbitrum Sepolia</option>
                              <option value="Rialo Network">Rialo Network</option>
                            </>
                          ) : (schedData.type === 'Stake') ? (
                            <>
                              <option value="RLO">RLO Yield</option>
                              <option value="RWA">RWA (Upfront)</option>
                            </>
                          ) : (
                            <>
                              <option value="RIALO">RIALO</option>
                              <option value="stRLO">stRLO</option>
                              <option value="ETH">ETH</option>
                              <option value="USDC">USDC</option>
                              <option value="USDT">USDT</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Time Value</label>
                      <input
                        type="number"
                        className="ai-sched-input"
                        value={schedData.timeVal}
                        onChange={e => setSchedData({ ...schedData, timeVal: e.target.value })}
                      />
                    </div>
                    <div className="ai-sched-field">
                      <label className="ai-sched-label">Unit</label>
                      <select
                        className="ai-sched-select"
                        value={schedData.timeUnit}
                        onChange={e => setSchedData({ ...schedData, timeUnit: e.target.value })}
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                      </select>
                    </div>
                    {schedData.type === 'Stake' && (
                      <>
                        <div className="ai-sched-field">
                          <label className="ai-sched-label">Lock Period</label>
                          <select
                            className="ai-sched-select"
                            value={schedData.lockMonths}
                            onChange={e => setSchedData({ ...schedData, lockMonths: e.target.value })}
                          >
                            <option value="0">Flexible</option>
                            <option value="1">1 Month</option>
                            <option value="3">3 Months</option>
                            <option value="6">6 Months</option>
                            <option value="12">12 Months</option>
                            <option value="24">24 Months</option>
                            <option value="48">48 Months</option>
                          </select>
                        </div>
                        <div className="ai-sched-field">
                          <label className="ai-sched-label">SFS Routing (%)</label>
                          <input
                            type="number"
                            className="ai-sched-input"
                            value={schedData.sfsFraction}
                            onChange={e => setSchedData({ ...schedData, sfsFraction: e.target.value })}
                          />
                        </div>
                      </>
                    )}
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
                onClick={() => { setSchedData(prev => ({ ...prev, type: 'Swap' })); setShowSchedulePanel(true); }}
                disabled={!sessionActive}
                className={`ai-command-chip ${!sessionActive ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${showSchedulePanel && schedData.type === 'Swap' ? 'border-primary text-primary bg-primary/10' : ''}`}
              >
                <span className="material-symbols-outlined text-[12px] align-middle mr-1">{!sessionActive ? 'lock' : 'swap_horiz'}</span>
                Swap
              </button>
              <button
                onClick={() => { setSchedData(prev => ({ ...prev, type: 'Bridge' })); setShowSchedulePanel(true); }}
                disabled={!sessionActive}
                className={`ai-command-chip ${!sessionActive ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${showSchedulePanel && schedData.type === 'Bridge' ? 'border-primary text-primary bg-primary/10' : ''}`}
              >
                <span className="material-symbols-outlined text-[12px] align-middle mr-1">{!sessionActive ? 'lock' : 'lan'}</span>
                Bridge
              </button>
              <button
                onClick={() => { setSchedData(prev => ({ ...prev, type: 'Stake' })); setShowSchedulePanel(true); }}
                disabled={!sessionActive}
                className={`ai-command-chip ${!sessionActive ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${showSchedulePanel && schedData.type === 'Stake' ? 'border-primary text-primary bg-primary/10' : ''}`}
              >
                <span className="material-symbols-outlined text-[12px] align-middle mr-1">{!sessionActive ? 'lock' : 'account_balance_wallet'}</span>
                Staking
              </button>
              <button
                onClick={() => { setSchedData(prev => ({ ...prev, type: 'Send' })); setShowSchedulePanel(true); }}
                disabled={!sessionActive}
                className={`ai-command-chip ${!sessionActive ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${showSchedulePanel && schedData.type === 'Send' ? 'border-primary text-primary bg-primary/10' : ''}`}
              >
                <span className="material-symbols-outlined text-[12px] align-middle mr-1">{!sessionActive ? 'lock' : 'send'}</span>
                Send
              </button>
              <button
                onClick={() => setInput("swap 1 ETH to USDC at 2500")}
                disabled={!sessionActive}
                className={`ai-command-chip ${!sessionActive ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
              >
                <span className="material-symbols-outlined text-[12px] align-middle mr-1">{!sessionActive ? 'lock' : 'trending_up'}</span>
                Auto Buy/Sell
              </button>
            </div>
            {/* Zero Balance Warning */}
            {tickingCredits < 10 && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '8px',
                fontSize: '11px',
                color: 'rgba(239,68,68,0.8)',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                ⚡ {Math.floor(tickingCredits)} Credits remaining · 5 per chat / 10 per automation<br />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Top up by staking more USDT or wait for next cycle</span>
              </div>
            )}
            <form className="ai-form" onSubmit={handleSend}>
              <input
                type="text"
                className="ai-input"
                placeholder={tickingCredits < 5 ? "Insufficient credits – top up to chat" : "Ask about swaps, bridging, or staking..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={tickingCredits < 5}
                style={tickingCredits < 5 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              />
              <button
                type="submit"
                className="ai-send"
                disabled={tickingCredits < 5}
                style={tickingCredits < 5 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >Send</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
