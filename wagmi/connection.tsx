'use client'

import { useConnection, useDisconnect, useEnsAvatar, useEnsName, useSwitchChain, useBalance } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { formatUnits } from 'viem'
import Image from 'next/image'
import { useEthPrice } from '@/app/components/eth-price-ticker'
import { SendTransaction } from './send-transaction'

export function Connection() {
  const { address, chainId } = useConnection()
  const { disconnect } = useDisconnect()
  const { switchChain, error: switchError, isPending: isSwitchPending } = useSwitchChain()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })
  const isSepolia = chainId === sepolia.id
  const { data: ethPrice } = useEthPrice()

  const { data: balance, isPending: isBalancePending, error: balanceError } = useBalance({ address, chainId })

  const formattedBalance = balance ? formatUnits(balance.value, balance.decimals) : null
  const numericBalance = formattedBalance ? parseFloat(formattedBalance) : 0
  const balanceInr =
    ethPrice?.inr && !isNaN(numericBalance) && numericBalance > 0
      ? numericBalance * ethPrice.inr
      : null

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <div className="space-y-4">
      {/* Wallet info card */}
      <div className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ensAvatar ? (
              <Image alt="ENS Avatar" src={ensAvatar} width={28} height={28} className="rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-xs">
                Ξ
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono font-medium text-white">{ensName || shortAddress}</span>
              </div>
              <div className="text-[10px] text-gray-400">
                {isSepolia ? 'Ethereum Sepolia' : `Chain ID: ${chainId ?? 'Unknown'}`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => disconnect()}
            className="text-[11px] px-2.5 py-1 rounded bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-gray-400 border border-white/10 hover:border-rose-500/30 transition-all"
          >
            Disconnect
          </button>
        </div>

        {/* Balance Display with INR conversion */}
        <div className="pt-2 border-t border-white/5 flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Balance:</span>
          <div className="text-right">
            {isBalancePending ? (
              <span className="text-xs text-gray-400">Loading...</span>
            ) : balanceError ? (
              <span className="text-xs text-rose-400">Error loading balance</span>
            ) : balance ? (
              <div>
                <span className="text-xs font-mono font-semibold text-white">
                  {parseFloat(formattedBalance!).toFixed(4)} {balance.symbol}
                </span>
                {balanceInr !== null && (
                  <span className="block text-[11px] text-gray-400">
                    ≈ ₹{balanceInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Network switch banner if not on Sepolia */}
      {!isSepolia && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2">
          <p className="text-amber-300" role="alert">
            Your wallet is connected to an unsupported network. Please switch to Sepolia.
          </p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitchPending}
            className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded transition-colors text-xs"
          >
            {isSwitchPending ? 'Switching Network...' : 'Switch to Sepolia'}
          </button>
          {switchError && <p className="text-rose-400 text-[11px]" role="alert">{switchError.message}</p>}
        </div>
      )}

      {/* Send Transaction Section */}
      {isSepolia && (
        <div className="pt-2 border-t border-white/10">
          <h4 className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
            <span>Send Sepolia ETH</span>
            <span className="text-[10px] text-emerald-400 font-normal">Ready</span>
          </h4>
          <SendTransaction />
        </div>
      )}
    </div>
  )
}