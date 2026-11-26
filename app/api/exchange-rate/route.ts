import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Price source constants
// ---------------------------------------------------------------------------

const CG_BASE = "https://api.coingecko.com/api/v3";
const BINANCE_TICKER = "https://api.binance.com/api/v3/ticker/24hr";
const ER_API = "https://open.er-api.com/v6/latest/USD";

// ISR: Next.js will cache this route handler for 60 seconds at the CDN layer.
// Individual fetch() calls also carry their own revalidation hints.
export const revalidate = 60;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface TokenMarketPrice {
  usd: number;
  inr: number;
  usd_24h_change: number;
  inr_24h_change: number;
  usd_market_cap?: number;
  inr_market_cap?: number;
  usd_24h_vol?: number;
  inr_24h_vol?: number;
  last_updated_at: number;
}

export interface EthMarketData extends TokenMarketPrice {
  usd_market_cap: number;
  inr_market_cap: number;
  usd_24h_vol: number;
  inr_24h_vol: number;
}

export interface MultiAssetMarketData extends EthMarketData {
  ethereum: EthMarketData;
  usdc: TokenMarketPrice;
  fetchedAt: number;
  /** Name of the data source that was actually used */
  priceSource: "coingecko" | "binance";
  fiatReference: {
    inrPerUsd: number;
    source: string;
    timestamp: number;
  };
}

// ---------------------------------------------------------------------------
// Source 1 — CoinGecko (preferred: has INR natively)
// ---------------------------------------------------------------------------

async function fetchFromCoinGecko(apiKey: string): Promise<MultiAssetMarketData | null> {
  const url = new URL(`${CG_BASE}/simple/price`);
  url.searchParams.set("ids", "ethereum,usd-coin");
  url.searchParams.set("vs_currencies", "usd,inr");
  url.searchParams.set("include_24hr_change", "true");
  url.searchParams.set("include_market_cap", "true");
  url.searchParams.set("include_24hr_vol", "true");
  url.searchParams.set("include_last_updated_at", "true");

  const res = await fetch(url.toString(), {
    headers: { "x-cg-demo-api-key": apiKey },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    console.error("CoinGecko error:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const raw = await res.json();
  const eth = raw?.ethereum as EthMarketData | undefined;
  const usdcRaw = raw?.["usd-coin"] as TokenMarketPrice | undefined;

  if (!eth || !Number.isFinite(eth.inr) || eth.inr <= 0 || !Number.isFinite(eth.usd) || eth.usd <= 0) {
    console.error("CoinGecko: incomplete Ethereum market data", eth);
    return null;
  }

  const inrPerUsd =
    usdcRaw?.inr && Number.isFinite(usdcRaw.inr) && usdcRaw.inr > 0
      ? usdcRaw.inr
      : eth.inr / eth.usd;

  const nowSec = Math.floor(Date.now() / 1000);

  return {
    ...eth,
    ethereum: eth,
    usdc: usdcRaw ?? {
      usd: 1.0,
      inr: inrPerUsd,
      usd_24h_change: 0,
      inr_24h_change: 0,
      last_updated_at: eth.last_updated_at,
    },
    fetchedAt: Date.now(),
    priceSource: "coingecko",
    fiatReference: {
      inrPerUsd,
      source: "CoinGecko Spot FX / USDC Market Rate",
      timestamp: usdcRaw?.last_updated_at ?? nowSec,
    },
  };
}

// ---------------------------------------------------------------------------
// Source 2 — Binance (ETH/USDT) + open.er-api.com (USD→INR)
// Falls back when CoinGecko is unreachable (SSL, rate-limit, outage).
// ---------------------------------------------------------------------------

async function fetchFromBinance(): Promise<MultiAssetMarketData | null> {
  try {
    // Fetch ETH/USDT 24h ticker and USD→INR FX rate in parallel
    const [ethRes, fxRes] = await Promise.all([
      fetch(`${BINANCE_TICKER}?symbol=ETHUSDT`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(6_000),
      }),
      fetch(ER_API, {
        next: { revalidate: 300 }, // FX rate is slower-moving; 5 min cache
        signal: AbortSignal.timeout(6_000),
      }),
    ]);

    if (!ethRes.ok || !fxRes.ok) {
      console.error("Binance/ER-API fallback failed:", ethRes.status, fxRes.status);
      return null;
    }

    const [ethTicker, fxData] = await Promise.all([ethRes.json(), fxRes.json()]);

    const ethUsd = parseFloat(ethTicker?.lastPrice ?? "0");
    const change24hPct = parseFloat(ethTicker?.priceChangePercent ?? "0");
    const volume24hUsd = parseFloat(ethTicker?.quoteVolume ?? "0"); // in USDT ≈ USD
    const inrPerUsd: number = fxData?.rates?.INR ?? 0;

    if (!ethUsd || ethUsd <= 0 || !inrPerUsd || inrPerUsd <= 0) {
      console.error("Binance fallback: bad data", { ethUsd, inrPerUsd });
      return null;
    }

    const ethInr = ethUsd * inrPerUsd;
    const nowSec = Math.floor(Date.now() / 1000);

    // Approximate INR 24h change (same percentage, different base currency)
    // FX rate changes are small relative to ETH volatility so this is acceptable
    const change24hInr = change24hPct;

    // Rough market cap: not available from Binance ticker alone; use 0 to signal absence
    const ethData: EthMarketData = {
      usd: ethUsd,
      inr: ethInr,
      usd_24h_change: change24hPct,
      inr_24h_change: change24hInr,
      usd_market_cap: 0,
      inr_market_cap: 0,
      usd_24h_vol: volume24hUsd,
      inr_24h_vol: volume24hUsd * inrPerUsd,
      last_updated_at: nowSec,
    };

    const usdcData: TokenMarketPrice = {
      usd: 1.0,
      inr: inrPerUsd,
      usd_24h_change: 0,
      inr_24h_change: 0,
      last_updated_at: nowSec,
    };

    return {
      ...ethData,
      ethereum: ethData,
      usdc: usdcData,
      fetchedAt: Date.now(),
      priceSource: "binance",
      fiatReference: {
        inrPerUsd,
        source: "Binance ETH/USDT + open.er-api.com USD/INR",
        timestamp: nowSec,
      },
    };
  } catch (err) {
    console.error("Binance fallback fetch failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/exchange-rate
// ---------------------------------------------------------------------------

export async function GET() {
  const apiKey = process.env.CG_API_KEY;

  // Attempt CoinGecko first (richer data: INR native, market cap, vol)
  if (apiKey) {
    try {
      const cgData = await fetchFromCoinGecko(apiKey);
      if (cgData) {
        return NextResponse.json(cgData, {
          headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
        });
      }
    } catch (err) {
      console.error("CoinGecko fetch threw:", err);
      // Fall through to Binance
    }
  } else {
    console.warn("CG_API_KEY not set — skipping CoinGecko, using Binance fallback");
  }

  // Fallback: Binance + open.er-api.com (no API key, no SSL issues)
  try {
    const binanceData = await fetchFromBinance();
    if (binanceData) {
      return NextResponse.json(binanceData, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
      });
    }
  } catch (err) {
    console.error("Binance fallback threw:", err);
  }

  // Both sources failed — honest error, no fabricated prices
  return NextResponse.json(
    { error: "All price sources unavailable. Please try again shortly." },
    { status: 503 }
  );
}
