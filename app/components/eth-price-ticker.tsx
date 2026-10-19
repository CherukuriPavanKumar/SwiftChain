'use client';

import { useQuery } from "@tanstack/react-query";

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

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `₹${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `₹${(value / 1_000_000_000).toFixed(2)}B`;
  }
  return formatINR(value);
}

function Change({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
        isPositive
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export function useEthPrice() {
  return useQuery<EthMarketData>({
    queryKey: ["eth-price"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rate");
      if (!res.ok) throw new Error("Failed to fetch ETH price");
      return res.json();
    },
    // Refetch every 60 seconds to stay within Demo plan's rate limit.
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 8000),
  });
}

export default function EthPriceTicker() {
  const { data, isLoading, error, dataUpdatedAt } = useEthPrice();

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-xs">
        ⚠ Could not load ETH price. Retrying...
      </div>
    );
  }

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {/* ETH Logo placeholder */}
        <div className="flex items-center gap-2 font-bold text-white">
          <span className="text-blue-400 text-lg">Ξ</span>
          <span>Ethereum</span>
        </div>

        {/* INR Price */}
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{formatINR(data.inr)}</span>
          <Change value={data.inr_24h_change} />
        </div>

        {/* USD Price */}
        <div className="flex items-center gap-2 text-gray-400">
          <span>{formatUSD(data.usd)}</span>
          <Change value={data.usd_24h_change} />
        </div>

        {/* Market Cap */}
        <div className="hidden sm:flex items-center gap-1 text-gray-500 text-xs">
          <span>Mkt Cap:</span>
          <span className="text-gray-400">{formatLargeNumber(data.inr_market_cap)}</span>
        </div>

        {/* 24h Volume */}
        <div className="hidden sm:flex items-center gap-1 text-gray-500 text-xs">
          <span>24h Vol:</span>
          <span className="text-gray-400">{formatLargeNumber(data.inr_24h_vol)}</span>
        </div>

        {/* Last updated */}
        {updatedAt && (
          <span className="ml-auto text-xs text-gray-600">
            Updated {updatedAt}
          </span>
        )}
      </div>
    </div>
  );
}
