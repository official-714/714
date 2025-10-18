import axios from "axios";

const COVALENT_KEY = process.env.NEXT_PUBLIC_COVALENT_API_KEY;

// Helper to clean/normalize input
function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export async function fetchCrypto(query: string) {
  const symbol = normalizeSymbol(query);

  try {
    /* --------------------------------------------------------
       1️⃣ COVALENT (Multi-chain data)
    --------------------------------------------------------- */
    const covalentUrl = `https://api.covalenthq.com/v1/pricing/tickers/?tickers=${symbol}&key=${COVALENT_KEY}`;
    const covalentRes = await axios.get(covalentUrl);
    const covalentData = covalentRes.data?.data?.items?.[0];

    if (covalentData) {
      return {
        source: "covalent",
        name: covalentData.contract_name || symbol,
        symbol: covalentData.contract_ticker_symbol,
        price: covalentData.quote_rate,
        marketCap: covalentData.market_cap_usd,
        volume24h: covalentData.volume_24h,
        logo: covalentData.logo_url,
        change24h: covalentData.quote_rate_24h_change,
        chartPoints: [],
      };
    }

    /* --------------------------------------------------------
       2️⃣ COINGECKO (Main fallback)
    --------------------------------------------------------- */
    const cgRes = await axios.get(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${symbol.toLowerCase()}`
    );
    const cgData = cgRes.data?.[0];

    if (cgData) {
      return {
        source: "coingecko",
        name: cgData.name,
        symbol: cgData.symbol.toUpperCase(),
        price: cgData.current_price,
        marketCap: cgData.market_cap,
        volume24h: cgData.total_volume,
        logo: cgData.image,
        change24h: cgData.price_change_percentage_24h,
        chartPoints: [],
        description: cgData.description || "No summary available.",
        slug: cgData.id,
      };
    }

    /* --------------------------------------------------------
       3️⃣ DEXSCREENER (For DEX-only tokens)
    --------------------------------------------------------- */
    const dexUrl = `https://api.dexscreener.com/latest/dex/search/?q=${symbol}`;
    const dexRes = await axios.get(dexUrl);
    const dexPair = dexRes.data?.pairs?.[0];

    if (dexPair) {
      return {
        source: "dexscreener",
        name: dexPair.baseToken.name,
        symbol: dexPair.baseToken.symbol,
        price: parseFloat(dexPair.priceUsd),
        marketCap: dexPair.fdv,
        volume24h: dexPair.volume?.h24,
        liquidity: dexPair.liquidity?.usd,
        change24h: dexPair.priceChange?.h24,
        logo: dexPair.info?.imageUrl || "",
        chartPoints:
          dexPair.txns
            ? Object.entries(dexPair.txns)
                .slice(-10)
                .map(([time, txn]: any) => ({
                  time,
                  value: txn?.buy || txn?.sell || 0,
                }))
            : [],
        description: `DEX Token on ${dexPair.chainId || "unknown chain"}`,
        slug: dexPair.pairAddress || symbol.toLowerCase(),
      };
    }

    /* --------------------------------------------------------
       4️⃣ OKX Web3 Market (Global fallback)
    --------------------------------------------------------- */
    const okxUrl = `https://www.okx.com/api/v5/market/index-tickers?instId=${symbol}-USD`;
    const okxRes = await axios.get(okxUrl);
    const okxData = okxRes.data?.data?.[0];

    if (okxData) {
      return {
        source: "okx",
        name: symbol,
        symbol,
        price: parseFloat(okxData.last),
        marketCap: null,
        volume24h: parseFloat(okxData.vol24h),
        logo: `https://static.okx.com/cdn/okx-cdn/assets/imgs/221/${symbol.toLowerCase()}.png`,
        change24h: parseFloat(okxData.change24h) || null,
        description: "OKX global market data feed.",
        slug: symbol.toLowerCase(),
        chartPoints: [],
      };
    }

    /* --------------------------------------------------------
       ❌ No result found anywhere
    --------------------------------------------------------- */
    return {
      error: true,
      message: `No live data found for ${symbol}. Please check the token name or address.`,
    };
  } catch (err: any) {
    console.error("Error fetching crypto:", err.message);
    return {
      error: true,
      message: "Unable to fetch crypto data at the moment.",
    };
  }
}
