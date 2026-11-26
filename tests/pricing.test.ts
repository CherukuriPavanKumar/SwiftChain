import { describe, it, expect } from "vitest";
import { parseUnits } from "viem";
import {
  calculatePortfolioValuation,
  calculateAssetInrValue,
  getMarketSnapshot,
  MARKET_STALE_THRESHOLD_MS,
} from "../lib/pricing";
import type { MultiAssetMarketData } from "../app/api/exchange-rate/route";

const nowMs = 1_800_000_000_000;
const freshEpochSec = Math.floor((nowMs - 10_000) / 1000);

const validMarketData: MultiAssetMarketData = {
  inr: 156346,
  usd: 1850,
  usd_24h_change: 1.2,
  inr_24h_change: 1.35,
  usd_market_cap: 200_000_000_000,
  inr_market_cap: 17_000_000_000_000,
  usd_24h_vol: 8_000_000_000,
  inr_24h_vol: 700_000_000_000,
  last_updated_at: freshEpochSec,
  fetchedAt: nowMs - 5_000,
  priceSource: "coingecko" as const,
  ethereum: {
    inr: 156346,
    usd: 1850,
    usd_24h_change: 1.2,
    inr_24h_change: 1.35,
    usd_market_cap: 200_000_000_000,
    inr_market_cap: 17_000_000_000_000,
    usd_24h_vol: 8_000_000_000,
    inr_24h_vol: 700_000_000_000,
    last_updated_at: freshEpochSec,
  },
  usdc: {
    inr: 84.51,
    usd: 1.0,
    usd_24h_change: 0.0,
    inr_24h_change: 0.02,
    last_updated_at: freshEpochSec,
  },
  fiatReference: {
    inrPerUsd: 84.51,
    source: "CoinGecko Spot FX / USDC Market Rate",
    timestamp: freshEpochSec,
  },
};

describe("Shared Pricing & Portfolio Valuation (lib/pricing)", () => {
  it("calculates consistent portfolio totals reconciling exactly with individual assets using bigint raw units", () => {
    const ethRaw = parseUnits("0.114132", 18);
    const usdcRaw = parseUnits("12.50", 6);

    const valuation = calculatePortfolioValuation({
      ethRaw,
      usdcRaw,
      marketData: validMarketData,
      isConnected: true,
      nowMs,
    });

    expect(valuation.hasPriceData).toBe(true);
    expect(valuation.isStale).toBe(false);
    expect(valuation.ethValueInr).not.toBeNull();
    expect(valuation.usdcValueInr).not.toBeNull();
    expect(valuation.totalInr).toBeCloseTo(
      (valuation.ethValueInr ?? 0) + (valuation.usdcValueInr ?? 0),
      2
    );
    expect(valuation.totalUsd).toBeCloseTo(
      (valuation.ethValueUsd ?? 0) + (valuation.usdcValueUsd ?? 0),
      2
    );

    // Individual asset calculation agrees with portfolio asset calculation
    expect(calculateAssetInrValue(ethRaw, "ETH", validMarketData)).toBe(valuation.ethValueInr);
    expect(calculateAssetInrValue(usdcRaw, "USDC", validMarketData)).toBe(valuation.usdcValueInr);
  });

  it("never fabricates fallback valuations when pricing API fails or data is missing", () => {
    const ethRaw = parseUnits("0.1141", 18);
    const usdcRaw = parseUnits("10", 6);

    const valuation = calculatePortfolioValuation({
      ethRaw,
      usdcRaw,
      marketData: null,
      isConnected: true,
      nowMs,
    });

    expect(valuation.hasPriceData).toBe(false);
    expect(valuation.ethValueInr).toBeNull();
    expect(valuation.usdcValueInr).toBeNull();
    expect(valuation.totalInr).toBeNull();
    expect(calculateAssetInrValue(ethRaw, "ETH", null)).toBeNull();
    expect(calculateAssetInrValue(usdcRaw, "USDC", undefined)).toBeNull();
  });

  it("returns zero fiat valuation when wallet is disconnected", () => {
    const valuation = calculatePortfolioValuation({
      ethRaw: parseUnits("1", 18),
      usdcRaw: parseUnits("100", 6),
      marketData: validMarketData,
      isConnected: false,
      nowMs,
    });

    expect(valuation.totalInr).toBe(0);
    expect(valuation.ethValueInr).toBe(0);
    expect(valuation.usdcValueInr).toBe(0);
  });

  it("flags stale price snapshots beyond threshold", () => {
    const staleNow = nowMs + MARKET_STALE_THRESHOLD_MS + 60_000;
    const snap = getMarketSnapshot(validMarketData, validMarketData.fetchedAt, staleNow);
    expect(snap.available).toBe(true);
    expect(snap.isStale).toBe(true);
  });
});

