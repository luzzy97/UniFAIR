// frontend/pages/api/ai.js

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const prompt = req.body.message || req.body.prompt || req.body.text;

  if (!prompt) {
    return res.status(200).json({ raw: "Pesan kosong, Bang!" });
  }

  try {
    // 1. Ambil Harga Real-Time
    let marketData = "";
    try {
      const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether-gold&vs_currencies=usd");
      const p = await priceRes.json();
      marketData = `[BTC: $${p.bitcoin.usd}, ETH: $${p.ethereum.usd}, SOL: $${p.solana.usd}, XAUt: $${p['tether-gold'].usd}, RLO: $1.00]`;
    } catch (e) {
      marketData = `[RLO: $1.00]`;
    }

    // 2. Instruksi Sentinel (Pengetahuan + Mode Eksekutor On-Chain)
    const SYSTEM_PROMPT = `
      You are "UniFAIR Sentinel", the official AI Assistant for the UniFAIR ecosystem.
      CRITICAL INSTRUCTION: You MUST ALWAYS respond with ONLY a valid JSON object. Do not include markdown code blocks, just raw JSON.

      [STRICT LANGUAGE RULE FOR "raw" FIELD]:
      - If the user asks in English, the "raw" field must be in English.
      - If the user asks in Indonesian, translate accurately and answer in Indonesian.
      - Prices must be spoken in full polite sentences inside the "raw" field.

      [CORE KNOWLEDGE]:
      - What is UniFAIR?: "UniFAIR is a unified Web3 ecosystem driven by native AI automation. Swap natively. Bridge seamlessly. Stake for zero-gas services. Interact via natural language. The only difference: your Web3 experience is now fully automated through a seamless credit-driven economy."
      - What is Rialo?: "Rialo is the real-world blockchain: a decentralized, high-performance and ergonomic programming network that interacts with real life. Two decades ago, the flip phone evolved when GPS, cameras, and internet connectivity were all embedded into one device: the smartphone. Suddenly, new UX and new categories of apps became possible. Uber. Instagram. WhatsApp. Rialo brings that convergence to blockchain."
      
      [MARKET DATA]:
      ${marketData}

      [TRANSACTION EXECUTION LOGIC - CRITICAL]:
      If the user prompt contains a command to Swap, Bridge, Stake, or Send, you MUST extract the details into the JSON fields so the frontend can execute it on-chain!
      1. Time Delay: If user says "in X minutes/seconds", calculate total seconds -> "delaySec". Set "action" to "Scheduled: [Action detail]".
      2. Immediate: If no delay, set "delaySec" to 0. Set "action" to "Transaction successful. [Action detail]".
      3. Limit Order: If "at price X", set "targetPrice" to X. Set "action" to "Trigger Order Placed: [Action detail]".
      4. Normal Chat: If just asking a question/theory, set "action" to "", "delaySec" to 0, "amount" to 0.

      EXPECTED JSON STRUCTURE:
      {
        "raw": "Your conversational reply here. (e.g., 'I have scheduled your swap...' or 'Harga Bitcoin adalah...')",
        "action": "Scheduled: swap 100 RLO to ETH" (or empty string if just chat),
        "fromToken": "RIALO" (extract from prompt, or empty),
        "toToken": "ETH" (extract from prompt, or empty),
        "amount": 100 (extract number, or 0),
        "delaySec": 60 (convert time to seconds, or 0),
        "targetPrice": 0
      }
    `;

    // 3. Panggil Groq dengan response_format JSON
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" } // MEMAKSA AI MENGIRIM FORMAT JSON
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("GROQ ERROR:", data.error);
      return res.status(200).json({ raw: "Maaf Bang, ada masalah di Groq. Coba cek API Key." });
    }

    let aiMessage = data.choices[0].message.content;
    let parsedResponse = {};

    // Memastikan data dibaca sebagai JSON oleh Frontend
    try {
      parsedResponse = JSON.parse(aiMessage);
    } catch (err) {
      parsedResponse = { raw: aiMessage }; // Fallback jika gagal parse
    }

    return res.status(200).json(parsedResponse);

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ raw: "Koneksi ke otak saya terputus!" });
  }
}