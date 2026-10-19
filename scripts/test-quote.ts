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

function runTestSuite() {
  console.log("=== Testing SwiftChain V2 Multi-Asset Quote & Infrastructure ===");

  // 1. Test Circle USDC Quote (6 decimals)
  console.log("\n--- Test 1: Circle USDC Remittance Quote (₹5,000 INR) ---");
  const usdcQuote = calculateRemittanceQuote({
    sourceAmountInr: 5000,
    assetSymbol: "USDC",
    marketData: mockMarketData,
    gasUnits: DEFAULT_ERC20_TRANSFER_GAS_UNITS,
    gasPriceWei: BigInt(2000000000), // 2 Gwei
  });

  if (!usdcQuote) throw new Error("Test 1 Failed: USDC quote returned null");
  console.log("  Asset:", usdcQuote.assetSymbol, "(Decimals:", usdcQuote.assetDecimals, ")");
  console.log("  Source Amount: ₹5,000 INR");
  console.log("  Rate: 1 USDC = ₹" + usdcQuote.marketPriceInr);
  console.log("  Destination USDC Amount:", usdcQuote.destinationCryptoAmount);
  console.log("  Destination On-chain Units (6 decimals):", usdcQuote.destinationCryptoUnits.toString());
  console.log("  Indicative USD Equivalent: $" + usdcQuote.estimatedUsdEquivalent.toFixed(2));
  console.log("  Network Gas (Paid in Sepolia ETH):", usdcQuote.fees.estimatedNetworkFeeEth, "ETH (₹" + usdcQuote.fees.estimatedNetworkFeeInr.toFixed(2) + ")");

  // Verify 6-decimal rule for USDC
  const expectedUsdcUnits = parseUnits((5000 / 94.88).toFixed(6), 6);
  if (usdcQuote.destinationCryptoUnits !== expectedUsdcUnits) {
    throw new Error(`USDC units mismatch: expected ${expectedUsdcUnits}, got ${usdcQuote.destinationCryptoUnits}`);
  }
  if (usdcQuote.assetDecimals !== 6) {
    throw new Error("Circle USDC must use 6 decimals");
  }

  // 2. Test Native ETH Quote (18 decimals)
  console.log("\n--- Test 2: Native ETH Remittance Quote (₹5,000 INR) ---");
  const ethQuote = calculateRemittanceQuote({
    sourceAmountInr: 5000,
    assetSymbol: "ETH",
    marketData: mockMarketData,
    gasUnits: DEFAULT_ETH_TRANSFER_GAS_UNITS,
    gasPriceWei: BigInt(2000000000),
  });

  if (!ethQuote) throw new Error("Test 2 Failed: ETH quote returned null");
  console.log("  Asset:", ethQuote.assetSymbol, "(Decimals:", ethQuote.assetDecimals, ")");
  console.log("  Destination ETH Amount:", ethQuote.destinationCryptoAmount);
  console.log("  Destination On-chain Units (18 decimals):", ethQuote.destinationCryptoUnits.toString());

  const expectedEthUnits = parseUnits((5000 / 230000).toFixed(6), 18);
  if (ethQuote.destinationCryptoUnits !== expectedEthUnits) {
    throw new Error(`ETH units mismatch: expected ${expectedEthUnits}, got ${ethQuote.destinationCryptoUnits}`);
  }
  if (ethQuote.assetDecimals !== 18) {
    throw new Error("Native ETH must use 18 decimals");
  }

  // 3. Test Invalid Inputs & Boundaries
  console.log("\n--- Test 3: Input Validation & Boundary Checks ---");
  const zeroQuote = calculateRemittanceQuote({
    sourceAmountInr: 0,
    assetSymbol: "USDC",
    marketData: mockMarketData,
  });
  if (zeroQuote !== null) throw new Error("0 INR must return null quote");

  const negativeQuote = calculateRemittanceQuote({
    sourceAmountInr: -100,
    assetSymbol: "USDC",
    marketData: mockMarketData,
  });
  if (negativeQuote !== null) throw new Error("Negative INR must return null quote");

  // 4. Test 6-Decimal Formatting
  console.log("\n--- Test 4: Formatters and Quantization ---");
  console.log("  formatTokenAmount(52.700000, 'USDC') =>", formatTokenAmount(52.7, "USDC"));
  console.log("  formatTokenAmount(0.021739, 'ETH') =>", formatTokenAmount(0.021739, "ETH"));
  console.log("  formatINR(5000) =>", formatINR(5000));
  console.log("  formatUSD(52.7) =>", formatUSD(52.7));

  console.log("\n✅ All SwiftChain V2 Multi-Asset Tests Passed Successfully!");
}

runTestSuite();
