'use client'

import { ConnectWallet } from "@/wagmi/web_provider"
import TransferHistory from "./transfer-history"
import EthPriceTicker from "./components/eth-price-ticker"
import InrEthCalculator from "./components/inr-eth-calculator"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100" style={{ padding: '2rem' }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-white">SwiftChain</h1>
        <p className="text-xs text-gray-500 mb-4">
          Testnet prototype · Sepolia ETH only · No real funds
        </p>

        {/* Live price ticker */}
        <EthPriceTicker />

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quote calculator */}
          <InrEthCalculator />

          {/* Wallet connection + send form */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3">Wallet & Transfer</h3>
            <ConnectWallet />
          </div>
        </div>

        {/* Transfer history */}
        <TransferHistory />
      </div>
    </main>
  )
}
