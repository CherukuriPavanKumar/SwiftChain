'use client';

import { useState, useMemo } from "react";
import { isAddress, parseUnits } from "viem";
import { sepolia } from "wagmi/chains";
import { useConnection, useGasPrice, useEstimateGas } from "wagmi";
import { useEthPrice } from "./eth-price-ticker";
import {
  calculateRemittanceQuote,
  formatINR,
  formatUSD,
  formatTokenAmount,
  DEFAULT_ETH_TRANSFER_GAS_UNITS,
  DEFAULT_ERC20_TRANSFER_GAS_UNITS,
} from "@/lib/quote";
import { SUPPORTED_TOKENS, type SupportedAssetSymbol } from "@/lib/tokens";
import TransferReviewModal from "./transfer-review-modal";

export default function InrEthCalculator() {
  const { data: marketData, isLoading, refetch } = useEthPrice();
  const { address } = useConnection();
  const { data: gasPrice } = useGasPrice({ chainId: sepolia.id });

  // Mode: "remittance" (Quote & Send flow) vs "converter" (Simple check)
  const [activeTab, setActiveTab] = useState<"remittance" | "converter">("remittance");

  // Selected Asset: ETH or USDC
  const [selectedAsset, setSelectedAsset] = useState<SupportedAssetSymbol>("USDC");

  // Remittance inputs
  const [inrAmount, setInrAmount] = useState<string>("5000");
  const [recipient, setRecipient] = useState<string>("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Simple converter state
  const [converterMode, setConverterMode] = useState<"inr-to-crypto" | "crypto-to-inr">("inr-to-crypto");
  const [converterInput, setConverterInput] = useState<string>("");

  // Validate inputs
  const parsedInr = parseFloat(inrAmount);
  const isValidAmount = !isNaN(parsedInr) && parsedInr > 0;
  const isValidRecipient = recipient ? isAddress(recipient) : false;

  // Gas estimation if recipient is valid
  const validTo = isValidRecipient ? (recipient as `0x${string}`) : undefined;
  let estimatedValue: bigint | undefined;
  try {
    if (marketData && isValidAmount) {
      const tokenPrice =
        selectedAsset === "USDC"
          ? (marketData.usdc?.inr ?? marketData.fiatReference?.inrPerUsd ?? 94.88)
          : marketData.inr;
      const tokenRough = (parsedInr / tokenPrice).toFixed(6);
      estimatedValue = parseUnits(tokenRough, SUPPORTED_TOKENS[selectedAsset].decimals);
    }
  } catch {
    estimatedValue = undefined;
  }

  // Estimate native transfer gas when ETH, or fallback to ERC-20 gas buffer when USDC
  const { data: estimatedGas } = useEstimateGas({
    account: address,
    chainId: sepolia.id,
    to: selectedAsset === "ETH" ? validTo : undefined,
    value: selectedAsset === "ETH" ? estimatedValue : undefined,
    query: {
      enabled: Boolean(selectedAsset === "ETH" && address && validTo && estimatedValue && estimatedValue > BigInt(0)),
    },
  });

  const effectiveGas =
    selectedAsset === "USDC"
      ? DEFAULT_ERC20_TRANSFER_GAS_UNITS
      : (estimatedGas ?? DEFAULT_ETH_TRANSFER_GAS_UNITS);

  // Calculate live multi-asset remittance quote
  const quote = useMemo(() => {
    if (!marketData || !isValidAmount) return null;

    return calculateRemittanceQuote({
      sourceAmountInr: parsedInr,
      assetSymbol: selectedAsset,
      marketData: marketData,
      gasUnits: effectiveGas,
      gasPriceWei: gasPrice ?? BigInt(1500000000),
    });
  }, [marketData, parsedInr, isValidAmount, selectedAsset, effectiveGas, gasPrice]);

  // Converter calculation
  function computeConverterResult(): string {
    const num = parseFloat(converterInput);
    if (!marketData || isNaN(num) || num <= 0) return "—";

    const targetPrice =
      selectedAsset === "USDC"
        ? (marketData.usdc?.inr ?? marketData.fiatReference?.inrPerUsd ?? 94.88)
        : marketData.inr;

    if (converterMode === "inr-to-crypto") {
      const tokens = num / targetPrice;
      return `${tokens.toFixed(selectedAsset === "USDC" ? 2 : 6)} ${selectedAsset}`;
    } else {
      const inr = num * targetPrice;
      return formatINR(inr);
    }
  }

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
      <div>
        {/* Tab switch & Asset Selector header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab("remittance")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === "remittance"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Remittance Quote
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("converter")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === "converter"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Quick Converter
            </button>
          </div>

          {/* Asset Selector Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
            {(["USDC", "ETH"] as SupportedAssetSymbol[]).map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => setSelectedAsset(symbol)}
                className={`text-xs px-2 py-0.5 rounded font-mono font-medium transition-colors flex items-center gap-1 ${
                  selectedAsset === symbol
                    ? symbol === "USDC"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span>{symbol === "USDC" ? "$" : "Ξ"}</span>
                <span>{symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Remittance Mode */}
        {activeTab === "remittance" ? (
          <div className="space-y-3">
            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <label htmlFor="remittance-inr">Transfer Amount (INR)</label>
                {quote && (
                  <span className="text-gray-500 text-[11px]">
                    ≈ {formatUSD(quote.estimatedUsdEquivalent)} USD
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-semibold text-gray-400 pointer-events-none">
                  ₹
                </span>
                <input
                  id="remittance-inr"
                  type="number"
                  min="1"
                  step="any"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full pl-7 pr-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="text-[10px]">Presets:</span>
                {["1000", "5000", "10000", "25000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInrAmount(preset)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                  >
                    ₹{parseInt(preset).toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Address input */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <label htmlFor="remittance-recipient">Recipient Address (Ethereum Sepolia)</label>
                {recipient && (
                  <span className={`text-[10px] ${isValidRecipient ? "text-emerald-400" : "text-rose-400"}`}>
                    {isValidRecipient ? "Valid EVM Address ✓" : "Invalid Address ✗"}
                  </span>
                )}
              </div>
              <input
                id="remittance-recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                placeholder="0xRecipientAddress..."
                className={`w-full px-3 py-2 text-xs font-mono bg-black/40 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors ${
                  recipient && !isValidRecipient
                    ? "border-rose-500/50 focus:ring-1 focus:ring-rose-500"
                    : "border-white/10 focus:ring-1 focus:ring-emerald-500"
                }`}
              />
            </div>

            {/* Live Quote Breakdown Card */}
            {quote && (
              <div className="p-3 bg-black/40 border border-white/5 rounded-lg space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Recipient Receives:</span>
                  <span className={`font-mono font-bold text-sm ${selectedAsset === "USDC" ? "text-blue-400" : "text-emerald-400"}`}>
                    {formatTokenAmount(quote.destinationCryptoAmount, quote.assetSymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span title="Spot rate locked for 60 seconds">Quote Rate (60s spot):</span>
                  <span className="font-mono text-gray-300">
                    1 {quote.assetSymbol} = {formatINR(quote.marketPriceInr)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span>Est. Network Fee (Gas):</span>
                  <span>~{quote.fees.estimatedNetworkFeeEth.slice(0, 8)} ETH ({formatINR(quote.fees.estimatedNetworkFeeInr)})</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-400">
                  <span>Platform Fee:</span>
                  <span className="text-emerald-400">₹0.00 (0% Promo)</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Simple Converter Mode */
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">
                {converterMode === "inr-to-crypto" ? `INR Amount` : `${selectedAsset} Amount`}
              </label>
              <button
                type="button"
                onClick={() => {
                  setConverterMode((m) => (m === "inr-to-crypto" ? "crypto-to-inr" : "inr-to-crypto"));
                  setConverterInput("");
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline"
              >
                ⇄ Switch Direction
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-4 text-center font-semibold">
                {converterMode === "inr-to-crypto" ? "₹" : selectedAsset === "USDC" ? "$" : "Ξ"}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={converterInput}
                onChange={(e) => setConverterInput(e.target.value)}
                placeholder={converterMode === "inr-to-crypto" ? "e.g. 10000" : "e.g. 100"}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div className="mt-1 text-xs text-gray-400">Result:</div>
            <div className="text-base font-bold text-white font-mono">
              {isLoading ? <span className="animate-pulse text-gray-500">Loading rate...</span> : computeConverterResult()}
            </div>
          </div>
        )}
      </div>

      {/* Review Button */}
      {activeTab === "remittance" && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            disabled={!quote || !isValidRecipient}
            className={`w-full py-2.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shadow-sm ${
              selectedAsset === "USDC"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {!isValidAmount
              ? "Enter valid amount"
              : !isValidRecipient
                ? "Enter recipient address"
                : `Review ${selectedAsset} Remittance Transfer →`}
          </button>
        </div>
      )}

      {/* Review Modal */}
      {quote && (
        <TransferReviewModal
          quote={quote}
          recipientAddress={recipient}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          onRefreshQuote={() => refetch()}
        />
      )}
    </div>
  );
}
