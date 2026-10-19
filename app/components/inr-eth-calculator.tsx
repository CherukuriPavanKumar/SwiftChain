'use client';

import { useState } from "react";
import { useEthPrice } from "./eth-price-ticker";

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InrEthCalculator() {
  const { data: price, isLoading } = useEthPrice();
  const [mode, setMode] = useState<"inr-to-eth" | "eth-to-inr">("inr-to-eth");
  const [input, setInput] = useState("");

  const inrPerEth = price?.inr ?? null;

  function computeResult(): string {
    const num = parseFloat(input);
    if (!inrPerEth || isNaN(num) || num <= 0) return "—";

    if (mode === "inr-to-eth") {
      const eth = num / inrPerEth;
      if (eth < 0.000001) return "< 0.000001 ETH";
      return `${eth.toFixed(6)} ETH`;
    } else {
      const inr = num * inrPerEth;
      return formatINR(inr);
    }
  }

  const result = computeResult();
  const inputLabel = mode === "inr-to-eth" ? "INR amount" : "ETH amount";
  const outputLabel = mode === "inr-to-eth" ? "You get (approx.)" : "INR equivalent";
  const inputPrefix = mode === "inr-to-eth" ? "₹" : "Ξ";

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Quote Calculator</h3>
        <button
          onClick={() => {
            setMode((m) => (m === "inr-to-eth" ? "eth-to-inr" : "inr-to-eth"));
            setInput("");
          }}
          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
          title="Swap direction"
        >
          ⇄ Swap
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">{inputLabel}</label>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 w-4 text-center">{inputPrefix}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "inr-to-eth" ? "e.g. 10000" : "e.g. 0.05"}
            className="flex-1 bg-transparent border border-white/20 rounded px-3 py-2 text-white text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        <div className="mt-1 text-xs text-gray-500">{outputLabel}</div>
        <div className="text-lg font-bold text-blue-300">
          {isLoading ? (
            <span className="animate-pulse text-gray-500">Loading rate...</span>
          ) : (
            result
          )}
        </div>

        {inrPerEth && (
          <div className="text-xs text-gray-600 mt-1">
            Rate: 1 ETH = {formatINR(inrPerEth)} ·{" "}
            <span className="text-gray-500">Updates every 60s</span>
          </div>
        )}

        {!inrPerEth && !isLoading && (
          <p className="text-xs text-red-400">Price unavailable. Try again shortly.</p>
        )}
      </div>
    </div>
  );
}
