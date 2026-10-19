'use client'

import { useConnect, useConnectors } from 'wagmi'

export function WalletOptions() {
  const { connect, error, isPending } = useConnect()
  const connectors = useConnectors()

  if (connectors.length === 0) {
    return (
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
        No Web3 wallet detected. Please install MetaMask or another browser wallet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-2">Connect your wallet to begin:</p>
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            type="button"
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full py-2 px-3 text-xs font-medium bg-white/10 hover:bg-white/20 active:scale-[0.99] border border-white/15 rounded-lg text-white transition-all flex items-center justify-between disabled:opacity-50"
          >
            <span>{connector.name}</span>
            <span className="text-[11px] text-gray-400">
              {isPending ? 'Connecting...' : 'Connect →'}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}