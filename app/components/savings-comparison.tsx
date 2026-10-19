'use client';

import { useState, useMemo } from 'react';
import { useEthPrice } from './eth-price-ticker';
import {
  calculateRemittanceComparison,
  formatINR,
  formatDestinationCurrency,
  SUPPORTED_DESTINATIONS,
  DEFAULT_COMPARISON_CONFIG,
  type ComparisonConfig,
} from '@/lib/comparison';

export default function SavingsComparison() {
  const { data: marketData } = useEthPrice();

  const [inputInr, setInputInr] = useState<string>('10000');
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>('US');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Configurable assumptions state
  const [config, setConfig] = useState<ComparisonConfig>(DEFAULT_COMPARISON_CONFIG);

  const spotRate = marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.85;
  const gasInr = 25; // Estimated live Sepolia ETH gas in INR

  const parsedAmount = parseFloat(inputInr);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const comparison = useMemo(() => {
    if (!isValid || !spotRate) return null;
    return calculateRemittanceComparison(parsedAmount, spotRate, selectedDestinationId, gasInr, config);
  }, [parsedAmount, spotRate, selectedDestinationId, gasInr, config, isValid]);

  const swiftchain = comparison?.providers.find((p) => p.id === 'swiftchain');
  const bankWire = comparison?.providers.find((p) => p.id === 'bank_wire');

  const illustrativeDeliveredDifference =
    swiftchain && bankWire
      ? Math.max(0, swiftchain.destinationAmountDelivered - bankWire.destinationAmountDelivered)
      : 0;

  return (
    <div className="mt-8 p-5 border border-white/10 rounded-2xl bg-white/5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Savings & Remittance Speed Comparison</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono">
              Benchmark Calculator
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Compare SwiftChain testnet stablecoin settlement against illustrative banking and transfer operator rails
          </p>
        </div>

        {/* Inputs row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Destination Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="compare-destination" className="text-xs text-gray-400 shrink-0">
              Corridor:
            </label>
            <select
              id="compare-destination"
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              className="py-1 px-2 text-xs font-medium bg-black/40 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SUPPORTED_DESTINATIONS.map((dest) => (
                <option key={dest.id} value={dest.id} className="bg-gray-900 text-white">
                  {dest.flag} {dest.country} ({dest.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="compare-amount" className="text-xs text-gray-400 shrink-0">
              Amount:
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-gray-400">₹</span>
              <input
                id="compare-amount"
                type="number"
                min="100"
                step="500"
                value={inputInr}
                onChange={(e) => setInputInr(e.target.value)}
                className="w-28 pl-6 pr-2 py-1 text-xs font-mono bg-black/40 border border-white/15 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preset Amount Badges */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
        <span>Quick amounts:</span>
        {['5000', '10000', '25000', '50000', '100000'].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setInputInr(preset)}
            className={`px-2 py-0.5 rounded transition-colors ${
              inputInr === preset
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            ₹{parseInt(preset).toLocaleString('en-IN')}
          </button>
        ))}
      </div>

      {/* Comparison Cards Grid */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {comparison.providers.map((provider) => {
            const isSwiftchain = provider.id === 'swiftchain';

            return (
              <div
                key={provider.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  isSwiftchain
                    ? 'bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/30'
                    : 'bg-black/30 border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{provider.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono font-bold ${
                        provider.isSourced
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-gray-400 border border-white/10'
                      }`}
                    >
                      {provider.isSourced ? 'Live Sourced' : 'Illustrative'}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 mb-3">{provider.category}</div>

                  {/* Delivered Amount Card */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-0.5 mb-3">
                    <div className="text-[10px] text-gray-400">Recipient Receives:</div>
                    <div
                      className={`text-lg font-bold font-mono ${
                        isSwiftchain ? 'text-emerald-400' : 'text-white'
                      }`}
                    >
                      {formatDestinationCurrency(
                        provider.destinationAmountDelivered,
                        provider.destinationCurrency,
                        provider.destinationSymbol
                      )}
                    </div>
                    {isSwiftchain && (
                      <div className="text-[10px] text-emerald-400 font-medium">
                        Circle USDC on Sepolia ({comparison.destination.payoutRail})
                      </div>
                    )}
                  </div>

                  {/* Breakdown List */}
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Effective Rate:</span>
                      <span className="font-mono">
                        1 {provider.destinationCurrency} ≈ ₹{provider.exchangeRate.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">FX Markup Spread:</span>
                      <span
                        className={
                          provider.fxMarkupPercent === 0
                            ? 'text-emerald-400 font-semibold'
                            : 'text-amber-400 font-medium'
                        }
                      >
                        {provider.fxMarkupPercent === 0
                          ? '0.0% (Spot Reference)'
                          : `+${provider.fxMarkupPercent.toFixed(1)}% (≈ ₹${provider.fxCostInr.toFixed(0)})`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Upfront Service Fee:</span>
                      <span className="font-mono">
                        {provider.serviceFeeInr === 0 ? '₹0.00' : formatINR(provider.serviceFeeInr)}
                      </span>
                    </div>

                    {provider.intermediaryFeeLocal > 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">Correspondent Deduction:</span>
                        <span className="font-mono text-rose-300">
                          -{provider.destinationSymbol}
                          {provider.intermediaryFeeLocal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {provider.networkFeeInr > 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-400">Est. Sepolia Network Gas:</span>
                        <span className="font-mono text-gray-300">~₹{provider.networkFeeInr.toFixed(0)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Total Sender Outlay:</span>
                      <span className="font-mono font-medium text-white">
                        {formatINR(provider.totalSenderCostInr)}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-white/5 flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Delivery Estimate:</span>
                      <span className={isSwiftchain ? 'text-emerald-400 font-medium' : 'text-gray-300'}>
                        {provider.deliverySpeed}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-400 pt-2 border-t border-white/5 italic">
                  {provider.notes}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Highlight & Transparency Banner */}
      {comparison && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">💡</span>
            <div className="space-y-0.5">
              <span className="text-emerald-300 font-semibold block">
                Illustrative Comparison for {comparison.destination.country}:
                {illustrativeDeliveredDifference > 0 && (
                  <span className="ml-1 text-white">
                    Recipient receives approximately +{formatDestinationCurrency(
                      illustrativeDeliveredDifference,
                      comparison.destination.currency,
                      comparison.destination.currencySymbol
                    )} more local value vs traditional SWIFT wire
                  </span>
                )}
              </span>
              <span className="block text-[11px] text-gray-400">
                Traditional retail bank wire charges wire fees and correspondent deductions. SwiftChain executes on-chain via Circle USDC.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium self-start sm:self-auto shrink-0 transition-colors"
          >
            {showConfig ? 'Hide Fee Assumptions ▲' : 'Configure Assumptions & Methodology ▼'}
          </button>
        </div>
      )}

      {/* Expandable Configurable Assumptions Drawer */}
      {showConfig && (
        <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-4 text-xs text-gray-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Transparent Benchmark Configuration</span>
            </h4>
            <button
              type="button"
              onClick={() => setConfig(DEFAULT_COMPARISON_CONFIG)}
              className="text-[11px] text-gray-400 hover:text-white underline"
            >
              Reset to Defaults
            </button>
          </div>

          <p className="text-[11px] text-gray-400">
            Customize the underlying assumptions below to reflect your specific bank or money transfer operator rates.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Bank Wire Fee */}
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
              <label htmlFor="cfg-bank-fee" className="text-[11px] text-gray-400 block">
                Bank Outward Wire Fee (INR):
              </label>
              <input
                id="cfg-bank-fee"
                type="number"
                step="100"
                value={config.bankWireFeeInr ?? 1500}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, bankWireFeeInr: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-2 py-1 text-xs font-mono bg-black/60 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Bank FX Markup */}
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
              <label htmlFor="cfg-bank-fx" className="text-[11px] text-gray-400 block">
                Bank FX Spread Markup (%):
              </label>
              <input
                id="cfg-bank-fx"
                type="number"
                step="0.1"
                value={config.bankFxMarkupPercent ?? 3.0}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, bankFxMarkupPercent: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-2 py-1 text-xs font-mono bg-black/60 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Correspondent Bank Fee */}
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
              <label htmlFor="cfg-intermediary-fee" className="text-[11px] text-gray-400 block">
                Correspondent Deduction (USD):
              </label>
              <input
                id="cfg-intermediary-fee"
                type="number"
                step="1"
                value={config.bankIntermediaryFeeUsd ?? 15.0}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, bankIntermediaryFeeUsd: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-2 py-1 text-xs font-mono bg-black/60 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* MTO Fee */}
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
              <label htmlFor="cfg-mto-fee" className="text-[11px] text-gray-400 block">
                MTO Service Fee (INR):
              </label>
              <input
                id="cfg-mto-fee"
                type="number"
                step="50"
                value={config.mtoServiceFeeInr ?? 400}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, mtoServiceFeeInr: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-2 py-1 text-xs font-mono bg-black/60 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* MTO FX Markup */}
            <div className="p-2.5 bg-black/40 border border-white/5 rounded-lg space-y-1">
              <label htmlFor="cfg-mto-fx" className="text-[11px] text-gray-400 block">
                MTO FX Spread Markup (%):
              </label>
              <input
                id="cfg-mto-fx"
                type="number"
                step="0.1"
                value={config.mtoFxMarkupPercent ?? 2.2}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, mtoFxMarkupPercent: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-2 py-1 text-xs font-mono bg-black/60 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Sourced vs Illustrative Disclosures */}
          <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-gray-400">
            <h5 className="font-semibold text-gray-200">Data Sources & Disclaimers:</h5>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-gray-300">Sourced Data:</strong> USD/INR spot rate is sourced live from CoinGecko ({spotRate.toFixed(2)} INR/USD). Network fee represents live estimated Sepolia ETH gas (~₹{gasInr}).
              </li>
              <li>
                <strong className="text-gray-300">Illustrative Assumptions:</strong> Bank wire and MTO figures represent common retail cross-border fee structures reported by Indian commercial banks and remittance operators. Actual costs vary by institution, relationship tier, and corridor.
              </li>
              <li>
                <strong className="text-amber-300">Testnet Notice:</strong> SwiftChain currently runs on Ethereum Sepolia testnet with simulated destination payouts. Testnet tokens have zero economic value. Production stablecoin remittance would involve regulated fiat on/off-ramp partners whose fees (typically 0.3% – 1.5%) would apply.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
