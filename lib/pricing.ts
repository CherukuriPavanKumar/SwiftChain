import { formatUnits } from 'viem';
import type { MultiAssetMarketData } from '@/app/api/exchange-rate/route';
import { SUPPORTED_TOKENS, type SupportedAssetSymbol } from './tokens';

export const MARKET_STALE_THRESHOLD_MS = 180_000; // 3 minutes

export interface MarketPriceSnapshot {
  available: boolean;
  ethInr: number | null;
  ethUsd: number | null;
  usdcInr: number | null;
  usdcUsd: number | null;
  inrPerUsd: number | null;
  eth24hChangeInr: number | null;
  eth24hChangeUsd: number | null;
  sourceUpdatedAtMs: number | null;
  fetchedAtMs: number | null;
  isStale: boolean;
  sourceLabel: string;
}

export interface PortfolioValuation {
  isConnected: boolean;
  hasPriceData: boolean;
  isStale: boolean;
  ethAmount: number;
  usdcAmount: number;
  ethValueInr: number | null;
  usdcValueInr: number | null;
  totalInr: number | null;
  ethValueUsd: number | null;
  usdcValueUsd: number | null;
  totalUsd: number | null;
  ethEquivalentTotal: number | null;
  snapshot: MarketPriceSnapshot;
}

