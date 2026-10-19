import { formatEther, parseUnits } from "viem";
import { sepolia } from "wagmi/chains";
import type { MultiAssetMarketData, TokenMarketPrice } from "@/app/api/exchange-rate/route";
import type { RemittanceQuote, FeeBreakdown } from "@/types/quote";
import { SUPPORTED_TOKENS, type SupportedAssetSymbol } from "./tokens";

export const QUOTE_TTL_MS = 60_000; // 60 seconds validity
export const DEFAULT_ETH_TRANSFER_GAS_UNITS = BigInt(21000); // 21k gas for native ETH
export const DEFAULT_ERC20_TRANSFER_GAS_UNITS = BigInt(65000); // 65k gas buffer for ERC-20 transfer

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTokenAmount(value: string | number, symbol: SupportedAssetSymbol = 'ETH'): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `0.00 ${symbol}`;
  const decimals = symbol === 'USDC' ? 2 : 6;
  return `${num.toFixed(decimals)} ${symbol}`;
}

export function formatETH(value: string | number): string {
  return formatTokenAmount(value, 'ETH');
}

interface CalculateQuoteParams {
  sourceAmountInr: number;
  assetSymbol: SupportedAssetSymbol;
  marketData: MultiAssetMarketData;
  gasUnits?: bigint;
  gasPriceWei?: bigint;
  currentTime?: number;
}

/**
 * Deterministic multi-asset quote calculation engine.
 * Supports native ETH (18 decimals) and Circle USDC (6 decimals on Sepolia).
 * Separates token quantity, separate ETH network gas fees, and 0% platform fee.
 */
export function calculateRemittanceQuote({
  sourceAmountInr,
  assetSymbol,
  marketData,
  gasUnits,
  gasPriceWei = BigInt(1500000000), // Default 1.5 Gwei fallback
  currentTime = Date.now(),
}: CalculateQuoteParams): RemittanceQuote | null {
  if (
    !sourceAmountInr ||
    isNaN(sourceAmountInr) ||
    sourceAmountInr <= 0 ||
    !marketData
  ) {
    return null;
  }

  const tokenConfig = SUPPORTED_TOKENS[assetSymbol];
  if (!tokenConfig) return null;

  // Sourced token pricing
  const ethPrice = marketData.ethereum ?? marketData;
  const targetTokenPrice: TokenMarketPrice =
    assetSymbol === 'USDC'
      ? (marketData.usdc ?? {
          usd: 1.0,
          inr: marketData.fiatReference?.inrPerUsd ?? (ethPrice.inr / ethPrice.usd),
          usd_24h_change: 0,
          inr_24h_change: 0,
          last_updated_at: ethPrice.last_updated_at,
        })
      : ethPrice;

  const marketPriceInr = targetTokenPrice.inr;
  const marketPriceUsd = targetTokenPrice.usd;

  if (!marketPriceInr || marketPriceInr <= 0) return null;

  // Dedicated fiat reference rate (INR per USD)
  const referenceUsdInrRate = marketData.fiatReference?.inrPerUsd ?? (ethPrice.inr / ethPrice.usd);

  // 1. Calculate token quantity
  // Round to 6 decimal places (both USDC and ETH) to avoid IEEE 754 float drift
  const rawTokenAmount = sourceAmountInr / marketPriceInr;
  const destinationCryptoAmount = rawTokenAmount.toFixed(6);

  // Exact on-chain BigInt units according to token definition (6 decimals for USDC, 18 for ETH)
  const destinationCryptoUnits = parseUnits(destinationCryptoAmount, tokenConfig.decimals);

  // Indicative USD equivalent of source amount
  const estimatedUsdEquivalent = sourceAmountInr / referenceUsdInrRate;

  // 2. Network Gas Fee Estimation
  // Note: On Sepolia, gas is ALWAYS paid in native Sepolia ETH, even for ERC-20 transfers!
  const defaultGas = assetSymbol === 'USDC' ? DEFAULT_ERC20_TRANSFER_GAS_UNITS : DEFAULT_ETH_TRANSFER_GAS_UNITS;
  const effectiveGasUnits = gasUnits && gasUnits > BigInt(0) ? gasUnits : defaultGas;
  const effectiveGasPrice = gasPriceWei > BigInt(0) ? gasPriceWei : BigInt(1500000000);

  const totalGasWei = effectiveGasUnits * effectiveGasPrice;
  const estimatedNetworkFeeEth = formatEther(totalGasWei);
  const estimatedNetworkFeeInr = parseFloat(estimatedNetworkFeeEth) * ethPrice.inr;

  // 3. Platform Fee (Explicit 0.00 for MVP promotion)
  const platformFeePercent = 0;
  const platformFeeInr = 0;

  const fees: FeeBreakdown = {
    platformFeeInr,
    platformFeePercent,
    estimatedGasUnits: effectiveGasUnits,
    estimatedGasPriceWei: effectiveGasPrice,
    estimatedNetworkFeeEth,
    estimatedNetworkFeeInr,
  };

  const netDestinationValueInr = parseFloat(destinationCryptoAmount) * marketPriceInr;
  const quoteCreatedAt = currentTime;
  const expiresAt = quoteCreatedAt + QUOTE_TTL_MS;
  const marketPriceUpdatedAt = (targetTokenPrice.last_updated_at ?? ethPrice.last_updated_at ?? 0) * 1000;

  return {
    sourceAmountInr,
    sourceCurrency: "INR",
    assetSymbol,
    assetName: tokenConfig.name,
    assetDecimals: tokenConfig.decimals,
    isNative: tokenConfig.isNative,
    contractAddress: tokenConfig.contractAddress,
    chainId: sepolia.id,
    marketPriceInr,
    marketPriceUsd,
    referenceUsdInrRate,
    marketPriceUpdatedAt,
    quoteCreatedAt,
    expiresAt,
    destinationCryptoAmount,
    destinationCryptoUnits,
    estimatedUsdEquivalent,
    fees,
    netDestinationValueInr,
    isStale: false,
  };
}
