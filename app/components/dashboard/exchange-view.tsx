'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGasPrice } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useEthPrice } from '@/app/components/eth-price-ticker';
import { EthereumIcon, UsdcIcon } from './token-icons';
import {
  calculateRemittanceQuote,
  formatINR,
  formatUSD,
  formatTokenAmount,
  DEFAULT_ETH_TRANSFER_GAS_UNITS,
  DEFAULT_ERC20_TRANSFER_GAS_UNITS,
} from '@/lib/quote';
import {
  calculateRemittanceComparison,
  SUPPORTED_DESTINATIONS,
  type RemittanceDestination,
} from '@/lib/comparison';
import { SUPPORTED_TOKENS, type SupportedAssetSymbol } from '@/lib/tokens';
import {
  ArrowDown,
  ArrowUpDown,
  Lock,
  RefreshCw,
  Clock,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Send,
  Zap,
} from 'lucide-react';

interface ExchangeViewProps {
  onLockRateAndSend?: (asset: SupportedAssetSymbol, amount: string) => void;
}

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export function ExchangeView({ onLockRateAndSend }: ExchangeViewProps) {
  const { data: marketData, isLoading, refetch, dataUpdatedAt } = useEthPrice();
  const { data: gasPriceWei } = useGasPrice({ chainId: sepolia.id });

  // Mode: "remittance" vs "converter"
  const [activeMode, setActiveMode] = useState<'remittance' | 'converter'>('remittance');

  // Remittance state
  const [selectedAsset, setSelectedAsset] = useState<SupportedAssetSymbol>('USDC');
  const [inrAmount, setInrAmount] = useState<string>('10000');
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);

  // Quote guarantee timer (60s countdown)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);

  // Two-way converter state
  const [converterDirection, setConverterDirection] = useState<'inr-to-crypto' | 'crypto-to-inr'>('inr-to-crypto');
  const [converterValue, setConverterValue] = useState<string>('10000');

  // Savings benchmark corridor state
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('US');
  const [corridorDropdownOpen, setCorridorDropdownOpen] = useState(false);

  // 60-Second quote expiration countdown timer
  useEffect(() => {
    setSecondsRemaining(60);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          refetch();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dataUpdatedAt, refetch]);

  const parsedInr = parseFloat(inrAmount);
  const isValidAmount = !isNaN(parsedInr) && parsedInr > 0;

  // Gas calculation based on asset
  const effectiveGasUnits =
    selectedAsset === 'USDC'
      ? DEFAULT_ERC20_TRANSFER_GAS_UNITS
      : DEFAULT_ETH_TRANSFER_GAS_UNITS;

  // Remittance quote calculation
  const quote = useMemo(() => {
    if (!marketData || !isValidAmount) return null;

    return calculateRemittanceQuote({
      sourceAmountInr: parsedInr,
      assetSymbol: selectedAsset,
      marketData,
      gasUnits: effectiveGasUnits,
      gasPriceWei: gasPriceWei ?? BigInt(1500000000),
    });
  }, [marketData, parsedInr, isValidAmount, selectedAsset, effectiveGasUnits, gasPriceWei]);

  // Market prices
  const ethPrice = marketData?.ethereum ?? marketData;
  const usdcPrice = marketData?.usdc;
  const spotRateInrPerUsd = marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88;

  // Benchmark calculations
  const comparison = useMemo(() => {
    if (!isValidAmount || !spotRateInrPerUsd) return null;
    return calculateRemittanceComparison(
      parsedInr,
      spotRateInrPerUsd,
      selectedCorridorId,
      25 // estimated gas INR
    );
  }, [parsedInr, spotRateInrPerUsd, selectedCorridorId, isValidAmount]);

  const selectedCorridor = useMemo(() => {
    return (
      SUPPORTED_DESTINATIONS.find((d) => d.id === selectedCorridorId) ??
      SUPPORTED_DESTINATIONS[0]
    );
  }, [selectedCorridorId]);

  const swiftchainProvider = comparison?.providers.find((p) => p.id === 'swiftchain');
  const bankWireProvider = comparison?.providers.find((p) => p.id === 'bank_wire');
  const legacyMtoProvider = comparison?.providers.find((p) => p.id === 'legacy_mto');

  const savingsDifference =
    swiftchainProvider && bankWireProvider
      ? Math.max(0, swiftchainProvider.destinationAmountDelivered - bankWireProvider.destinationAmountDelivered)
      : 0;

  // Formatted crypto delivery amount with readable token decimals
  const formattedDeliveredAmount = useMemo(() => {
    if (!quote) return '0.00';
    const val = parseFloat(quote.destinationCryptoAmount);
    if (isNaN(val)) return '0.00';
    return selectedAsset === 'USDC' ? val.toFixed(2) : val.toFixed(6);
  }, [quote, selectedAsset]);

  // Converter calculation
  const converterResult = useMemo(() => {
    const num = parseFloat(converterValue);
    if (!marketData || isNaN(num) || num <= 0) return '0.00';

    const tokenPriceInr =
      selectedAsset === 'USDC'
        ? (marketData.usdc?.inr ?? marketData.fiatReference?.inrPerUsd ?? 94.88)
        : (ethPrice?.inr ?? 230000);

    if (converterDirection === 'inr-to-crypto') {
      const tokens = num / tokenPriceInr;
      return selectedAsset === 'USDC' ? tokens.toFixed(2) : tokens.toFixed(6);
    } else {
      const inr = num * tokenPriceInr;
      return inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }, [marketData, converterValue, selectedAsset, converterDirection, ethPrice]);

  function handleLockAndSend() {
    if (!onLockRateAndSend || !quote) return;
    onLockRateAndSend(selectedAsset, quote.destinationCryptoAmount);
  }

  /* Shared class tokens */
  const cardCls = 'rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 space-y-4';
  const innerBlockCls = 'rounded-lg bg-[#071410] border border-[#233a30]';

  return (
    <div className="pt-6 space-y-5 animate-in fade-in duration-150">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Converter & Quote */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Calculator Card */}
          <div className={cardCls}>
            {/* Header & Mode Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#F4F1E8]">Remittance quote &amp; converter</h3>
                <p className="text-xs text-[#7a9187] mt-0.5">
                  Live spot rates guaranteed for 60 seconds.
                </p>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex items-center p-1 rounded-lg bg-[#071410] border border-[#233a30] shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveMode('remittance')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 ${
                    activeMode === 'remittance'
                      ? 'bg-[#152920] text-[#8BE3BB]'
                      : 'text-[#7a9187] hover:text-[#F4F1E8]'
                  }`}
                >
                  Remittance
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('converter')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 ${
                    activeMode === 'converter'
                      ? 'bg-[#152920] text-[#8BE3BB]'
                      : 'text-[#7a9187] hover:text-[#F4F1E8]'
                  }`}
                >
                  Converter
                </button>
              </div>
            </div>

            {/* MODE 1: REMITTANCE QUOTE */}
            {activeMode === 'remittance' && (
              <div className="space-y-0">
                {/* Arrow + Two boxes as stacked block */}
                <div className="relative">
                  {/* 1. "You Send (INR)" Box */}
                  <div className={`${innerBlockCls} p-4 space-y-2.5 pb-5`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#7a9187]">You send</span>
                      <span className="text-[#7a9187] font-mono">Corridor: India</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg font-bold text-[#8BE3BB] shrink-0">\u20b9</span>
                        <input
                          type="number"
                          min="100"
                          step="500"
                          value={inrAmount}
                          onChange={(e) => setInrAmount(e.target.value)}
                          placeholder="10000"
                          className="bg-transparent border-none outline-none text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#F4F1E8] w-full min-w-0 [appearance:textfield] [-webkit-appearance:none]"
                        />
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-[#152920] border border-[#233a30] text-xs font-bold font-mono tabular-nums text-[#F4F1E8] shrink-0">
                        INR
                      </span>
                    </div>

                    {/* Quick Amount Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {QUICK_AMOUNTS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setInrAmount(amt.toString())}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors duration-150 ${
                            inrAmount === amt.toString()
                              ? 'bg-[#152920] text-[#8BE3BB] border border-[#233a30]'
                              : 'bg-[#0d1e17] text-[#7a9187] border border-[#233a30]/50 hover:text-[#F4F1E8] hover:bg-[#152920]'
                          }`}
                        >
                          \u20b9{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conversion Direction Divider Arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-8 h-8 rounded-full bg-[#0d1e17] border border-[#233a30] text-[#8BE3BB] flex items-center justify-center">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* 2. "Recipient Receives" Box */}
                  <div className={`${innerBlockCls} p-4 pt-6 space-y-2.5 mt-px`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#7a9187]">Recipient receives</span>
                      <span className="text-[#7a9187] font-mono">
                        {selectedAsset === 'USDC' ? 'Circle ERC-20' : 'Ethereum native'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#F4F1E8] truncate">
                        {formattedDeliveredAmount}
                      </p>

                      {/* Asset Selector Dropdown */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setAssetDropdownOpen((prev) => !prev)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#152920] border border-[#233a30] hover:border-[#8BE3BB]/35 text-[#F4F1E8] transition-colors duration-150"
                        >
                          {selectedAsset === 'USDC' ? (
                            <UsdcIcon className="w-5 h-5" />
                          ) : (
                            <EthereumIcon className="w-5 h-5" />
                          )}
                          <span className="font-mono text-xs font-bold tabular-nums">{selectedAsset}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#7a9187]" />
                        </button>

                        {assetDropdownOpen && (
                          <div className="absolute top-full right-0 mt-1.5 w-36 rounded-lg bg-[#0d1e17] border border-[#233a30] p-1 shadow-lg z-20 space-y-0.5">
                            {(['USDC', 'ETH'] as SupportedAssetSymbol[]).map((sym) => (
                              <button
                                key={sym}
                                type="button"
                                onClick={() => {
                                  setSelectedAsset(sym);
                                  setAssetDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium text-left transition-colors duration-150 ${
                                  selectedAsset === sym
                                    ? 'bg-[#152920] text-[#8BE3BB]'
                                    : 'text-[#a6b8b0] hover:text-[#F4F1E8] hover:bg-[#152920]/60'
                                }`}
                              >
                                {sym === 'USDC' ? (
                                  <UsdcIcon className="w-4 h-4" />
                                ) : (
                                  <EthereumIcon className="w-4 h-4" />
                                )}
                                <span className="tabular-nums">{sym}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#7a9187] font-mono tabular-nums">
                      {quote ? formatUSD(quote.estimatedUsdEquivalent) : '$0.00 USD'}
                      <span className="text-[#7a9187]/50 mx-1">&middot;</span>
                      Rate: 1 {selectedAsset} = \u20b9
                      {selectedAsset === 'USDC'
                        ? spotRateInrPerUsd.toFixed(2)
                        : (ethPrice?.inr ?? 230000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                {/* 3. 60-Second Rate Lock Banner */}
                <div className={`${innerBlockCls} p-4 space-y-3 mt-3`}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#8BE3BB]" />
                      <span className="font-semibold text-[#F4F1E8]">Rate guarantee</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#152920] border border-[#233a30] text-xs font-mono text-[#8BE3BB] tabular-nums">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{secondsRemaining}s</span>
                    </div>
                  </div>

                  {/* Transparent Fee & Delivery Table */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-[#233a30]/50">
                    <div className="flex items-center justify-between text-[#7a9187]">
                      <span>Reference spot rate</span>
                      <span className="font-mono tabular-nums text-[#a6b8b0]">
                        1 {selectedAsset} = \u20b9
                        {selectedAsset === 'USDC'
                          ? spotRateInrPerUsd.toFixed(2)
                          : (ethPrice?.inr ?? 230000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#7a9187]">
                      <span>Estimated gas fee</span>
                      <span className="font-mono tabular-nums text-[#a6b8b0]">
                        {quote ? quote.fees.estimatedNetworkFeeEth : '0.000042'} ETH (~
                        {quote ? formatINR(quote.fees.estimatedNetworkFeeInr) : '\u20b99.50'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#7a9187]">
                      <span>Platform fee</span>
                      <span className="font-mono tabular-nums text-[#6ED6A8]">\u20b90.00 (0% on testnet)</span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#233a30]/40 font-semibold text-[#F4F1E8]">
                      <span>Guaranteed delivery</span>
                      <span className="font-mono tabular-nums text-[#8BE3BB]">
                        {quote ? `${formattedDeliveredAmount} ${selectedAsset}` : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleLockAndSend}
                  disabled={!isValidAmount || !quote}
                  className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 mt-3 ${
                    isValidAmount && quote
                      ? 'bg-[#152920] hover:bg-[#1e3d30] text-[#8BE3BB] border border-[#233a30] active:scale-[0.99] cursor-pointer'
                      : 'bg-[#0d1e17] text-[#7a9187]/50 border border-[#233a30]/50 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Lock rate &amp; send money</span>
                </button>
              </div>
            )}

            {/* MODE 2: QUICK CONVERTER */}
            {activeMode === 'converter' && (
              <div className="space-y-4">
                <div className={`${innerBlockCls} p-3 text-xs text-[#7a9187]`}>
                  Convert between INR and crypto at current oracle spot rates without locking a quote.
                </div>

                {/* Converter Input Box */}
                <div className={`${innerBlockCls} p-4 space-y-2`}>
                  <div className="flex items-center justify-between text-xs text-[#7a9187]">
                    <span>From</span>
                    <span className="font-mono tabular-nums">
                      {converterDirection === 'inr-to-crypto' ? 'Indian Rupee (INR)' : selectedAsset}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      min="0"
                      value={converterValue}
                      onChange={(e) => setConverterValue(e.target.value)}
                      className="bg-transparent border-none outline-none text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#F4F1E8] w-full"
                    />
                    <span className="px-2.5 py-1 rounded-md bg-[#152920] border border-[#233a30] text-xs font-bold font-mono tabular-nums text-[#F4F1E8] shrink-0">
                      {converterDirection === 'inr-to-crypto' ? 'INR' : selectedAsset}
                    </span>
                  </div>
                </div>

                {/* Reverse Direction Switcher */}
                <div className="flex justify-center -my-1">
                  <button
                    type="button"
                    onClick={() =>
                      setConverterDirection((prev) =>
                        prev === 'inr-to-crypto' ? 'crypto-to-inr' : 'inr-to-crypto'
                      )
                    }
                    className="p-2 rounded-full bg-[#152920] border border-[#233a30] text-[#8BE3BB] hover:bg-[#0d1e17] transition-colors duration-150"
                    title="Switch direction"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Converter Result Box */}
                <div className={`${innerBlockCls} p-4 space-y-2`}>
                  <div className="flex items-center justify-between text-xs text-[#7a9187]">
                    <span>To</span>
                    <span className="font-mono tabular-nums">
                      {converterDirection === 'inr-to-crypto' ? selectedAsset : 'INR'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#8BE3BB] truncate">
                      {converterDirection === 'inr-to-crypto' ? '' : '\u20b9'}
                      {converterResult}
                    </p>
                    <span className="px-2.5 py-1 rounded-md bg-[#152920] border border-[#233a30] text-xs font-bold font-mono tabular-nums text-[#F4F1E8] shrink-0">
                      {converterDirection === 'inr-to-crypto' ? selectedAsset : 'INR'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Testnet Faucets Card */}
          <div className={`${cardCls} !space-y-3`}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#8BE3BB] shrink-0" />
              <h4 className="text-xs font-bold text-[#F4F1E8]">Sepolia testnet resources</h4>
            </div>
            <p className="text-xs text-[#7a9187]">
              Exchange calculations use genuine oracle spot feeds. Need testnet funds to execute transfers?
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#071410] border border-[#233a30] text-xs font-semibold text-[#8BE3BB] hover:border-[#8BE3BB]/40 transition-colors duration-150 inline-flex items-center gap-1.5"
              >
                <span>Circle USDC faucet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://sepoliafaucet.com/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#071410] border border-[#233a30] text-xs font-semibold text-[#8BE3BB] hover:border-[#8BE3BB]/40 transition-colors duration-150 inline-flex items-center gap-1.5"
              >
                <span>Sepolia ETH faucet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Ticker & Savings */}
        <div className="lg:col-span-5 space-y-4">

          {/* Card 1: Live Market Rates */}
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Live market rates</h3>
                <p className="text-xs text-[#7a9187] mt-0.5">Sepolia oracle &amp; CoinGecko feeds</p>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-2 rounded-lg bg-[#071410] border border-[#233a30] text-[#7a9187] hover:text-[#8BE3BB] transition-colors duration-150"
                title="Refresh rates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ETH Ticker Row */}
            <div className={`${innerBlockCls} p-3.5 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <EthereumIcon className="w-8 h-8" />
                <div>
                  <p className="text-xs font-bold text-[#F4F1E8]">Ethereum</p>
                  <p className="text-xs text-[#7a9187] font-mono">ETH / INR</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#F4F1E8]">
                  \u20b9{(ethPrice?.inr ?? 230000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs font-mono tabular-nums text-[#7a9187]">
                  ${(ethPrice?.usd ?? 2400).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
                </p>
              </div>
            </div>

            {/* USDC Ticker Row */}
            <div className={`${innerBlockCls} p-3.5 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <UsdcIcon className="w-8 h-8" />
                <div>
                  <p className="text-xs font-bold text-[#F4F1E8]">USD Coin</p>
                  <p className="text-xs text-[#7a9187] font-mono">USDC / INR</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#F4F1E8]">
                  \u20b9{spotRateInrPerUsd.toFixed(2)}
                </p>
                <span className="inline-block px-1.5 py-0.5 rounded-md text-xs font-medium bg-[#152920] border border-[#233a30] text-[#6ED6A8]">
                  $1.00 pegged
                </span>
              </div>
            </div>

            {/* Live Status Footnote */}
            <div className="flex items-center justify-between text-xs text-[#7a9187] pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                <span>Live feed online</span>
              </span>
              <span className="font-mono tabular-nums">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Recent'}
              </span>
            </div>
          </div>

          {/* Card 2: Cross-Corridor Savings Benchmark */}
          <div className={cardCls}>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F4F1E8]">Savings benchmark</h3>

                {/* Corridor Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCorridorDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#071410] border border-[#233a30] text-xs font-medium text-[#F4F1E8] hover:border-[#8BE3BB]/35 transition-colors duration-150"
                  >
                    <span>{selectedCorridor.flag} {selectedCorridor.currency}</span>
                    <ChevronDown className="w-3 h-3 text-[#7a9187]" />
                  </button>

                  {corridorDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-44 rounded-lg bg-[#0d1e17] border border-[#233a30] p-1 shadow-lg z-20 space-y-0.5">
                      {SUPPORTED_DESTINATIONS.map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => {
                            setSelectedCorridorId(dest.id);
                            setCorridorDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors duration-150 ${
                            selectedCorridorId === dest.id
                              ? 'bg-[#152920] text-[#8BE3BB]'
                              : 'text-[#a6b8b0] hover:text-[#F4F1E8] hover:bg-[#152920]/60'
                          }`}
                        >
                          <span>{dest.flag}</span>
                          <span>{dest.country}</span>
                          <span className="text-xs text-[#7a9187]">({dest.currency})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#7a9187] mt-0.5">
                On a \u20b9{parsedInr > 0 ? parsedInr.toLocaleString('en-IN') : '10,000'} transfer
              </p>
            </div>

            {/* Provider Breakdown */}
            <div className="space-y-2">
              {/* SwiftChain Row */}
              <div className={`rounded-lg bg-[#071410] border border-[#8BE3BB]/20 p-3 space-y-1.5`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F4F1E8]">SwiftChain</span>
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-semibold bg-[#152920] border border-[#233a30] text-[#6ED6A8]">
                      Best value
                    </span>
                  </div>
                  <span className="font-bold font-mono tabular-nums text-[#8BE3BB]">
                    {selectedCorridor.currencySymbol}
                    {swiftchainProvider?.destinationAmountDelivered.toFixed(2) ?? '105.20'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#7a9187]">
                  <span>0% platform + ~\u20b925 gas</span>
                  <span className="text-[#6ED6A8] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>under 30 seconds</span>
                  </span>
                </div>
              </div>

              {/* Traditional Bank Wire */}
              <div className={`${innerBlockCls} p-3 space-y-1.5 opacity-80`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F4F1E8]">Bank wire (SWIFT)</span>
                  <span className="font-mono tabular-nums text-[#7a9187]">
                    {selectedCorridor.currencySymbol}
                    {bankWireProvider?.destinationAmountDelivered.toFixed(2) ?? '98.40'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#7a9187]">
                  <span>~3.5% FX spread + \u20b91,500</span>
                  <span>3\u20135 business days</span>
                </div>
              </div>

              {/* Legacy MTO */}
              <div className={`${innerBlockCls} p-3 space-y-1.5 opacity-80`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F4F1E8]">Money transfer operator</span>
                  <span className="font-mono tabular-nums text-[#7a9187]">
                    {selectedCorridor.currencySymbol}
                    {legacyMtoProvider?.destinationAmountDelivered.toFixed(2) ?? '96.10'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#7a9187]">
                  <span>~4.0% FX spread + fee</span>
                  <span>1\u20132 business days</span>
                </div>
              </div>
            </div>

            {/* Savings Callout Banner */}
            <div className="p-3 rounded-lg bg-[#152920]/60 border border-[#233a30] text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#8BE3BB] shrink-0 mt-px" />
              <div>
                <p className="font-semibold text-[#F4F1E8]">
                  Recipient receives up to {selectedCorridor.currencySymbol}
                  {savingsDifference.toFixed(2)} more with SwiftChain.
                </p>
                <p className="text-xs text-[#7a9187] mt-0.5">
                  Eliminates correspondent banking layers with instant on-chain settlement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
