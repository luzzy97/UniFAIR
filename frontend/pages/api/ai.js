import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const RIALO_OFFICIAL_KNOWLEDGE = `
Rialo is a high-throughput Layer-1 blockchain optimized for AI-agentic workflows.
- Backing: Pantera Capital, Coinbase Ventures, Variant, and Mysten Labs.
`;

const RIALO_SERVICE_CREDIT_KNOWLEDGE = `
SERVICE CREDIT GAS (ϕ):
Rialo allows users to pay for AI-automated transaction fees using Service Credits instead of ETH.
- Fee: Flat 0.05 ϕ per transaction (any amount).
- Priority: If user has enough credits (context.tickingCredits >= 0.05), prioritize using them for a "Zero-Gas" feel by setting gas_type to 'CREDIT'.
`;

const RIALO_DAPP_KNOWLEDGE = `
CURRENT WEB APP STRUCTURE (rialohq.vercel.app):
- Navigation Routes:
    * /dashboard: Main hub with real-time balance cards and transaction history.
    * /swap: Interface for token swaps (RIALO, ETH, USDC, USDT). Supports Service Credits for gas.
    * /bridge: Native bridge between Ethereum and Rialo L1.
    * /staking: Dedicated page to stake RIALO and ETH for rewards.
    * /rewards: Detailed breakdown of accumulated staking yield and ecosystem incentives.
    * /learn: Educational hub for understanding Rialo's unique tech stack.
    * /ai: Full-screen AI Assistant interface (where we are).
- Key App Features:
    * Ecosystem Balances Dashboard: Located on the dashboard, shows live-updating Staking Rewards (RLO) and Service Credits (ϕ).
    * Service Credit System: A persistent credit balance used to automate gas fees for users.
    * Session Keys (EIP-7702): Allows the AI to automate transactions securely with one-time authorization.
    * Real-time Price Oracle: Integrated with CoinGecko for top 10 tokens.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, context } = req.body;

  try {
    const systemPrompt = `
You are Rialo AI Assistant, a powerful DeFi agent for the Rialo Layer-1 blockchain.
Your goal is to help users manage their assets (RIALO, ETH, USDC, USDT) with precision and professional insight.

RIALO ECOSYSTEM KNOWLEDGE:
${RIALO_OFFICIAL_KNOWLEDGE}

RIALO DAPP (rialohq.vercel.app) STRUCTURE:
${RIALO_DAPP_KNOWLEDGE}

USER CONTEXT:
- Wallet Connected: ${context.isConnected}
- Current Page: ${context.currentPage || 'Unknown'}
- Address: ${context.address}
- Balances: ${JSON.stringify(context.balances)}
- Staked Balance: ${context.stakedBalance} RLO
- Staked ETH: ${context.stakedEthBalance} ETH
- Service Credits: ${context.tickingCredits} ϕ
- Total Operations: ${context.operationsCount}

REAL-TIME RATES (vs USDC):
${JSON.stringify(context.globalRates)}

CAPABILITIES:
1. Swapping tokens.
2. Staking RIALO/ETH.
3. Bridging ETH <-> RIALO.
4. Explaining Rialo tech accurately based on the OFFICIAL DATA above.

RESPONSE FORMAT:
You MUST respond IN JSON ONLY with these keys:
- insight: Short, high-level summary.
- options: Array of 1-2 UI action buttons (e.g., ["1. Execute Swap", "2. View Docs"]).
- recommendation: Proactive advice based on balance/yield. Mention if they are using Credits for gas.
- action: A protocol string that triggers the UI. 
- gas_type: MUST be either 'ETH' (default) or 'CREDIT' (if credits used).  FORMATS:
  - 'Transaction successful. [Amount] [From] -> [To] has been completed.' (To trigger swap)
  - 'Transaction successful. Staking [Amount] [Token] is now active.' (To trigger stake)
  - 'Scheduled: [Amount] [From] -> [To]' (To trigger schedule)
- raw: Longer text explanation if it's a general question.

If the user just says hello or asks a question without wanting a transaction, leave 'action' as null and put the text in 'raw'.

Example for 'price of btc':
{
  "insight": "BTC is currently trading at $X",
  "options": ["1. View Chart", "2. Trade BTC"],
  "recommendation": "BTC volatility is high; consider DCA.",
  "action": "Price Checked: 1 BTC is $X USDC",
  "raw": "Bitcoin is currently trading at $X according to the CoinGecko Oracle."
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile', // High-performance supported Groq model
      temperature: 0.2, // Keep it precise
    });

    const result = chatCompletion.choices[0]?.message?.content;
    
    // Attempt to parse JSON from the response
    try {
      const parsed = JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
      res.status(200).json(parsed);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, 'Raw Result:', result);
      res.status(200).json({ raw: result });
    }

  } catch (error) {
    console.error('Groq API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with AI', details: error.message });
  }
}
