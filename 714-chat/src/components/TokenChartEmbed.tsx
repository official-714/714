'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TokenChartEmbedProps {
  slug?: string;
  address?: string;
  chain?: string;
}

export default function TokenChartEmbed({
  slug,
  address,
  chain = 'ethereum',
}: TokenChartEmbedProps) {
  const [chartData, setChartData] = useState<
    { time: string; price: number }[]
  >([]);
  const [isIframe, setIsIframe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🧠 Decide between Dexscreener iframe or CoinGecko API
  useEffect(() => {
    if (!slug && !address) {
      setError('No token data available');
      return;
    }

    if (address) {
      setIsIframe(true);
      return;
    }

    async function fetchChart() {
      try {
        // Validate slug type
        if (typeof slug !== 'string' || slug.includes('{')) {
          setError('Invalid token slug');
          return;
        }

        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${slug}/market_chart?vs_currency=usd&days=7`
        );

        const data = await res.json();

        if (data.error) {
          setError(`CoinGecko Error: ${data.error}`);
          return;
        }

        if (!data.prices || !Array.isArray(data.prices)) {
          setError('No price data found for this token.');
          return;
        }

        const formatted = data.prices.map(
          ([timestamp, price]: [number, number]) => ({
            time: new Date(timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            price: parseFloat(price.toFixed(4)),
          })
        );
        setChartData(formatted);
      } catch (err) {
        console.error('Chart fetch failed:', err);
        setError('Unable to fetch chart data.');
      }
    }

    fetchChart();
  }, [slug, address]);

  // 🧩 Dexscreener iframe embed
  if (isIframe && address) {
    return (
      <iframe
        src={`https://dexscreener.com/${chain}/${address}?embed=1`}
        width="100%"
        height="400"
        loading="lazy"
        style={{ border: 'none', borderRadius: '1rem' }}
        referrerPolicy="no-referrer-when-downgrade"
        className="shadow-md border border-zinc-700/50"
      />
    );
  }

  // 🧩 Error UI
  if (error) {
    return (
      <div className="w-full h-40 flex items-center justify-center bg-gray-900 rounded-2xl text-red-400 border border-zinc-700/50">
        ⚠️ {error}
      </div>
    );
  }

  // 🧩 CoinGecko chart
  if (chartData.length > 0) {
    return (
      <div className="w-full h-64 bg-gray-900 rounded-2xl p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <XAxis dataKey="time" tick={{ fill: '#9ca3af' }} />
            <YAxis tick={{ fill: '#9ca3af' }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                color: '#fff',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 🧩 Default loading / empty
  return (
    <div className="w-full h-40 flex items-center justify-center bg-gray-900 rounded-2xl text-gray-400 border border-zinc-700/50">
      Loading chart...
    </div>
  );
}
