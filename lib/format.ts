import { formatEther, formatUnits } from 'viem';
import type { SupportedAssetSymbol } from './tokens';

const INR_FORMATTERS = new Map<string, Intl.NumberFormat>();
const USD_FORMATTERS = new Map<string, Intl.NumberFormat>();

function getInrFormatter(minFrac: number, maxFrac: number): Intl.NumberFormat {
  const key = `${minFrac}:${maxFrac}`;
  let fmt = INR_FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    });
    INR_FORMATTERS.set(key, fmt);
  }
  return fmt;
}

function getUsdFormatter(minFrac: number, maxFrac: number): Intl.NumberFormat {
  const key = `${minFrac}:${maxFrac}`;
  let fmt = USD_FORMATTERS.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    });
    USD_FORMATTERS.set(key, fmt);
  }
  return fmt;
}

/**
 * Normalizes -0 to 0 and avoids NaN/Infinity slipping into UI labels.
 */
function normalizeFinite(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Math.abs(value) < 1e-12 ? 0 : value;
}

/**
 * Formats an INR value using Indian locale grouping (en-IN).
 * Returns "Unavailable" when input is missing or non-finite.
 */
export function formatINR(
  value: number | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const num = normalizeFinite(value);
  if (num === null) return 'Unavailable';
  const minFrac = options?.minimumFractionDigits ?? 2;
  const maxFrac = options?.maximumFractionDigits ?? Math.max(minFrac, 2);
  return getInrFormatter(minFrac, maxFrac).format(num);
}

/**
 * Formats a USD value using US locale grouping (en-US).
 * Returns "Unavailable" when input is missing or non-finite.
 */
export function formatUSD(
  value: number | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const num = normalizeFinite(value);
  if (num === null) return 'Unavailable';
  const minFrac = options?.minimumFractionDigits ?? 2;
  const maxFrac = options?.maximumFractionDigits ?? Math.max(minFrac, 2);
  return getUsdFormatter(minFrac, maxFrac).format(num);
}

/**
 * Formats a currency value in either INR or USD.
 */
export function formatFiatCurrency(
  value: number | null | undefined,
  currency: 'INR' | 'USD',
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  return currency === 'INR' ? formatINR(value, options) : formatUSD(value, options);
}

/**
 * Formats an indicative approximate fiat valuation with genuine Unicode ≈.
 */
export function formatApproxFiat(
  value: number | null | undefined,
  currency: 'INR' | 'USD' = 'INR'
): string {
  const formatted = formatFiatCurrency(value, currency);
  if (formatted === 'Unavailable') return 'Rate unavailable';
  return `≈ ${formatted}`;
}

/**
 * Converts a decimal number to a plain fixed/significant string without scientific notation.
 */
