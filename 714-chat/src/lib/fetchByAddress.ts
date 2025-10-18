// src/lib/fetchByAddress.ts

/**
 * Global Token Resolver
 * Supports EVM + Non-EVM chains via Covalent, CoinGecko, and OKX Web3
 */

const COVALENT_API_KEY = process.env.NEXT_PUBLIC_COVALENT_API_KEY;
const OKX_API_KEY = process.env.NEXT_PUBLIC_OKX_API_KEY;

export interface TokenByAddressResult {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: string;
  change: string;
  chartPoints: number[];
  description: string;
  platform: string;
  slug?: string;
}

export async function fetchTokenByAddress(
  address: string,
  chainHint?: string
): Promise<TokenByAddressResult | string> {
  if (!address || typeof address !== "string") return "Invalid address";
  const normalized = address.trim();
  const isEvm = /^0x[0-9a-fA-F]{40,}$/.test(normalized);

  const supportedChains: Record<string, string> = {
    ethereum: "eth-mainnet",
    "polygon-pos": "matic-mainnet",
    "binance-smart-chain": "bsc-mainnet",
    avalanche: "avalanche-mainnet",
    optimism: "optimism-mainnet",
    "arbitrum-one": "arbitrum-mainnet",
    base: "base-mainnet",
    fantom: "fantom-mainnet",
    celo: "celo-mainnet",
    zksync: "zksync-mainnet",
    linea: "linea-mainnet",
    scroll: "scroll-mainnet",
    blast: "blast-mainnet",
    worldchain: "worldchain-mainnet",
    unichain: "unichain-sepolia",
    solana: "solana-mainnet",
    tron: "tron-mainnet",
  };

  const preferred = chainHint ? [chainHint.toLowerCase()] : Object.keys(supportedChains);

  // 1️⃣ Try Covalent (Primary)
  if (COVALENT_API_KEY && isEvm) {
    for (const [platform, covalentChain] of Object.entries(supportedChains)) {
      try {
        const covalentUrl = `https://api.covalenthq.com/v1/${covalentChain}/tokens/${normalized}/token_holders/?quote-currency=USD&page-size=1&key=${COVALENT_API_KEY}`;
        const res = await fetchWithTimeout(covalentUrl, { timeout: 7000 });
        if (res.ok) {
          const data = await res.json();
          const tokenInfo = data?.data?.items?.[0]?.contract_metadata;
          if (tokenInfo) {
            return {
              id: tokenInfo.contract_address,
              name: tokenInfo.contract_name || "Unknown Token",
              symbol: tokenInfo.contract_ticker_symbol || "",
              image: tokenInfo.logo_url || "",
              price:
                typeof tokenInfo.quote_rate === "number"
                  ? tokenInfo.quote_rate.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })
                  : "N/A",
              change: "N/A",
              chartPoints: [],
              description: `Token detected via Covalent (${platform}).`,
              platform,
            };
          }
        }
      } catch (err) {
        console.warn(`Covalent lookup failed for ${platform}:`, err);
      }
    }
  }

  // 2️⃣ CoinGecko Fallback
  const geckoResult = await fetchTokenByAddress_CoinGecko(normalized, chainHint);
  if (typeof geckoResult !== "string") return geckoResult;

  // 3️⃣ OKX Web3 Fallback
  const okxResult = await fetchTokenByAddress_OKX(normalized, chainHint);
  if (okxResult) return okxResult;

  return `No token found for ${normalized}.`;
}

/** --- COINGECKO FALLBACK --- */
async function fetchTokenByAddress_CoinGecko(
  normalized: string,
  chainHint?: string
): Promise<TokenByAddressResult | string> {
  const supportedPlatforms = [
    "ethereum",
    "polygon-pos",
    "binance-smart-chain",
    "avalanche",
    "optimism",
    "arbitrum-one",
    "fantom",
    "celo",
    "base",
    "zksync",
    "linea",
    "scroll",
    "blast",
    "worldchain",
    "unichain",
    "tron",
    "solana",
  ];

  const prefer = chainHint ? [chainHint.toLowerCase()] : [];
  const platforms = [...new Set([...prefer, ...supportedPlatforms])];

  for (const platform of platforms) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${encodeURIComponent(
        normalized
      )}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;
      const res = await fetchWithTimeout(url, { timeout: 7000 });
      if (!res.ok) continue;

      const data = await res.json();
      if (data?.id && data?.market_data) {
        const market = data.market_data;
        return {
          id: data.id,
          name: data.name,
          symbol: (data.symbol || "").toUpperCase(),
          image: data.image?.thumb || "",
          price:
            typeof market.current_price?.usd === "number"
              ? market.current_price.usd.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })
              : "N/A",
          change:
            typeof market.price_change_percentage_24h === "number"
              ? market.price_change_percentage_24h.toFixed(2)
              : "N/A",
          chartPoints: market.sparkline_7d?.price || [],
          description:
            (data.description?.en &&
              data.description.en.split("\n")[0].split(".")[0]) ||
            `No description for ${data.name || data.id}.`,
          platform,
        };
      }
    } catch (err) {
      console.warn(`CoinGecko lookup failed for ${platform}:`, err);
    }
  }

  return `No token found on CoinGecko for address ${normalized}.`;
}

/** --- OKX WEB3 FALLBACK --- */
async function fetchTokenByAddress_OKX(
  normalized: string,
  chainHint?: string
): Promise<TokenByAddressResult | null> {
  if (!OKX_API_KEY) return null;

  try {
    const url = `https://www.okx.com/api/v5/explorer/token?address=${normalized}${
      chainHint ? `&chain=${chainHint}` : ""
    }`;
    const res = await fetchWithTimeout(url, {
      headers: { "OK-ACCESS-KEY": OKX_API_KEY },
      timeout: 7000,
    });

    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.data?.[0];
    if (!token) return null;

    return {
      id: token.contractAddress || normalized,
      name: token.name || "Unknown Token",
      symbol: token.symbol || "",
      image: token.icon || "",
      price:
        token.priceUsd !== undefined
          ? Number(token.priceUsd).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })
          : "N/A",
      change:
        token.change24h !== undefined ? Number(token.change24h).toFixed(2) : "N/A",
      chartPoints: token.sparkline || [],
      description: `Token resolved via OKX Web3 API (${chainHint || "multi-chain"}).`,
      platform: chainHint || "unknown",
    };
  } catch (err) {
    console.warn("OKX lookup failed:", err);
    return null;
  }
}

/** --- TIMEOUT HELPER --- */
async function fetchWithTimeout(
  resource: string,
  options: { timeout?: number; headers?: Record<string, string> } = {}
): Promise<Response> {
  const { timeout = 10000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...rest, signal: controller.signal });
  clearTimeout(id);
  return response;
}
