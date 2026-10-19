'use client'

import { useConnection, useDisconnect, useEnsAvatar, useEnsName, useSwitchChain } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import Image from 'next/image'
import { useEthPrice } from '@/app/components/eth-price-ticker'
import { useTokenBalances } from '@/hooks/use-token-balances'
import { SUPPORTED_TOKENS } from '@/lib/tokens'
import { SendTransaction } from './send-transaction'

export function Connection() {
  const { address, chainId } = useConnection()
  const { disconnect } = useDisconnect()
  const { switchChain, error: switchError, isPending: isSwitchPending } = useSwitchChain()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })
  const isSepolia = chainId === sepolia.id
  const { data: ethPrice } = useEthPrice()

  const { ethFormatted, isEthLoading, usdcFormatted, isUsdcLoading } = useTokenBalances()

  const numericEth = parseFloat(ethFormatted)
  const ethBalanceInr =
    ethPrice?.inr && !isNaN(numericEth) && numericEth > 0
      ? numericEth * ethPrice.inr
      : null

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <div className="space-y-4">
      {/* Wallet info card */}
      <div className="p-3 bg-black/30 rounded-lg border border-white/5 space-y-3">
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
                {isSepolia ? 'Ethereum Sepolia (Testnet)' : `Chain ID: ${chainId ?? 'Unknown'}`}
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

        {/* Multi-Asset Balances Grid */}
        <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
          {/* Sepolia ETH Balance */}
          <div className="p-2 rounded bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 text-[10px] mb-0.5">
              <span>Native ETH (Gas)</span>
              <span>Ξ</span>
            </div>
            <div className="font-mono font-semibold text-white text-xs">
              {isEthLoading ? <span className="animate-pulse text-gray-500">...</span> : `${ethFormatted} ETH`}
            </div>
            {ethBalanceInr !== null && (
              <div className="text-[10px] text-gray-500">
                ≈ ₹{ethBalanceInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>

          {/* Circle USDC Balance */}
          <div className="p-2 rounded bg-white/5 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 text-[10px] mb-0.5">
              <span>Circle USDC</span>
              <span className="text-blue-400 font-bold">$</span>
            </div>
            <div className="font-mono font-semibold text-emerald-400 text-xs">
              {isUsdcLoading ? <span className="animate-pulse text-gray-500">...</span> : `${parseFloat(usdcFormatted).toFixed(2)} USDC`}
            </div>
            <div className="text-[10px] text-gray-500">
              6 Decimals · ERC-20
            </div>
          </div>
        </div>

        {/* Circle Faucet Quick-link */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
          <span>Need testnet tokens?</span>
          <a
            href={SUPPORTED_TOKENS.USDC.faucetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Circle Faucet ↗
          </a>
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

      {/* Direct Send Transaction Section */}
      {isSepolia && (
        <div className="pt-2 border-t border-white/10">
          <h4 className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
            <span>Direct Transfer (USDC / ETH)</span>
            <span className="text-[10px] text-emerald-400 font-normal">Ready</span>
          </h4>
          <SendTransaction />
        </div>
      )}
    </div>
  )
}