import axios from "axios";

/**
 * fetchKnowledge.ts
 * Handles reasoning-type or educational queries (non-crypto specific)
 * Uses open/free endpoints and web search as fallback
 */

export async function fetchKnowledge(query: string) {
  try {
    // 🧠 1️⃣ Try DuckDuckGo Instant Answer API (free, no key)
    const duckUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&no_html=1`;
    const duckRes = await axios.get(duckUrl);
    const duckData = duckRes.data;

    if (duckData.AbstractText || duckData.Answer) {
      return {
        source: "duckduckgo",
        title: duckData.Heading || "General Knowledge",
        summary: duckData.AbstractText || duckData.Answer,
        url: duckData.AbstractURL || null,
        related: duckData.RelatedTopics?.slice(0, 3)?.map((t: any) => ({
          text: t.Text,
          url: t.FirstURL,
        })),
      };
    }

    // 🌍 2️⃣ Try Wikipedia summary API
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      query
    )}`;
    const wikiRes = await axios.get(wikiUrl);
    const wikiData = wikiRes.data;

    if (wikiData.extract) {
      return {
        source: "wikipedia",
        title: wikiData.title,
        summary: wikiData.extract,
        url: wikiData.content_urls?.desktop?.page || null,
        thumbnail: wikiData.thumbnail?.source || null,
      };
    }

    // 💡 3️⃣ Try Open-Meteo’s public data or any open dataset (for factual or date queries)
    if (/weather|temperature|climate/i.test(query)) {
      const weatherRes = await axios.get(
        "https://api.open-meteo.com/v1/forecast?latitude=6.5244&longitude=3.3792&current_weather=true"
      );
      const weatherData = weatherRes.data?.current_weather;
      if (weatherData) {
        return {
          source: "open-meteo",
          title: "Current Weather Data",
          summary: `Temperature: ${weatherData.temperature}°C, Windspeed: ${weatherData.windspeed}km/h.`,
          url: "https://open-meteo.com/",
        };
      }
    }

    // 🌐 4️⃣ Web search fallback (using DuckDuckGo HTML results)
    const webSearch = await axios.get(
      `https://api.allorigins.win/get?url=${encodeURIComponent(
        "https://duckduckgo.com/html/?q=" + query
      )}`
    );
    const webText = webSearch.data?.contents || "";

    const resultSnippet = webText
      .replace(/<[^>]+>/g, "")
      .split(".")
      .slice(0, 3)
      .join(". ");

    if (resultSnippet) {
      return {
        source: "web-search",
        title: "Web Search Result",
        summary: resultSnippet,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      };
    }

    // 🚫 If no data found:
    return {
      error: true,
      message: `I couldn't find detailed info on "${query}". Try rephrasing or adding more context.`,
    };
  } catch (err: any) {
    console.error("Error in fetchKnowledge:", err.message);
    return {
      error: true,
      message: "Unable to fetch knowledge data at the moment.",
    };
  }
}
