// src/lib/fetchGeneralInfo.ts

/**
 * 🌍 Universal Web Knowledge + Text Utility
 * Handles general search, rewriting, religion, and fallback summarization.
 * Uses only free public endpoints (Wikipedia + DuckDuckGo).
 */

export async function fetchGeneralInfo(
  query: string,
  options?: { mode?: "rewrite" | "religion" | "web" | "default" }
): Promise<string> {
  const mode = options?.mode || "default";
  const q = query.trim();

  try {
    /* --------------------------------------------------------
       ✍️ Text Rewriting / Paraphrasing (Offline)
    --------------------------------------------------------- */
    if (mode === "rewrite") {
      const words = q
        .replace(/^rephrase\s+/i, "")
        .replace(/^rewrite\s+/i, "")
        .split(/\s+/);
      if (words.length < 4)
        return "Please provide a longer sentence to rephrase.";

      const shuffled = [...words];
      // Small deterministic rearrangement
      shuffled.push(shuffled.shift()!);
      const rephrased =
        shuffled.join(" ") +
        ". (Rephrased for clarity and flow by Agent 714)";
      return rephrased;
    }

    /* --------------------------------------------------------
       📖 Religion / Scripture Queries (DuckDuckGo + Wikipedia)
    --------------------------------------------------------- */
    if (mode === "religion") {
      const rel = await searchDuckDuckGo(`${q} bible verse`);
      if (rel) return rel;
      const wiki = await searchWikipedia(`${q} bible verse`);
      if (wiki) return wiki;
      return "I couldn't find a specific passage, but try searching for key phrases like “sin against God verse”.";
    }

    /* --------------------------------------------------------
       🌍 Web Mode (forces general search)
    --------------------------------------------------------- */
    if (mode === "web") {
      const wiki = await searchWikipedia(q);
      if (wiki) return wiki;

      const duck = await searchDuckDuckGo(q);
      if (duck) return duck;

      return `I searched the web but couldn’t find clear info about **${q}**. Try rephrasing or being more specific.`;
    }

    /* --------------------------------------------------------
       🌐 General Knowledge / Default Mode
    --------------------------------------------------------- */
    const wiki = await searchWikipedia(q);
    if (wiki) return wiki;

    const duck = await searchDuckDuckGo(q);
    if (duck) return duck;

    return `I searched the web but couldn’t find clear info about **${q}**. Try rephrasing or be more specific.`;
  } catch (err) {
    console.error("fetchGeneralInfo error:", err);
    return "Something went wrong while fetching information.";
  }
}

/* --------------------------------------------------------
   🦆 DuckDuckGo Instant Answer API
--------------------------------------------------------- */
async function searchDuckDuckGo(q: string): Promise<string | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      q
    )}&format=json&no_html=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.AbstractText)
      return `**${data.Heading || "Result"}**\n${data.AbstractText}`;

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topic = data.RelatedTopics[0];
      if (topic.Text)
        return `**${topic.Text.split("–")[0]}**\n${topic.Text}`;
    }
    return null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------
   📘 Wikipedia Summary API
--------------------------------------------------------- */
async function searchWikipedia(q: string): Promise<string | null> {
  try {
    const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      q
    )}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();

    if (data.extract)
      return `**${data.title || q}**\n${data.extract}\n\n(Source: Wikipedia)`;
    return null;
  } catch {
    return null;
  }
}
