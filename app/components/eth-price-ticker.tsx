'use client';

import { useQuery } from "@tanstack/react-query";
import type { MultiAssetMarketData } from "@/app/api/exchange-rate/route";

export type { MultiAssetMarketData as EthMarketData };

function formatINR(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function Change({ value }: { value?: number }) {
  if (value === undefined) return null;
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
  return useQuery<MultiAssetMarketData>({
    queryKey: ["multi-asset-price"],
    queryFn: async () => {
      const res = await fetch("/api/exchange-rate");
      if (!res.ok) throw new Error("Failed to fetch market exchange rates");
      return res.json();
    },
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
        ⚠ Could not load market prices. Retrying...
      </div>
    );
  }

  const eth = data.ethereum ?? data;
  const usdc = data.usdc;
  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        {/* Ticker items */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {/* ETH Ticker */}
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold">Ξ</span>
            <span className="font-semibold text-white">ETH:</span>
            <span className="text-white font-mono">{formatINR(eth.inr)}</span>
            <Change value={eth.inr_24h_change} />
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* USDC Ticker */}
          {usdc && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">$</span>
              <span className="font-semibold text-white">USDC:</span>
              <span className="text-white font-mono">{formatINR(usdc.inr, 2)}</span>
              <span className="text-xs text-gray-400">(${formatUSD(usdc.usd)})</span>
              <Change value={usdc.inr_24h_change} />
            </div>
          )}

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Reference FX Rate */}
          {data.fiatReference && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400">
              <span>USD/INR Ref:</span>
              <span className="font-mono text-gray-200">
                ₹{data.fiatReference.inrPerUsd.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Last updated */}
        {updatedAt && (
          <span className="text-[11px] text-gray-500 ml-auto">
            Updated {updatedAt}
          </span>
        )}
      </div>
    </div>
  );
}
