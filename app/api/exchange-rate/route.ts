import { NextResponse } from "next/server";

const CG_BASE = "https://api.coingecko.com/api/v3";

export const revalidate = 60;

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
  fiatReference: {
    inrPerUsd: number;
    source: string;
    timestamp: number;
  };
}

export async function GET() {
  const apiKey = process.env.CG_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "CG_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
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
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("CoinGecko error:", res.status, body);
      return NextResponse.json(
        { error: `CoinGecko returned ${res.status}` },
        { status: 502 }
      );
    }

    const raw = await res.json();
    const eth = raw.ethereum as EthMarketData;
    const usdcRaw = raw["usd-coin"] as TokenMarketPrice;

    // Dedicated reference rate for USD/INR:
    // USDC trades at $1.00 USD; its INR price reflects the market USD/INR valuation
    const inrPerUsd = usdcRaw?.inr && usdcRaw.inr > 0 ? usdcRaw.inr : (eth.inr / eth.usd);

    const payload: MultiAssetMarketData = {
      ...eth,
      ethereum: eth,
      usdc: usdcRaw,
      fiatReference: {
        inrPerUsd,
        source: "CoinGecko Spot FX / USDC Market Rate",
        timestamp: usdcRaw?.last_updated_at ?? eth.last_updated_at,
      },
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to fetch exchange rate:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