function toPlainDecimalString(num: number, decimals: number): string {
  const fixed = num.toFixed(decimals);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Formats a token quantity respecting token-specific decimal rules.
 * Preserves small nonzero values without collapsing to misleading zeros.
 */
export function formatTokenAmount(
  value: string | number | null | undefined,
  symbol: SupportedAssetSymbol | string = 'ETH',
  options?: { includeSymbol?: boolean }
): string {
  const includeSymbol = options?.includeSymbol ?? true;
  if (value === null || value === undefined || value === '') {
    const zero = symbol === 'USDC' ? '0.00' : '0.0000';
    return includeSymbol ? `${zero} ${symbol}` : zero;
  }

  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) {
    return includeSymbol ? `— ${symbol}` : '—';
  }

  let formatted: string;
  if (symbol === 'USDC') {
    if (num > 0 && num < 0.01) {
      formatted = toPlainDecimalString(num, 6);
    } else {
      formatted = num.toFixed(2);
    }
  } else {
    // ETH or other high-decimal assets
    if (num === 0) {
      formatted = '0.000000';
    } else if (num > 0 && num < 0.000001) {
      // Preserve up to 3 significant digits for dust amounts without scientific notation
      const magnitude = Math.floor(Math.log10(num));
      const neededDecimals = Math.min(18, Math.max(6, -magnitude + 2));
      formatted = toPlainDecimalString(num, neededDecimals);
    } else {
      formatted = num.toFixed(6);
    }
  }

  return includeSymbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Formats a bigint token balance cleanly for wallet display.
 */
export function formatTokenBalance(
  raw: bigint | null | undefined,
  decimals: number,
  symbol: SupportedAssetSymbol | string,
  options?: { includeSymbol?: boolean }
): string {
  const includeSymbol = options?.includeSymbol ?? true;
  if (raw === null || raw === undefined) {
    return includeSymbol ? `Unavailable` : 'Unavailable';
  }
  const exactStr = formatUnits(raw, decimals);
  const num = Number(exactStr);

  let formatted: string;
  if (raw === BigInt(0)) {
    formatted = symbol === 'USDC' ? '0.00' : '0.0000';
  } else if (symbol === 'USDC') {
    formatted = num < 0.01 ? toPlainDecimalString(num, 6) : num.toFixed(2);
  } else {
    // ETH balance display: 4 decimals normally, or more if dust (< 0.0001 ETH)
    if (num < 0.0001) {
      const magnitude = Math.floor(Math.log10(num));
      const neededDecimals = Math.min(18, Math.max(4, -magnitude + 2));
      formatted = toPlainDecimalString(num, neededDecimals);
    } else {
      formatted = num.toFixed(4);
    }
  }

  return includeSymbol ? `${formatted} ${symbol}` : formatted;
}

export interface FormattedGasFee {
  formatted: string;
  status: 'ok' | 'zero' | 'unavailable';
  numericEth: number | null;
}

/**
 * Formats an EVM network gas fee (from wei bigint or ETH decimal string/number).
 * Guarantees small nonzero fees NEVER display as "0.000000 ETH".
 */
export function formatGasFeeEth(
  weiOrEth: bigint | string | number | null | undefined,
  inputUnit: 'wei' | 'eth' = 'wei'
): FormattedGasFee {
  if (weiOrEth === null || weiOrEth === undefined || weiOrEth === '') {
    return { formatted: 'Unavailable', status: 'unavailable', numericEth: null };
  }

  let ethNum: number;
  let ethExactStr: string;

  try {
    if (typeof weiOrEth === 'bigint') {
      if (weiOrEth < BigInt(0)) {
        return { formatted: 'Unavailable', status: 'unavailable', numericEth: null };
      }
      if (weiOrEth === BigInt(0)) {
        return { formatted: '0 ETH', status: 'zero', numericEth: 0 };
      }
      ethExactStr = formatEther(weiOrEth);
      ethNum = Number(ethExactStr);
    } else if (inputUnit === 'wei') {
      const big = BigInt(typeof weiOrEth === 'number' ? Math.trunc(weiOrEth) : weiOrEth);
      if (big < BigInt(0)) {
        return { formatted: 'Unavailable', status: 'unavailable', numericEth: null };
      }
      if (big === BigInt(0)) {
        return { formatted: '0 ETH', status: 'zero', numericEth: 0 };
      }
      ethExactStr = formatEther(big);
      ethNum = Number(ethExactStr);
    } else {
      const cleaned = typeof weiOrEth === 'string' ? weiOrEth.replace(/\s*ETH$/i, '').trim() : weiOrEth;
      ethNum = Number(cleaned);
      if (!Number.isFinite(ethNum) || ethNum < 0) {
        return { formatted: 'Unavailable', status: 'unavailable', numericEth: null };
      }
      if (ethNum === 0) {
        return { formatted: '0 ETH', status: 'zero', numericEth: 0 };
      }
      ethExactStr = String(cleaned);
    }
  } catch {
    return { formatted: 'Unavailable', status: 'unavailable', numericEth: null };
  }

  if (!Number.isFinite(ethNum)) {
    return { formatted: 'Unavailable', status: 'unavailable', numericEth: null };
  }

  // Preserve meaningful significant digits so tiny L1/testnet fees (e.g. 21,000 * 0.001 gwei = 2.1e-8 ETH)
  // never round to a misleading 0.000000 ETH.
  let display: string;
  if (ethNum >= 0.001) {
    display = toPlainDecimalString(ethNum, 6);
  } else if (ethNum >= 0.000001) {
    const magnitude = Math.floor(Math.log10(ethNum));
    const decimals = Math.min(18, Math.max(6, -magnitude + 2));
    display = toPlainDecimalString(ethNum, decimals);
  } else {
    const magnitude = Math.floor(Math.log10(ethNum));
    const decimals = Math.min(18, Math.max(8, -magnitude + 2));
    display = toPlainDecimalString(ethNum, decimals);
  }

  return {
    formatted: `${display} ETH`,
    status: 'ok',
    numericEth: ethNum,
  };
}

/**
 * Formats a signed percentage (e.g., +2.36%, -1.10%).
 */
export function formatPercentage(
  value: number | null | undefined,
  options?: { signed?: boolean; decimals?: number }
): string {
  const num = normalizeFinite(value);
  if (num === null) return '—';
  const decimals = options?.decimals ?? 2;
  const signed = options?.signed ?? true;
  const prefix = signed && num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(decimals)}%`;
}

/**
 * Shortens an EVM wallet address cleanly with Unicode ellipsis.
 */
export function truncateAddress(
  addr: string | null | undefined,
  head = 6,
  tail = 4
): string {
  if (!addr) return '—';
  if (addr.length < head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/**
 * Shortens a 66-character EVM transaction hash cleanly.
 */
export function truncateHash(
  hash: string | null | undefined,
  head = 10,
  tail = 8
): string {
  if (!hash) return '—';
  if (hash.length < head + tail + 3) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/**
 * Formats a date/timestamp consistently in local browser timezone with clear date + time parts.
 */
export function formatDateTimeParts(
  input: string | number | Date | null | undefined
): { dateStr: string; timeStr: string; dateTimeStr: string } {
  if (!input) return { dateStr: '—', timeStr: '', dateTimeStr: '—' };
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    return { dateStr: '—', timeStr: '', dateTimeStr: '—' };
  }

  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return {
    dateStr,
    timeStr,
    dateTimeStr: `${dateStr}, ${timeStr}`,
  };
}

