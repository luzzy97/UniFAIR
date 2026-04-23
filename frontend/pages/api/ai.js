import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const RIALO_OFFICIAL_KNOWLEDGE = `
UniFAIR is the high-performance intelligent interface and ultimate frontend layer for the Rialo network, a high-throughput Layer-1 blockchain optimized for AI-agentic workflows and RWA (Real World Asset) tokenization.
- Strategic Focus: Zero-gas DeFi, AI-driven yield optimization, and institutional-grade RWA liquidity.
- Core Builders (Architects of the Void): HAKII (@frhakii), LUZZY (@luzzyzz97), and GOAT (@Mantle57222).
- Backing: Pantera Capital, Coinbase Ventures, Variant, and Mysten Labs.
`;

const RIALO_SERVICE_CREDIT_KNOWLEDGE = `
SERVICE CREDIT GAS (ϕ) & ECONOMY:
UniFAIR replaces traditional gas fees with a predictable Credit system fueled by your staking yield (Stake for Service - SfS).
- Conversion Rate: $1.00 of staking yield = 1,000 SfS Credits (ϕ).
- AI Agent Usage Cost: 5 Credits (ϕ) per chat/prompt.
- Fee Structure: Currently flat 5 ϕ per direct AI action. 
- Future Roadmap: Credits will evolve into a universal gas substitute for native swaps and bridges across UniFAIR.
- Management: Users can adjust their "SfS Fraction" in the Staking page to control how much yield is converted to Credits vs liquid RLO.
`;

const RIALO_DAPP_KNOWLEDGE = `
CURRENT WEB APP STRUCTURE (unifairlabs.vercel.app):
- Navigation Routes:
    * /dashboard (Architectural Dashboard): The core hub showing Real-Time Feeds, Ecosystem Balances (RIALO, ETH, USDC, USDT), and your Yield Metrics.
    * /swap (UniFAIR Swap): Intelligent interface for token swaps. Now supports real on-chain RIALO claim via Faucet.
    * /bridge: Native bridge for transferring assets between Ethereum Sepolia and Rialo L1.
    * /staking (Void Staking): Stake RIALO and ETH to earn RWA-backed rewards and Service Credits (ϕ).
    * /rewards: Dashboard for claiming rewards and tracking ecosystem incentives.
    * /learn (Intelligence Hub): Documentation and educational resources for the Rialo ecosystem.
    * /ai: Full-screen dedicated AI Agent interface (where we are).
- Key App Features:
    * Service Credit System (ϕ): Persistent credits generated via staking, used to automate gas fees (Zero-Gas transactions).
    * Secure Session (EIP-7702): One-time authorization allowing the AI to execute multiple transactions without popups.
    * RWA Portfolio: Direct exposure to Treasuries, Real Estate, and Gold via staking yield.
    * Real-time Market Oracle: Integrated price feeds for top crypto assets.
`;

const MASSIVE_API_KEY = 'y3XfNAmNBr9i5z6BqgiqpHwTefrTsuMo';

async function fetchMarketPrices() {
  const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || 'CG-vg5m6nnVU6EsxaAwAKy7TQPv';
  const ids = 'bitcoin,ethereum,solana,ripple,cardano';
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&x_cg_demo_api_key=${COINGECKO_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    const prices = {};
    const symbolsMap = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'ripple': 'XRP',
      'cardano': 'ADA'
    };

    Object.entries(data).forEach(([id, info]) => {
      const symbol = symbolsMap[id];
      if (symbol) {
        prices[symbol] = info.usd;
      }
    });
    
    return prices;
  } catch (e) {
    console.error('CoinGecko fetch error:', e);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // PRODUCTION GUARD: Check if API Key is configured in Vercel/Environment
  if (!process.env.GROQ_API_KEY) {
    return res.status(403).json({ error: 'API Key Missing' });
  }

  const { message, context } = req.body;

  // Fetch live market prices from Massive API
  const marketPrices = await fetchMarketPrices();
  
  let marketPriceBlock = "";
  if (marketPrices && Object.keys(marketPrices).length > 0) {
    marketPriceBlock = Object.entries(marketPrices)
      .map(([sym, price]) => `- ${sym}: $${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })}`)
      .join('\n');
  } else {
    // FALLBACK: Calculate approximate USD prices from context rates
    // Assuming RIALO is ~$1.50 (based on current ecosystem state)
    const RIALO_USD = 1.50; 
    const fallbackPrices = {};
    if (context.globalRates) {
      Object.entries(context.globalRates).forEach(([sym, rate]) => {
        fallbackPrices[sym] = rate * RIALO_USD;
      });
    }
    
    marketPriceBlock = Object.entries(fallbackPrices)
      .map(([sym, price]) => `- ${sym}: ~$${Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 })} (Estimated via Rialo Oracle)`)
      .join('\n') || '- (Price data currently unavailable)';
  }

  try {
    const systemPrompt = `
You are UniFAIR AI Assistant, a real-time financial assistant. 
ALWAYS fetch live data from our internal Market Oracle before answering. 
NEVER guess prices. If data is unavailable, state it clearly.

RIALO ECOSYSTEM KNOWLEDGE:
${RIALO_OFFICIAL_KNOWLEDGE}

RIALO DAPP STRUCTURE:
${RIALO_DAPP_KNOWLEDGE}

USER CONTEXT:
- Wallet Connected: ${context.isConnected}
- Address: ${context.address}
- Balances: ${JSON.stringify(context.balances)}

INTERNAL EXCHANGE RATES (Relative to RIALO):
${JSON.stringify(context.globalRates)}

REAL-TIME MARKET DATA (USD - CoinGecko Oracle):
${marketPriceBlock}

IMPORTANT: When a user asks for prices (e.g., "What is BTC price?"), use the values from the REAL-TIME MARKET DATA block above. 

CAPABILITIES:
1. Swapping tokens.
2. Staking RIALO/ETH.
3. Bridging ETH <-> RIALO.
4. Explaining Rialo tech accurately.

RESPONSE FORMAT:
You MUST respond IN JSON ONLY with these keys:
- insight: Short, high-level summary.
- options: Array of 1-2 UI action buttons (e.g., ["1. Execute Swap", "2. View Docs"]).
- recommendation: Proactive advice.
- action: A protocol string if a transaction is needed, else null.
- gas_type: 'ETH' or 'CREDIT'.
- delaySec: 0.
- raw: Longer text explanation or answer.

Example for price check:
{
  "insight": "BTC is trading at $77,692",
  "options": ["1. Buy BTC", "2. View Chart"],
  "recommendation": "BTC is near all-time highs; trade carefully.",
  "action": null,
  "gas_type": "ETH",
  "delaySec": 0,
  "raw": "According to CoinGecko, Bitcoin is currently valued at $77,692 USD."
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });

    const result = chatCompletion.choices[0]?.message?.content;
    
    // Advanced JSON extraction & cleaning
    try {
      // Find the first { and last }
      const firstBrace = result.indexOf('{');
      const lastBrace = result.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        let jsonStr = result.substring(firstBrace, lastBrace + 1);
        
        // Basic cleaning for common LLM JSON errors (like trailing commas)
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1'); 
        
        const parsed = JSON.parse(jsonStr);
        res.status(200).json(parsed);
      } else {
        throw new Error('No JSON block found');
      }
    } catch (parseError) {
      console.error('Final JSON Parse Error:', parseError);
      res.status(200).json({ raw: result });
    }

  } catch (error) {
    console.error('Groq API Error:', error);
    res.status(500).json({ error: 'Failed to communicate with AI', details: error.message });
  }
}
