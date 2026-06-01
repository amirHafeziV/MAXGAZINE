/**
 * Live market data, mirroring the browser-side sources in assets/app.js:
 *   - crypto: CoinGecko simple/price (no key, CORS-friendly)
 *   - forex:  Frankfurter / ECB daily reference rates (no key)
 * Used by the Writer/Fact-Check/Forecast agents to ground claims in real numbers.
 */

const CG = "https://api.coingecko.com/api/v3/simple/price";
const FX = "https://api.frankfurter.dev/v1";

const UA = { "User-Agent": "MAXGAZINE-agent/0.1 (+https://maxgazine.com)" };

export interface CryptoQuote {
  symbol: string;
  id: string;
  usd: number;
  change24h: number;
}

const CRYPTO_IDS: Array<[string, string]> = [
  ["BTC", "bitcoin"],
  ["ETH", "ethereum"],
  ["BNB", "binancecoin"],
  ["SOL", "solana"],
  ["XRP", "ripple"],
  ["TON", "the-open-network"],
  ["ADA", "cardano"],
  ["AVAX", "avalanche-2"],
  ["DOGE", "dogecoin"],
  ["DOT", "polkadot"],
  ["LINK", "chainlink"],
  ["MATIC", "matic-network"],
];

export async function fetchCrypto(): Promise<CryptoQuote[]> {
  const ids = CRYPTO_IDS.map(([, id]) => id).join(",");
  const res = await fetch(
    `${CG}?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >;
  const out: CryptoQuote[] = [];
  for (const [symbol, id] of CRYPTO_IDS) {
    const d = data[id];
    if (d && typeof d.usd === "number") {
      out.push({ symbol, id, usd: d.usd, change24h: d.usd_24h_change ?? 0 });
    }
  }
  return out;
}

export interface ForexQuote {
  pair: string;
  rate: number;
  changePct: number;
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

export async function fetchForex(): Promise<{ date: string; quotes: ForexQuote[] }> {
  const res = await fetch(
    `${FX}/${isoDaysAgo(12)}..?base=USD&symbols=EUR,GBP,JPY,CHF,AUD,CAD`,
    { headers: UA },
  );
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, Record<string, number>> };
  const dates = Object.keys(data.rates ?? {}).sort();
  const last = dates.at(-1);
  const prev = dates.at(-2);
  if (!last) return { date: isoDaysAgo(0), quotes: [] };
  const cur = data.rates![last]!;
  const before = prev ? data.rates![prev]! : cur;

  const pairs: Array<[string, (r: Record<string, number>) => number]> = [
    ["EUR/USD", (r) => 1 / r.EUR!],
    ["GBP/USD", (r) => 1 / r.GBP!],
    ["USD/JPY", (r) => r.JPY!],
    ["USD/CHF", (r) => r.CHF!],
    ["AUD/USD", (r) => 1 / r.AUD!],
    ["USD/CAD", (r) => r.CAD!],
  ];

  const quotes = pairs.map(([pair, fn]) => {
    const c = fn(cur);
    const p = fn(before);
    return { pair, rate: c, changePct: p ? ((c - p) / p) * 100 : 0 };
  });
  return { date: last, quotes };
}

/** A compact, model-friendly snapshot string of current markets. */
export async function marketSnapshot(): Promise<string> {
  const [crypto, fx] = await Promise.all([fetchCrypto(), fetchForex()]);
  const c = crypto
    .map((q) => `${q.symbol} $${q.usd} (${q.change24h.toFixed(2)}% 24h)`)
    .join(", ");
  const f = fx.quotes
    .map((q) => `${q.pair} ${q.rate.toFixed(4)} (${q.changePct.toFixed(2)}% d/d)`)
    .join(", ");
  return `Crypto (live, CoinGecko): ${c}\nForex (ECB daily ${fx.date}): ${f}`;
}
