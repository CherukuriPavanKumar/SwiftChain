import type { SupportedAssetSymbol } from '@/lib/tokens';

export interface FeeBreakdown {
  platformFeeInr: number;
  platformFeePercent: number;
  estimatedGasUnits: bigint;
  estimatedGasPriceWei: bigint;
  estimatedNetworkFeeEth: string;
  estimatedNetworkFeeInr: number;
}

export interface RemittanceQuote {
  // Source fiat parameters
  sourceAmountInr: number;
  sourceCurrency: 'INR';

  // Target crypto asset
  assetSymbol: SupportedAssetSymbol; // 'ETH' | 'USDC'
  assetName: string;
  assetDecimals: number; // 18 for ETH, 6 for USDC
  isNative: boolean;
  contractAddress?: `0x${string}`;
  chainId: number; // 11155111 for Sepolia

  // Pricing & reference rates
  marketPriceInr: number; // Price of 1 token in INR
  marketPriceUsd: number; // Price of 1 token in USD
  referenceUsdInrRate: number; // Dedicated INR/USD reference rate
  marketPriceUpdatedAt: number; // Epoch ms
  quoteCreatedAt: number; // Epoch ms
  expiresAt: number; // Epoch ms (60 seconds validity)

  // Calculated crypto quantities with controlled precision
  destinationCryptoAmount: string; // e.g. "52.700000" for USDC or "0.021799" for ETH
  destinationCryptoUnits: bigint; // Exact on-chain BigInt (parseUnits(amount, decimals))
  estimatedUsdEquivalent: number; // Indicative USD value of source amount

  // Fee breakdown
  fees: FeeBreakdown;

  // Net delivered value
  netDestinationValueInr: number;

  // Staleness status
  isStale: boolean;
}
