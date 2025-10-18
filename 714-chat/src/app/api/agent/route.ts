// src/app/api/agent/route.ts
import { NextResponse } from "next/server";
import { detectIntent } from "@/lib/detectIntent";
import { fetchCrypto } from "@/lib/fetchCrypto";
import { fetchTokenByAddress } from "@/lib/fetchByAddress";
import { fetchKnowledge } from "@/lib/fetchKnowledge";
import { fetchGeneralInfo } from "@/lib/fetchGeneralInfo";

function looksLikeAddress(q: string): boolean {
  if (!q) return false;
  const t = q.trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return true; // EVM
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return true; // Solana/Base58
  if (/^[T1][a-zA-Z0-9]{33}$/.test(t)) return true; // Tron
  return false;
}

/* --------------------------------------------------------
   🌍 GLOBAL AGENT HANDLER
--------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { reply: "Please enter a valid question or message." },
        { status: 400 }
      );
    }

    const cleaned = message.trim();
    const intent = detectIntent(cleaned);

    /* --------------------------------------------------------
       🔗 1️⃣ Contract Address Lookup
    --------------------------------------------------------- */
    if (looksLikeAddress(cleaned)) {
      const tokenData = await fetchTokenByAddress(cleaned);
      if (typeof tokenData === "string")
        return NextResponse.json({ reply: tokenData });

      const reply = `**${tokenData.name} (${tokenData.symbol})**
🌐 Platform: ${tokenData.platform || "Unknown"}
💰 Price: ${tokenData.price}
📊 24h Change: ${tokenData.change ?? "N/A"}%
📈 Chart points: ${tokenData.chartPoints?.length ?? 0}
📖 ${tokenData.description || "No description available"}`;

      return NextResponse.json({
        reply,
        chartPoints: tokenData.chartPoints,
        slug:
          tokenData.slug ||
          tokenData.symbol?.toLowerCase() ||
          tokenData.name?.toLowerCase(),
        contractAddress: cleaned,
      });
    }

    /* --------------------------------------------------------
       💰 2️⃣ Crypto Queries (Name / Symbol / Price / History)
    --------------------------------------------------------- */
    if (
      [
        "crypto_price",
        "crypto_info",
        "crypto_history",
        "crypto_price_historical",
      ].includes(intent)
    ) {
      const result = await fetchCrypto(cleaned);
      if (typeof result === "string")
        return NextResponse.json({ reply: result });

      const crypto = result;
      const reply = `**${crypto.name} (${crypto.symbol})**
💰 Price: ${crypto.price}
📊 24h Change: ${crypto.change24h ?? "N/A"}%
📈 ${crypto.chartPoints?.length ?? 0} points chart data ready
📖 ${crypto.description || "No summary available."}`;

      return NextResponse.json({
        reply,
        chartPoints: crypto.chartPoints,
        slug:
          crypto.slug ||
          crypto.symbol?.toLowerCase() ||
          crypto.name?.toLowerCase(),
      });
    }

    /* --------------------------------------------------------
       🧠 3️⃣ Knowledge / Project / Educational Queries
    --------------------------------------------------------- */
    if (
      [
        "crypto_info",
        "network_info",
        "project_info",
        "company_info",
        "education_info",
        "finance_info",
        "sports_info",
        "gaming_info",
      ].includes(intent)
    ) {
      const info = await fetchKnowledge(cleaned);
      return NextResponse.json({
        reply:
          info ||
          `I couldn’t find detailed info on that topic. Try rephrasing or being more specific.`,
      });
    }

    /* --------------------------------------------------------
       ✍️ 4️⃣ Text Rewrite / Rephrase
    --------------------------------------------------------- */
    if (intent === "rewrite" || intent === "text_rewrite") {
      const rewritten = await fetchGeneralInfo(cleaned, { mode: "rewrite" });
      return NextResponse.json({
        reply: `Here’s a clearer version 👇\n\n${rewritten}`,
      });
    }

    /* --------------------------------------------------------
       📖 5️⃣ Religion / Scriptures
    --------------------------------------------------------- */
    if (intent === "religion" || intent === "religion_search") {
      const bible = await fetchGeneralInfo(cleaned, { mode: "religion" });
      return NextResponse.json({
        reply:
          bible ||
          "No matching scripture found right now. Try being more specific (e.g. 'Bible verse about forgiveness').",
      });
    }

    /* --------------------------------------------------------
       🌐 6️⃣ Global Web / Unknown Queries
    --------------------------------------------------------- */
    const webResult = await fetchGeneralInfo(cleaned, { mode: "web" });
    if (webResult && typeof webResult === "string") {
      return NextResponse.json({ reply: webResult });
    }

    /* --------------------------------------------------------
       🗣️ 7️⃣ Fallback
    --------------------------------------------------------- */
    return NextResponse.json({
      reply: `I'm **Agent 714**, your intelligent assistant 🌍  
I couldn’t locate an exact answer, but you can ask me about:
- 💰 Crypto prices or contract addresses
- 🧠 Blockchain networks & projects
- 🏦 Finance, business, and world data
- 📚 Educational or sports facts
- ✍️ Rephrasing or language help
- 🙏 Bible & religion topics
- 🌐 General web information`,
    });
  } catch (err) {
    console.error("Agent route error:", err);
    return NextResponse.json(
      { reply: "An error occurred while processing your request." },
      { status: 500 }
    );
  }
}
