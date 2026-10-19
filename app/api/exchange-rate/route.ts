import { NextResponse } from "next/server";

const CG_BASE = "https://api.coingecko.com/api/v3";

//better to do it every 60sec coz the ratelimits are strict
export const revalidate = 60;

export interface EthMarketData {
  usd: number;
  inr: number;
  usd_24h_change: number;
  inr_24h_change: number;
  usd_market_cap: number;
  inr_market_cap: number;
  usd_24h_vol: number;
  inr_24h_vol: number;
  last_updated_at: number;
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
    url.searchParams.set("ids", "ethereum");
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

    return NextResponse.json(eth, {
      headers: {
        // Allow the browser to cache for 55s, CDN for 60s.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to fetch exchange rate:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
