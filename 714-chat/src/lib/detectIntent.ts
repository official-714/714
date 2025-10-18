/**
 * detectIntent.ts
 * Lightweight intent detection logic for your AI Agent
 * Uses keyword + pattern matching to route requests intelligently
 */

export type IntentType =
  | "crypto"
  | "address"
  | "general"
  | "knowledge"
  | "rephrase"
  | "rewrite"
  | "text_rewrite"
  | "religion"
  | "religion_search"
  | "web"
  | "unknown";

export function detectIntent(query: string): IntentType {
  const q = query.toLowerCase().trim();

  // ✍️ 1️⃣ Rephrase / Rewrite
  if (/rephrase|rewrite|paraphrase|improve|simplify|make clearer/i.test(q)) {
    return /text|sentence|paragraph/.test(q) ? "text_rewrite" : "rewrite";
  }

  // 🕊️ 2️⃣ Religion / Scriptures / Faith topics
  if (
    /bible|jesus|god|quran|koran|verse|prayer|scripture|psalm|genesis|matthew|corinthians|holy|faith|islam|christian|church|mosque/i.test(
      q
    )
  ) {
    return /about|search|find/i.test(q)
      ? "religion_search"
      : "religion";
  }

  // 💰 3️⃣ Crypto queries (prices, tokens, wallets)
  if (
    /(price|token|coin|market|btc|eth|sol|bnb|matic|crypto|wallet|block|hash|transaction|chain|exchange)/i.test(
      q
    )
  ) {
    if (/^0x[a-fA-F0-9]{40}$/.test(q) || /wallet|address/i.test(q)) {
      return "address";
    }
    return "crypto";
  }

  // 🧠 4️⃣ Knowledge / Educational / Informational
  if (
    /(who|when|why|how|history|explain|describe|summarize|teach|learn|education|sport|game|finance|economy|stock|founder|year|origin|project|company)/i.test(
      q
    )
  ) {
    return "knowledge";
  }

  // 🌐 5️⃣ General search / Web lookups
  if (
    /(news|info|information|tell me|search|find|latest|current|today|lookup|query|web|internet)/i.test(
      q
    )
  ) {
    return "web";
  }

  // 🔗 6️⃣ Wallet / Blockchain address
  if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
    return "address";
  }

  // 🌀 7️⃣ Fallback
  return "unknown";
}