function roundToCents(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function isPositiveFinite(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val > 0;
}

/**
 * Extracts a normalized, validated market price snapshot.
 * Never fabricates fallback rates when marketData is missing or invalid.
 */
export function getMarketSnapshot(
  marketData?: MultiAssetMarketData | null,
  fetchedAtOverrideMs?: number,
  nowMs: number = Date.now()
): MarketPriceSnapshot {
  if (!marketData) {
    return {
      available: false,
      ethInr: null,
      ethUsd: null,
      usdcInr: null,
      usdcUsd: null,
      inrPerUsd: null,
      eth24hChangeInr: null,
      eth24hChangeUsd: null,
      sourceUpdatedAtMs: null,
      fetchedAtMs: null,
      isStale: false,
      sourceLabel: 'Market feed unavailable',
    };
  }

  const eth = marketData.ethereum ?? marketData;
  const usdc = marketData.usdc;

  const ethInr = isPositiveFinite(eth?.inr) ? eth.inr : null;
  const ethUsd = isPositiveFinite(eth?.usd) ? eth.usd : null;

  const derivedInrPerUsd =
    ethInr !== null && ethUsd !== null ? ethInr / ethUsd : null;

  const usdcInr = isPositiveFinite(usdc?.inr)
    ? usdc.inr
    : isPositiveFinite(marketData.fiatReference?.inrPerUsd)
      ? marketData.fiatReference.inrPerUsd
      : derivedInrPerUsd;

  const usdcUsd = isPositiveFinite(usdc?.usd) ? usdc.usd : usdcInr !== null ? 1.0 : null;
  const inrPerUsd = isPositiveFinite(marketData.fiatReference?.inrPerUsd)
    ? marketData.fiatReference.inrPerUsd
    : usdcInr;

  const available = ethInr !== null && usdcInr !== null;

  const sourceEpochSec =
    eth?.last_updated_at ?? usdc?.last_updated_at ?? marketData.fiatReference?.timestamp ?? null;
  const sourceUpdatedAtMs =
    typeof sourceEpochSec === 'number' && sourceEpochSec > 0 ? sourceEpochSec * 1000 : null;

  const fetchedAtMs =
    fetchedAtOverrideMs ??
    (typeof marketData.fetchedAt === 'number' && marketData.fetchedAt > 0
      ? marketData.fetchedAt
      : null);

  const ageAnchor = fetchedAtMs ?? sourceUpdatedAtMs;
  const isStale = ageAnchor !== null ? nowMs - ageAnchor > MARKET_STALE_THRESHOLD_MS : false;

  return {
    available,
    ethInr,
    ethUsd,
    usdcInr,
    usdcUsd,
    inrPerUsd,
    eth24hChangeInr:
      typeof eth?.inr_24h_change === 'number' && Number.isFinite(eth.inr_24h_change)
        ? eth.inr_24h_change
        : null,
    eth24hChangeUsd:
      typeof eth?.usd_24h_change === 'number' && Number.isFinite(eth.usd_24h_change)
        ? eth.usd_24h_change
        : null,
    sourceUpdatedAtMs,
    fetchedAtMs,
    isStale,
    sourceLabel: marketData.fiatReference?.source ?? 'CoinGecko Spot Market Rate',
  };
}

/**
 * Converts a bigint raw balance to exact numeric token units using viem formatUnits.
 */
export function rawUnitsToNumber(raw: bigint, decimals: number): number {
  if (raw <= BigInt(0)) return 0;
  const parsed = Number(formatUnits(raw, decimals));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Computes consistent portfolio valuation from bigint token balances and a single price snapshot.
 * Guarantees totalInr === ethValueInr + usdcValueInr (and totalUsd === ethValueUsd + usdcValueUsd)
 * to the exact cent/paisa.
 */
export function calculatePortfolioValuation(params: {
  ethRaw: bigint;
  usdcRaw: bigint;
  marketData?: MultiAssetMarketData | null;
  isConnected: boolean;
  fetchedAtMs?: number;
  nowMs?: number;
}): PortfolioValuation {
  const snapshot = getMarketSnapshot(params.marketData, params.fetchedAtMs, params.nowMs);
  const ethAmount = params.isConnected
    ? rawUnitsToNumber(params.ethRaw, SUPPORTED_TOKENS.ETH.decimals)
    : 0;
  const usdcAmount = params.isConnected
    ? rawUnitsToNumber(params.usdcRaw, SUPPORTED_TOKENS.USDC.decimals)
    : 0;

  if (!params.isConnected) {
    return {
      isConnected: false,
      hasPriceData: snapshot.available,
      isStale: snapshot.isStale,
      ethAmount: 0,
      usdcAmount: 0,
      ethValueInr: 0,
      usdcValueInr: 0,
      totalInr: 0,
      ethValueUsd: 0,
      usdcValueUsd: 0,
      totalUsd: 0,
      ethEquivalentTotal: 0,
      snapshot,
    };
  }

  if (!snapshot.available || snapshot.ethInr === null || snapshot.usdcInr === null) {
    return {
      isConnected: true,
      hasPriceData: false,
      isStale: snapshot.isStale,
      ethAmount,
      usdcAmount,
      ethValueInr: null,
      usdcValueInr: null,
      totalInr: null,
      ethValueUsd: null,
      usdcValueUsd: null,
      totalUsd: null,
      ethEquivalentTotal: null,
      snapshot,
    };
  }

  const ethValueInr = roundToCents(ethAmount * snapshot.ethInr);
  const usdcValueInr = roundToCents(usdcAmount * snapshot.usdcInr);
  const totalInr = roundToCents(ethValueInr + usdcValueInr);

  const ethValueUsd =
    snapshot.ethUsd !== null ? roundToCents(ethAmount * snapshot.ethUsd) : null;
  const usdcValueUsd =
    snapshot.usdcUsd !== null ? roundToCents(usdcAmount * snapshot.usdcUsd) : null;
  const totalUsd =
    ethValueUsd !== null && usdcValueUsd !== null
      ? roundToCents(ethValueUsd + usdcValueUsd)
      : null;

  const ethEquivalentTotal = snapshot.ethInr > 0 ? totalInr / snapshot.ethInr : ethAmount;

  return {
    isConnected: true,
    hasPriceData: true,
    isStale: snapshot.isStale,
    ethAmount,
    usdcAmount,
    ethValueInr,
    usdcValueInr,
    totalInr,
    ethValueUsd,
    usdcValueUsd,
    totalUsd,
    ethEquivalentTotal,
    snapshot,
  };
}

/**
 * Calculates indicative INR value for an asset amount (from bigint raw units or string/number).
 * Returns null if rate is unavailable.
 */
export function calculateAssetInrValue(
  amount: bigint | string | number,
  symbol: SupportedAssetSymbol | string,
  marketData?: MultiAssetMarketData | null
): number | null {
  const snapshot = getMarketSnapshot(marketData);
  if (!snapshot.available) return null;

  const upper = symbol.toUpperCase();
  const rate =
    upper === 'USDC' ? snapshot.usdcInr : upper === 'ETH' ? snapshot.ethInr : null;
  if (rate === null) return null;

  let qty: number;
  if (typeof amount === 'bigint') {
    const decimals =
      upper === 'USDC' ? SUPPORTED_TOKENS.USDC.decimals : SUPPORTED_TOKENS.ETH.decimals;
    qty = rawUnitsToNumber(amount, decimals);
  } else {
    qty = typeof amount === 'string' ? Number(amount) : amount;
  }

  if (!Number.isFinite(qty) || qty < 0) return null;
  return roundToCents(qty * rate);
}

