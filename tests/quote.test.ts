import { describe, it, expect } from "vitest";
import {
  calculateRemittanceQuote,
  formatINR,
  formatUSD,
  formatTokenAmount,
  DEFAULT_ETH_TRANSFER_GAS_UNITS,
  DEFAULT_ERC20_TRANSFER_GAS_UNITS,
} from "../lib/quote";
import type { MultiAssetMarketData } from "../app/api/exchange-rate/route";
import { parseUnits } from "viem";

const mockMarketData: MultiAssetMarketData = {
  inr: 230000,
  usd: 2400,
  usd_24h_change: 0.5,
  inr_24h_change: 0.4,
  usd_market_cap: 290000000000,
  inr_market_cap: 28000000000000,
  usd_24h_vol: 9000000000,
  inr_24h_vol: 850000000000,
  last_updated_at: Math.floor(Date.now() / 1000) - 10,
  ethereum: {
    inr: 230000,
    usd: 2400,
    usd_24h_change: 0.5,
    inr_24h_change: 0.4,
    usd_market_cap: 290000000000,
    inr_market_cap: 28000000000000,
    usd_24h_vol: 9000000000,
    inr_24h_vol: 850000000000,
    last_updated_at: Math.floor(Date.now() / 1000) - 10,
  },
  usdc: {
    inr: 94.88,
    usd: 1.0,
    usd_24h_change: 0.01,
    inr_24h_change: -0.02,
    last_updated_at: Math.floor(Date.now() / 1000) - 10,
  },
  fiatReference: {
    inrPerUsd: 94.88,
    source: "CoinGecko USDC Spot Rate",
    timestamp: Math.floor(Date.now() / 1000) - 10,
  },
};

describe("Quote Engine (calculateRemittanceQuote)", () => {
  it("calculates accurate USDC remittance quote with 6 decimals precision", () => {
    const quote = calculateRemittanceQuote({
      sourceAmountInr: 5000,
      assetSymbol: "USDC",
      marketData: mockMarketData,
      gasUnits: DEFAULT_ERC20_TRANSFER_GAS_UNITS,
      gasPriceWei: BigInt(2000000000), // 2 Gwei
    });

    expect(quote).not.toBeNull();
    expect(quote?.assetSymbol).toBe("USDC");
    expect(quote?.assetDecimals).toBe(6);
    expect(quote?.isNative).toBe(false);
    expect(quote?.marketPriceInr).toBe(94.88);

    const expectedUnits = parseUnits((5000 / 94.88).toFixed(6), 6);
    expect(quote?.destinationCryptoUnits).toBe(expectedUnits);
    expect(quote?.fees.estimatedNetworkFeeEth).toBeDefined();
    expect(quote?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("calculates accurate Native ETH quote with 18 decimals precision", () => {
    const quote = calculateRemittanceQuote({
      sourceAmountInr: 5000,
      assetSymbol: "ETH",
      marketData: mockMarketData,
      gasUnits: DEFAULT_ETH_TRANSFER_GAS_UNITS,
      gasPriceWei: BigInt(2000000000),
    });

    expect(quote).not.toBeNull();
    expect(quote?.assetSymbol).toBe("ETH");
    expect(quote?.assetDecimals).toBe(18);
    expect(quote?.isNative).toBe(true);

    const expectedUnits = parseUnits((5000 / 230000).toFixed(6), 18);
    expect(quote?.destinationCryptoUnits).toBe(expectedUnits);
  });

  it("returns null for invalid or non-positive source INR amounts", () => {
    expect(calculateRemittanceQuote({ sourceAmountInr: 0, assetSymbol: "USDC", marketData: mockMarketData })).toBeNull();
    expect(calculateRemittanceQuote({ sourceAmountInr: -500, assetSymbol: "USDC", marketData: mockMarketData })).toBeNull();
    expect(calculateRemittanceQuote({ sourceAmountInr: NaN, assetSymbol: "USDC", marketData: mockMarketData })).toBeNull();
  });

  it("correctly formats currency and token amounts", () => {
    expect(formatINR(5000)).toMatch(/₹5,000(\.00)?/);
    expect(formatUSD(52.7)).toBe("$52.70");
    expect(formatTokenAmount(52.7, "USDC")).toBe("52.70 USDC");
    expect(formatTokenAmount(0.021739, "ETH")).toBe("0.021739 ETH");
  });
});
