import { useState, useRef, useEffect } from 'react';

// Mock logic matching the system prompt
const getAiResponse = (input) => {
  const lower = input.toLowerCase();
  
  // Direct swap execution (e.g., "swap 100 rialo to eth")
  const swapMatch = lower.match(/(?:swap|tukar)\s+([\d.]+)\s+([a-z0-9]+)\s+(?:to|ke)\s+([a-z0-9]+)/i);
  if (swapMatch) {
    const amount = swapMatch[1];
    const fromToken = swapMatch[2].toUpperCase();
    const toToken = swapMatch[3].toUpperCase();
    return {
      insight: `Optimal route found for ${amount} ${fromToken} to ${toToken}. Slippage is low (<0.5%).`,
      options: ["1. Aggregator Route (Best price, lowest gas)"],
      recommendation: "Execute swap via Aggregator.",
      action: `Transaction prepared. Please confirm the swap of ${amount} ${fromToken} -> ${toToken} in your wallet.`
    };
  }

  // Direct bridge execution (ETH to RIALO only)
  const bridgeMatch = lower.match(/(?:bridge|kirim)\s+([\d.]+)\s+eth\s+(?:to|ke)\s+rialo/i);
  if (bridgeMatch) {
    const amount = bridgeMatch[1];
    return {
      insight: `Rialo Bridge is clear. Direct optimization for ETH -> RIALO is active.`,
      options: ["1. Native Rialo Bridge (Lowest fee, high security)"],
      recommendation: "Execute bridge via the native Rialo protocol.",
      action: `Transaction prepared. Please confirm bridging ${amount} ETH to RIALO in your wallet.`
    };
  }

  // Direct stake execution (e.g., "stake 1000 rialo")
  const stakeMatch = lower.match(/(?:stake|staking)\s+([\d.]+)\s+([a-z0-9]+)/i);
  if (stakeMatch) {
    const amount = stakeMatch[1];
    const token = stakeMatch[2].toUpperCase();
    return {
      insight: `${token} staking pool currently yielding high APY with low risk.`,
      options: ["1. Standard Staking Pool"],
      recommendation: "Lock in the current APY now.",
      action: `Transaction prepared. Please confirm staking ${amount} ${token} in your wallet.`
    };
  }

  // Generic Swap
  if (lower.includes('swap') || lower.includes('tukar')) {
    return {
      insight: "Liquidity is strong and gas is currently reasonable on Layer 2s.",
      options: ["1. Swap on Ethereum mainnet (higher gas, deeper liquidity)", "2. Swap via Arbitrum (lower fees)"],
      recommendation: "Use Arbitrum for lower fees unless you're swapping a large amount.",
      action: "Provide amount and preferred chain (e.g., 'swap 100 RIALO to ETH')."
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
    raw: "I am ready to optimize your next DeFi move. Contoh: 'swap 100 RIALO to ETH', 'bridge 0.5 ETH to RIALO', atau 'stake 100 RIALO'."
  };
};

export default function AiAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: { raw: "Rialo AI is online. How can I optimize your on-chain operations today?" } }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

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
    }, 600);
  };

  return (
    <>
      <style>{`
        .ai-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'Inter', sans-serif;
        }
        .ai-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #0e0e0f;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ai-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .ai-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 360px;
          height: 500px;
          background: #0e0e0f;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          box-shadow: 0 16px 64px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          transform: translateY(10px);
          transition: opacity 0.3s, transform 0.3s;
        }
        .ai-window.open {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
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
      `}</style>

      <div className="ai-widget">
        <button className="ai-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle AI Agent">
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <div className={`ai-window ${isOpen ? 'open' : ''}`}>
          <div className="ai-header">
            <div className="ai-title">
              <span className="ai-status-dot"></span>
              Rialo AI
            </div>
            <button className="ai-close" onClick={() => setIsOpen(false)}>&times;</button>
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
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-footer">
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
