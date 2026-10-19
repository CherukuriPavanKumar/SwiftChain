'use client';

import { ConnectWallet } from "@/wagmi/web_provider";
import TransferHistory from "./transfer-history";
import EthPriceTicker from "./components/eth-price-ticker";
import InrEthCalculator from "./components/inr-eth-calculator";
import SavingsComparison from "./components/savings-comparison";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-8">
      {/* Container */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">SwiftChain</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">
              V2 Prototype
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Web3 Cross-Border Remittance Prototype · Ethereum Sepolia (Circle USDC & Native ETH) · Testnet Demo Only
          </p>
        </div>

        {/* Live price ticker */}
        <EthPriceTicker />

        {/* Main interactive grid: Calculator & Wallet send form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* Quote calculator & Unified remittance flow */}
          <InrEthCalculator />

          {/* Wallet connection + Direct send form */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
              <span>Wallet & Direct Transfer</span>
              <span className="text-[10px] text-gray-400 font-normal">MetaMask (Sepolia)</span>
            </h3>
            <ConnectWallet />
          </div>
        </div>

        {/* Remittance Savings & Speed Comparison Calculator */}
        <SavingsComparison />

        {/* Persistent Transfer History with Live Settlement Tracker */}
        <TransferHistory />
      </div>
    </main>
  );
}
