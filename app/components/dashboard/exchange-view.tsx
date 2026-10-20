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

  return (
    <div className="pt-6 space-y-6 animate-in fade-in duration-150">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: CONVERTER & QUOTE (approx 62%) ================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Calculator Card */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-5 shadow-sm">
            {/* Header & Mode Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#F4F1E8]">Remittance Quote & Converter</h3>
                <p className="text-xs text-[#91AAA0] mt-0.5">
                  Live spot rates guaranteed for 60 seconds with testnet dispatch.
                </p>
              </div>

              {/* Segmented Mode Selector */}
              <div className="flex items-center p-1 rounded-xl bg-[#10231B] border border-[#294438] shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveMode('remittance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMode === 'remittance'
                      ? 'bg-[#183126] text-[#8BE3BB] shadow-xs'
                      : 'text-[#91AAA0] hover:text-[#F4F1E8]'
                  }`}
                >
                  Remittance Quote
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('converter')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeMode === 'converter'
                      ? 'bg-[#183126] text-[#8BE3BB] shadow-xs'
                      : 'text-[#91AAA0] hover:text-[#F4F1E8]'
                  }`}
                >
                  Quick Converter
                </button>
              </div>
            </div>

            {/* MODE 1: REMITTANCE QUOTE */}
            {activeMode === 'remittance' && (
              <div className="space-y-0">
                {/* Arrow + Two boxes as stacked block */}
                <div className="relative">
                  {/* 1. "You Send (INR)" Box */}
                  <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 space-y-2.5 pb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#91AAA0] font-medium">You send</span>
                      <span className="text-[#91AAA0] font-mono text-[11px]">Fiat Corridor: India</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg font-bold text-[#8BE3BB] shrink-0">₹</span>
                        <input
                          type="number"
                          min="100"
                          step="500"
                          value={inrAmount}
                          onChange={(e) => setInrAmount(e.target.value)}
                          placeholder="10000"
                          className="bg-transparent border-none outline-none text-xl sm:text-2xl font-bold font-mono text-[#F4F1E8] w-full min-w-0 [appearance:textfield] [-webkit-appearance:none]"
                        />
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#183126] border border-[#294438] text-xs font-bold font-mono text-[#F4F1E8] shrink-0">
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors ${
                            inrAmount === amt.toString()
                              ? 'bg-[#183126] text-[#8BE3BB] border border-[#8BE3BB]/40'
                              : 'bg-[#183126]/60 text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]'
                          }`}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conversion Direction Divider Arrow — centred between boxes */}
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-9 h-9 rounded-full bg-[#183126] border-2 border-[#294438] text-[#8BE3BB] flex items-center justify-center shadow-md">
                      <ArrowDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* 2. "Recipient Receives" Box */}
                  <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 pt-6 space-y-2.5 mt-px">
                   <div className="flex items-center justify-between text-xs">
                     <span className="text-[#91AAA0] font-medium">Recipient receives (Guaranteed)</span>
                     <span className="text-[#91AAA0] font-mono text-[11px]">
                       {selectedAsset === 'USDC' ? 'Circle ERC-20' : 'Ethereum Native'}
                     </span>
                   </div>

                   <div className="flex items-center justify-between gap-3">
                     <p className="text-xl sm:text-2xl font-bold font-mono text-[#F4F1E8] truncate">
                       {formattedDeliveredAmount}
                     </p>

                     {/* Asset Selector Dropdown Button */}
                     <div className="relative shrink-0">
                       <button
                         type="button"
                         onClick={() => setAssetDropdownOpen((prev) => !prev)}
                         className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#183126] border border-[#294438] hover:border-[#8BE3BB]/40 text-[#F4F1E8] transition-colors"
                       >
                         {selectedAsset === 'USDC' ? (
                           <UsdcIcon className="w-5 h-5" />
                         ) : (
                           <EthereumIcon className="w-5 h-5" />
                         )}
                         <span className="font-mono text-xs font-bold">{selectedAsset}</span>
                         <ChevronDown className="w-3.5 h-3.5 text-[#91AAA0]" />
                       </button>

                       {assetDropdownOpen && (
                         <div className="absolute top-full right-0 mt-1.5 w-36 rounded-xl bg-[#10231B] border border-[#294438] p-1.5 shadow-xl z-20 space-y-1">
                           {(['USDC', 'ETH'] as SupportedAssetSymbol[]).map((sym) => (
                             <button
                               key={sym}
                               type="button"
                               onClick={() => {
                                 setSelectedAsset(sym);
                                 setAssetDropdownOpen(false);
                               }}
                               className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                                 selectedAsset === sym
                                   ? 'bg-[#183126] text-[#8BE3BB]'
                                   : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]/50'
                               }`}
                             >
                               {sym === 'USDC' ? (
                                 <UsdcIcon className="w-4 h-4" />
                               ) : (
                                 <EthereumIcon className="w-4 h-4" />
                               )}
                               <span>{sym}</span>
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   <p className="text-xs text-[#91AAA0] font-mono">
                     ≈ {quote ? formatUSD(quote.estimatedUsdEquivalent) : '$0.00 USD'}
                     <span className="text-[#91AAA0]/60 mx-1">•</span>
                     Rate: 1 {selectedAsset} = ₹
                     {selectedAsset === 'USDC'
                       ? spotRateInrPerUsd.toFixed(2)
                       : (ethPrice?.inr ?? 230000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                   </p>
                  </div>
                </div>

                {/* 3. 60-Second Guaranteed Rate Lock Banner */}
                <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#8BE3BB]" />
                      <span className="font-semibold text-[#F4F1E8]">Rate Guarantee</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#183126] border border-[#294438] text-[11px] font-mono text-[#8BE3BB]">
                      <Clock className="w-3 h-3 animate-spin text-[#8BE3BB]" style={{ animationDuration: '4s' }} />
                      <span>{secondsRemaining}s remaining</span>
                    </div>
                  </div>

                  {/* Transparent Fee & Delivery Table */}
                  <div className="space-y-1.5 text-xs pt-1 border-t border-[#294438]/50">
                    <div className="flex items-center justify-between text-[#91AAA0]">
                      <span>Reference Spot Rate</span>
                      <span className="font-mono text-[#F4F1E8]">
                        1 {selectedAsset} = ₹
                        {selectedAsset === 'USDC'
                          ? spotRateInrPerUsd.toFixed(2)
                          : (ethPrice?.inr ?? 230000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#91AAA0]">
                      <span>Estimated Sepolia Gas Fee</span>
                      <span className="font-mono text-[#F4F1E8]">
                        {quote ? quote.fees.estimatedNetworkFeeEth : '0.000042'} ETH (~
                        {quote ? formatINR(quote.fees.estimatedNetworkFeeInr) : '₹9.50'})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#91AAA0]">
                      <span>Platform Service Fee</span>
                      <span className="font-mono text-[#6ED6A8]">₹0.00 (0% on Testnet)</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#294438]/40 font-semibold text-[#F4F1E8]">
                      <span>Guaranteed Destination Delivery</span>
                      <span className="font-mono text-[#8BE3BB]">
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
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-4 ${
                    isValidAmount && quote
                      ? 'bg-[#1e3d30] hover:bg-[#254d3b] text-[#8BE3BB] border border-[#294438] shadow-sm active:scale-[0.99] cursor-pointer'
                      : 'bg-[#142920] text-[#91AAA0]/50 border border-[#294438]/50 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Lock Rate & Send Money →</span>
                </button>
              </div>
            )}

            {/* MODE 2: QUICK CONVERTER */}
            {activeMode === 'converter' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs text-[#91AAA0]">
                  Convert instantaneously between INR and crypto at current oracle spot rates without locking a quote.
                </div>

                {/* Converter Input Box */}
                <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#91AAA0]">
                    <span>From</span>
                    <span className="font-mono">
                      {converterDirection === 'inr-to-crypto' ? 'Indian Rupee (INR)' : selectedAsset}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      min="0"
                      value={converterValue}
                      onChange={(e) => setConverterValue(e.target.value)}
                      className="bg-transparent border-none outline-none text-xl sm:text-2xl font-bold font-mono text-[#F4F1E8] w-full"
                    />
                    <span className="px-2.5 py-1 rounded-lg bg-[#183126] border border-[#294438] text-xs font-bold font-mono text-[#F4F1E8]">
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
                    className="p-2 rounded-full bg-[#183126] border border-[#294438] text-[#8BE3BB] hover:bg-[#10231B] transition-colors"
                    title="Switch direction"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Converter Result Box */}
                <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#91AAA0]">
                    <span>To (Calculated)</span>
                    <span className="font-mono">
                      {converterDirection === 'inr-to-crypto' ? selectedAsset : 'INR'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl sm:text-2xl font-bold font-mono text-[#8BE3BB] truncate">
                      {converterDirection === 'inr-to-crypto' ? '' : '₹'}
                      {converterResult}
                    </p>
                    <span className="px-2.5 py-1 rounded-lg bg-[#183126] border border-[#294438] text-xs font-bold font-mono text-[#F4F1E8]">
                      {converterDirection === 'inr-to-crypto' ? selectedAsset : 'INR'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Testnet Faucets & Documentation Card */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#8BE3BB]" />
              <h4 className="text-xs font-bold text-[#F4F1E8] uppercase tracking-wider">
                Sepolia Testnet Resources
              </h4>
            </div>
            <p className="text-xs text-[#91AAA0]">
              Exchange calculations use genuine oracle spot feeds. Need testnet funds to execute transfers?
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#8BE3BB] hover:border-[#8BE3BB]/50 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Circle USDC Faucet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://sepoliafaucet.com/"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#8BE3BB] hover:border-[#8BE3BB]/50 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Sepolia ETH Faucet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: LIVE TICKER & SAVINGS (approx 38%) ================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Live Market Rates & Oracle Ticker */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#F4F1E8]">Live Market Rates</h3>
                <p className="text-xs text-[#91AAA0] mt-0.5">Sepolia Oracle & CoinGecko Feeds</p>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                className="p-2 rounded-xl bg-[#10231B] border border-[#294438] text-[#91AAA0] hover:text-[#8BE3BB] transition-colors"
                title="Refresh rates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ETH Ticker Row */}
            <div className="rounded-xl bg-[#10231B] border border-[#294438] p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EthereumIcon className="w-8 h-8" />
                <div>
                  <p className="text-xs font-bold text-[#F4F1E8]">Ethereum</p>
                  <p className="text-[11px] text-[#91AAA0] font-mono">ETH / INR</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold font-mono text-[#F4F1E8]">
                  ₹{(ethPrice?.inr ?? 230000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] font-mono text-[#91AAA0]">
                  ${(ethPrice?.usd ?? 2400).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
                </p>
              </div>
            </div>

            {/* USDC Ticker Row */}
            <div className="rounded-xl bg-[#10231B] border border-[#294438] p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UsdcIcon className="w-8 h-8" />
                <div>
                  <p className="text-xs font-bold text-[#F4F1E8]">USD Coin</p>
                  <p className="text-[11px] text-[#91AAA0] font-mono">USDC / INR</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold font-mono text-[#F4F1E8]">
                  ₹{spotRateInrPerUsd.toFixed(2)}
                </p>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1e3d30] text-[#6ED6A8]">
                  $1.00 Pegged
                </span>
              </div>
            </div>

            {/* Live Status Footnote */}
            <div className="flex items-center justify-between text-[11px] text-[#91AAA0] pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6ED6A8] animate-pulse" />
                <span>Live Feed Online</span>
              </span>
              <span>Updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Recent'}</span>
            </div>
          </div>

          {/* Card 2: Cross-Corridor Savings Benchmark */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#F4F1E8]">Savings Benchmark</h3>

                {/* Corridor Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCorridorDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10231B] border border-[#294438] text-xs font-medium text-[#F4F1E8] hover:border-[#8BE3BB]/40 transition-colors"
                  >
                    <span>{selectedCorridor.flag} {selectedCorridor.currency}</span>
                    <ChevronDown className="w-3 h-3 text-[#91AAA0]" />
                  </button>

                  {corridorDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-44 rounded-xl bg-[#10231B] border border-[#294438] p-1.5 shadow-xl z-20 space-y-1">
                      {SUPPORTED_DESTINATIONS.map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={() => {
                            setSelectedCorridorId(dest.id);
                            setCorridorDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                            selectedCorridorId === dest.id
                              ? 'bg-[#183126] text-[#8BE3BB]'
                              : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]/50'
                          }`}
                        >
                          <span>{dest.flag}</span>
                          <span>{dest.country}</span>
                          <span className="text-[10px] text-[#91AAA0]">({dest.currency})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#91AAA0] mt-0.5">
                Comparison on a ₹{parsedInr > 0 ? parsedInr.toLocaleString('en-IN') : '10,000'} transfer
              </p>
            </div>

            {/* Provider Breakdown */}
            <div className="space-y-2.5">
              {/* SwiftChain Card (Recommended) */}
              <div className="rounded-xl bg-[#10231B] border border-[#8BE3BB]/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F4F1E8]">SwiftChain (Web3 Rail)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1e3d30] text-[#6ED6A8]">
                      Best Value
                    </span>
                  </div>
                  <span className="font-bold font-mono text-[#8BE3BB]">
                    {selectedCorridor.currencySymbol}
                    {swiftchainProvider?.destinationAmountDelivered.toFixed(2) ?? '105.20'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#91AAA0]">
                  <span>Fee: 0% Platform + ~₹25 Gas</span>
                  <span className="text-[#6ED6A8] flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>&lt; 30 seconds</span>
                  </span>
                </div>
              </div>

              {/* Traditional Bank Wire */}
              <div className="rounded-xl bg-[#10231B]/60 border border-[#294438] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F4F1E8]">Traditional Bank Wire (SWIFT)</span>
                  <span className="font-mono text-[#91AAA0]">
                    {selectedCorridor.currencySymbol}
                    {bankWireProvider?.destinationAmountDelivered.toFixed(2) ?? '98.40'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#91AAA0]">
                  <span>Fee: ~3.5% FX Spread + ₹1,500</span>
                  <span>3–5 business days</span>
                </div>
              </div>

              {/* Legacy MTO */}
              <div className="rounded-xl bg-[#10231B]/60 border border-[#294438] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F4F1E8]">Legacy Money Transfer (MTO)</span>
                  <span className="font-mono text-[#91AAA0]">
                    {selectedCorridor.currencySymbol}
                    {legacyMtoProvider?.destinationAmountDelivered.toFixed(2) ?? '96.10'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#91AAA0]">
                  <span>Fee: ~4.0% FX Spread + Fee</span>
                  <span>1–2 business days</span>
                </div>
              </div>
            </div>

            {/* Benchmark Savings Callout Banner */}
            <div className="p-3 rounded-xl bg-[#1e3d30]/60 border border-[#294438] text-xs text-[#6ED6A8] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#8BE3BB] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#F4F1E8]">
                  Recipient receives up to {selectedCorridor.currencySymbol}
                  {savingsDifference.toFixed(2)} more with SwiftChain.
                </p>
                <p className="text-[11px] text-[#91AAA0] mt-0.5">
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
