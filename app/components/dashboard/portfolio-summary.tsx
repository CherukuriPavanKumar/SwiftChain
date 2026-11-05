'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ChevronRight, ChevronDown } from 'lucide-react';
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
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Portfolio Summary">
      {/* 1. Total Portfolio Value Card */}
      <div className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#335345] transition-colors">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-[#a6b8b0]">Total portfolio value</span>
            <button
              type="button"
              onClick={() => setHiddenBalance((prev) => !prev)}
              aria-label={hiddenBalance ? 'Show balance' : 'Hide balance'}
              className="text-[#7a9187] hover:text-[#F4F1E8] transition-colors p-0.5 rounded"
            >
              {hiddenBalance ? <EyeOff className="w-3.5 h-3.5 stroke-[1.5]" /> : <Eye className="w-3.5 h-3.5 stroke-[1.5]" />}
            </button>
          </div>

          {/* Currency Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCurrencyDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#071410] border border-[#233a30] text-xs font-bold text-[#F4F1E8] hover:border-[#335345] transition-colors"
            >
              <span>{selectedCurrency}</span>
              <ChevronDown className="w-3 h-3 text-[#7a9187] stroke-[1.5]" />
            </button>

            {currencyDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-24 rounded-lg bg-[#071410] border border-[#233a30] py-1 shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCurrency('INR');
                    setCurrencyDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCurrency === 'INR' ? 'text-[#8BE3BB] bg-[#152920]' : 'text-[#a6b8b0] hover:text-[#F4F1E8]'
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
                    selectedCurrency === 'USD' ? 'text-[#8BE3BB] bg-[#152920]' : 'text-[#a6b8b0] hover:text-[#F4F1E8]'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Big Balance Number: Bold and Tabular */}
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight font-mono tabular-nums">
            {hiddenBalance ? '••••••••' : displayTotal}
          </p>
        </div>

        {/* 24h Change Trend */}
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`font-medium tabular-nums flex items-center gap-0.5 ${
              isPositiveChange ? 'text-[#8BE3BB]' : 'text-[#FF8585]'
            }`}
          >
            <span>{isPositiveChange ? '↑' : '↓'}</span>
            <span>{isPositiveChange ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`}</span>
          </span>
          <span className="text-[#7a9187] font-normal">(24h)</span>
        </div>
      </div>

      {/* 2. Ethereum (ETH) Card */}
      <div
        onClick={() => onSelectAsset?.('ETH')}
        className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#335345] transition-colors cursor-pointer group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EthereumIcon className="w-7 h-7" />
            <div>
              <p className="text-sm font-bold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                Ethereum
              </p>
              <p className="text-xs font-mono text-[#7a9187]">ETH</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#7a9187] group-hover:text-[#8BE3BB] transition-colors stroke-[1.5]" />
        </div>

        {/* Amount & Fiat Equivalent: Bold and Tabular */}
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight font-mono tabular-nums">
            {hiddenBalance ? '••••••' : isEthLoading ? '...' : displayEthAmount}
          </p>
          <p className="text-xs text-[#7a9187] mt-1 font-mono tabular-nums">
            {hiddenBalance ? '••••' : `≈ ${displayEthFiat}`}
          </p>
        </div>
      </div>

      {/* 3. USD Coin (USDC) Card */}
      <div
        onClick={() => onSelectAsset?.('USDC')}
        className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#335345] transition-colors cursor-pointer group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UsdcIcon className="w-7 h-7" />
            <div>
              <p className="text-sm font-bold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                USD Coin
              </p>
              <p className="text-xs font-mono text-[#7a9187]">USDC</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#7a9187] group-hover:text-[#8BE3BB] transition-colors stroke-[1.5]" />
        </div>

        {/* Amount & Fiat Equivalent: Bold and Tabular */}
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight font-mono tabular-nums">
            {hiddenBalance ? '••••••' : isUsdcLoading ? '...' : displayUsdcAmount}
          </p>
          <p className="text-xs text-[#7a9187] mt-1 font-mono tabular-nums">
            {hiddenBalance ? '••••' : `≈ ${displayUsdcFiat}`}
          </p>
        </div>
      </div>
    </section>
  );
}
