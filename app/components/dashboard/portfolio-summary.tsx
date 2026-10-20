'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown, ArrowUpRight } from 'lucide-react';
import { EthereumIcon, UsdcIcon } from './token-icons';
import { useTokenBalances } from '@/hooks/use-token-balances';
import { useEthPrice } from '@/app/components/eth-price-ticker';
import { useConnection } from 'wagmi';

interface PortfolioSummaryProps {
  onSelectAsset?: (symbol: 'ETH' | 'USDC') => void;
}

export function PortfolioSummary({ onSelectAsset }: PortfolioSummaryProps) {
  const { isConnected } = useConnection();
  const { ethFormatted, usdcFormatted, isEthLoading, isUsdcLoading } = useTokenBalances();
  const { data: marketData } = useEthPrice();

  const [hiddenBalance, setHiddenBalance] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD'>('INR');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  // Market rates
  const ethPriceInr = marketData?.ethereum?.inr ?? marketData?.inr ?? 230000;
  const ethPriceUsd = marketData?.ethereum?.usd ?? marketData?.usd ?? 2400;
  const usdcPriceInr = marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88;
  const usdcPriceUsd = marketData?.usdc?.usd ?? 1.0;

  const ethAmount = parseFloat(ethFormatted) || 0;
  const usdcAmount = parseFloat(usdcFormatted) || 0;

  // Calculators
  const ethInr = ethAmount * ethPriceInr;
  const ethUsd = ethAmount * ethPriceUsd;
  const usdcInr = usdcAmount * usdcPriceInr;
  const usdcUsd = usdcAmount * usdcPriceUsd;

  const totalInr = ethInr + usdcInr;
  const totalUsd = ethUsd + usdcUsd;

  const changePercent = marketData?.inr_24h_change ?? 2.36;
  const isPositiveChange = changePercent >= 0;

  function formatFiat(amount: number, currency: 'INR' | 'USD') {
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Display totals: If wallet is connected, show real calculated total.
  // If disconnected, show honest zero ₹0.00 / $0.00.
  const displayTotal = isConnected
    ? formatFiat(selectedCurrency === 'INR' ? totalInr : totalUsd, selectedCurrency)
    : selectedCurrency === 'INR'
    ? '₹0.00'
    : '$0.00';

  const displayEthAmount = isConnected ? ethFormatted : '0.0000';
  const displayEthFiat = isConnected
    ? formatFiat(selectedCurrency === 'INR' ? ethInr : ethUsd, selectedCurrency)
    : selectedCurrency === 'INR'
    ? '₹0.00'
    : '$0.00';

  const displayUsdcAmount = isConnected
    ? parseFloat(usdcFormatted)
      ? parseFloat(usdcFormatted).toFixed(2)
      : '0.00'
    : '0.00';
  const displayUsdcFiat = isConnected
    ? formatFiat(selectedCurrency === 'INR' ? usdcInr : usdcUsd, selectedCurrency)
    : selectedCurrency === 'INR'
    ? '₹0.00'
    : '$0.00';

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-label="Portfolio Summary">
      {/* 1. Total Portfolio Value Card */}
      <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#8BE3BB]/30 transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#91AAA0]">Total Portfolio Value</span>
            <button
              type="button"
              onClick={() => setHiddenBalance((prev) => !prev)}
              aria-label={hiddenBalance ? 'Show balance' : 'Hide balance'}
              className="text-[#91AAA0] hover:text-[#F4F1E8] transition-colors p-0.5 rounded"
            >
              {hiddenBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Currency Pill Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCurrencyDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#F4F1E8] hover:border-[#8BE3BB]/40 transition-colors"
            >
              <span>{selectedCurrency}</span>
              <ChevronDown className="w-3 h-3 text-[#91AAA0]" />
            </button>

            {currencyDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-24 rounded-xl bg-[#10231B] border border-[#294438] py-1 shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCurrency('INR');
                    setCurrencyDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCurrency === 'INR' ? 'text-[#8BE3BB] bg-[#183126]' : 'text-[#91AAA0] hover:text-[#F4F1E8]'
                  }`}
                >
                  INR (₹)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCurrency('USD');
                    setCurrencyDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCurrency === 'USD' ? 'text-[#8BE3BB] bg-[#183126]' : 'text-[#91AAA0] hover:text-[#F4F1E8]'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Big Balance Number */}
        <div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight font-mono">
            {hiddenBalance ? '••••••••' : displayTotal}
          </p>
        </div>

        {/* 24h Change Trend */}
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold flex items-center gap-0.5 ${
              isPositiveChange ? 'text-[#6ED6A8]' : 'text-[#FF8585]'
            }`}
          >
            <span>{isPositiveChange ? '↑' : '↓'}</span>
            <span>{isPositiveChange ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`}</span>
          </span>
          <span className="text-[#91AAA0]">(24h)</span>
        </div>
      </div>

      {/* 2. Ethereum (ETH) Card */}
      <div
        onClick={() => onSelectAsset?.('ETH')}
        className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#8BE3BB]/40 transition-all cursor-pointer group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EthereumIcon className="w-8 h-8" />
            <div>
              <p className="text-sm font-semibold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                Ethereum
              </p>
              <p className="text-[11px] font-mono text-[#91AAA0]">ETH</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors" />
        </div>

        {/* Amount & Fiat Equivalent */}
        <div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight font-mono">
            {hiddenBalance ? '••••••' : isEthLoading ? '...' : displayEthAmount}
          </p>
          <p className="text-xs text-[#91AAA0] mt-1 font-mono">
            {hiddenBalance ? '••••' : `≈ ${displayEthFiat}`}
          </p>
        </div>
      </div>

      {/* 3. USD Coin (USDC) Card */}
      <div
        onClick={() => onSelectAsset?.('USDC')}
        className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#8BE3BB]/40 transition-all cursor-pointer group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsdcIcon className="w-8 h-8" />
            <div>
              <p className="text-sm font-semibold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                USD Coin
              </p>
              <p className="text-[11px] font-mono text-[#91AAA0]">USDC</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors" />
        </div>

        {/* Amount & Fiat Equivalent */}
        <div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight font-mono">
            {hiddenBalance ? '••••••' : isUsdcLoading ? '...' : displayUsdcAmount}
          </p>
          <p className="text-xs text-[#91AAA0] mt-1 font-mono">
            {hiddenBalance ? '••••' : `≈ ${displayUsdcFiat}`}
          </p>
        </div>
      </div>
    </section>
  );
}
