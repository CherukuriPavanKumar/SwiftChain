'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { formatEther, isAddress, parseEther, parseUnits } from 'viem'
import { sepolia } from 'wagmi/chains'
import {
  useConnection,
  useEstimateGas,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { useEthPrice } from '@/app/components/eth-price-ticker'
import { useTokenBalances } from '@/hooks/use-token-balances'
import { SUPPORTED_TOKENS, ERC20_MINIMAL_ABI, type SupportedAssetSymbol } from '@/lib/tokens'
import SettlementTrackerModal from '@/app/components/settlement-tracker-modal'
import type { Transfer } from '../types/transfer'

export function SendTransaction() {
  const queryClient = useQueryClient()
  const { address, chainId } = useConnection()
  const { data: marketData } = useEthPrice()
  const { ethRaw, usdcRaw, ethFormatted, usdcFormatted, refetchAll } = useTokenBalances()

  // Selected Asset: USDC or ETH
  const [selectedAsset, setSelectedAsset] = useState<SupportedAssetSymbol>('USDC')

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState<string>()
  const [transfer, setTransfer] = useState<Transfer>()
  const [isTrackerOpen, setIsTrackerOpen] = useState(false)

  // Native ETH Send Hook
  const {
    data: ethHash,
    error: ethError,
    isPending: isEthPending,
    sendTransactionAsync,
  } = useSendTransaction()

  // Circle USDC (ERC-20) Write Hook
  const {
    data: erc20Hash,
    error: erc20Error,
    isPending: isErc20Pending,
    writeContractAsync,
  } = useWriteContract()

  const isPending = selectedAsset === 'ETH' ? isEthPending : isErc20Pending
  const error = selectedAsset === 'ETH' ? ethError : erc20Error
  const hash = selectedAsset === 'ETH' ? ethHash : erc20Hash

  const validRecipient = isAddress(recipient) ? recipient : undefined

  // Native ETH Gas estimation
  let estimatedEthValue: bigint | undefined
  try {
    estimatedEthValue = amount && selectedAsset === 'ETH' ? parseEther(amount) : undefined
  } catch {
    estimatedEthValue = undefined
  }

  const canEstimateGas = Boolean(
    address &&
      chainId === sepolia.id &&
      validRecipient &&
      selectedAsset === 'ETH' &&
      estimatedEthValue !== undefined &&
      estimatedEthValue > BigInt(0),
  )

  const {
    data: gasEstimate,
    error: gasEstimateError,
    isLoading: isEstimatingGas,
  } = useEstimateGas({
    account: address,
    chainId: sepolia.id,
    to: validRecipient,
    value: estimatedEthValue,
    query: { enabled: canEstimateGas },
  })

  const {
    data: receipt,
    error: receiptError,
    isLoading: isConfirming,
  } = useWaitForTransactionReceipt({ hash })

  // Real-time INR conversion
  const parsedAmount = parseFloat(amount)
  const tokenRateInr =
    selectedAsset === 'USDC'
      ? (marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88)
      : (marketData?.inr ?? 230000)

  const inrEstimate =
    !isNaN(parsedAmount) && parsedAmount > 0 && tokenRateInr
      ? parsedAmount * tokenRateInr
      : null

  useEffect(() => {
    if (receipt?.status === 'success' && hash) {
      fetch('/api/transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionHash: hash,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          isSimulatedPayout: true,
          payoutStatus: 'simulated_completed',
          payoutCompletedAt: new Date().toISOString(),
        }),
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch((err) => console.error('Failed to update confirmed status:', err))

      refetchAll().catch(console.error)
    } else if (receipt?.status === 'reverted' && hash) {
      fetch('/api/transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionHash: hash,
          status: 'failed',
        }),
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch((err) => console.error('Failed to update failed status:', err))
    }
  }, [receipt, hash, queryClient, refetchAll])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError(undefined)

    if (!address) {
      setValidationError('Connect a wallet before sending a transaction.')
      return
    }

    if (!isAddress(recipient)) {
      setValidationError('Enter a valid recipient address (0x...).')
      return
    }

    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setValidationError('Enter a valid amount greater than zero.')
      return
    }

    // Check balances
    if (selectedAsset === 'USDC') {
      const units = parseUnits(amount, SUPPORTED_TOKENS.USDC.decimals)
      if (usdcRaw < units) {
        setValidationError(`Insufficient USDC balance. You have ${usdcFormatted} USDC.`)
        return
      }
      if (ethRaw <= BigInt(0)) {
        setValidationError('Insufficient Sepolia ETH for gas. Gas fees must be paid in Sepolia ETH.')
        return
      }
    } else {
      const units = parseEther(amount)
      if (ethRaw < units) {
        setValidationError(`Insufficient ETH balance. You have ${ethFormatted} ETH.`)
        return
      }
    }

    const to = recipient as `0x${string}`
    setTransfer({
      id: crypto.randomUUID(),
      senderAddress: address,
      recipientAddress: to,
      amount,
      chainId: String(chainId),
      assetSymbol: selectedAsset,
      status: 'awaiting signature',
      createdAt: Date.now(),
    })

    try {
      let txHash: `0x${string}`

      if (selectedAsset === 'ETH') {
        const value = parseEther(amount)
        txHash = await sendTransactionAsync({ to, value })
      } else {
        const units = parseUnits(amount, SUPPORTED_TOKENS.USDC.decimals)
        const usdcAddress = SUPPORTED_TOKENS.USDC.contractAddress!
        txHash = await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_MINIMAL_ABI,
          functionName: 'transfer',
          args: [to, units],
        })
      }

      await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderAddress: address,
          recipientAddress: to,
          amount,
          chainId: Number(chainId),
          assetSymbol: selectedAsset,
          tokenAddress: selectedAsset === 'USDC' ? SUPPORTED_TOKENS.USDC.contractAddress : null,
          inrSourceAmount: inrEstimate ? inrEstimate.toFixed(2) : null,
          referenceRate: tokenRateInr.toString(),
          estimatedDestinationUsd: selectedAsset === 'USDC' ? num.toFixed(2) : (num * (marketData?.usd ?? 2400)).toFixed(2),
          status: 'pending',
          transactionHash: txHash,
          isSimulatedPayout: true,
          payoutStatus: 'pending',
        }),
      })

      await queryClient.invalidateQueries({ queryKey: ['transfers'] })
    } catch (err: unknown) {
      console.error('Transaction or database recording failed:', err)
    }
  }

  if (!address) {
    return (
      <p className="text-xs text-gray-400">
        Connect a wallet before sending a transaction.
      </p>
    )
  }

  if (chainId !== sepolia.id) {
    return (
      <p className="text-xs text-amber-400">
        Switch to Ethereum Sepolia to send testnet transfers.
      </p>
    )
  }

  const gasFee = receipt
    ? `${formatEther(receipt.gasUsed * receipt.effectiveGasPrice)} ETH`
    : undefined

  const transferStatus: Transfer['status'] = error || receiptError
    ? 'failed'
    : receipt?.status === 'success'
      ? 'confirmed'
      : receipt?.status === 'reverted'
        ? 'failed'
        : hash
          ? 'pending'
          : transfer?.status ?? 'awaiting signature'

  const displayTransfer = transfer
    ? {
        ...transfer,
        status: transferStatus,
        transactionHash: hash ?? transfer.transactionHash,
      }
    : undefined

  return (
    <div className="mt-2 space-y-3">
      {/* Asset Selector Tabs */}
      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
        {(['USDC', 'ETH'] as SupportedAssetSymbol[]).map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => {
              setSelectedAsset(symbol)
              setAmount('')
            }}
            className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
              selectedAsset === symbol
                ? symbol === 'USDC'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="font-bold">{symbol === 'USDC' ? '$' : 'Ξ'}</span>
            <span>{symbol === 'USDC' ? 'Circle USDC' : 'Native ETH'}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {/* Recipient Input */}
        <div>
          <label htmlFor="recipient-address" className="block text-xs font-medium text-gray-400 mb-1">
            Recipient Address
          </label>
          <input
            id="recipient-address"
            name="address"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="0xRecipientAddress..."
            required
            className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1">
            <label htmlFor="send-amount">Amount ({selectedAsset})</label>
            <span className="text-[11px] text-gray-400 font-mono">
              1 {selectedAsset} ≈ ₹{tokenRateInr.toLocaleString('en-IN', { maximumFractionDigits: selectedAsset === 'USDC' ? 2 : 0 })}
            </span>
          </div>
          <div className="relative">
            <input
              id="send-amount"
              name="value"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={selectedAsset === 'USDC' ? '10.00' : '0.005'}
              inputMode="decimal"
              required
              className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors pr-16"
            />
            <span className="absolute right-3 top-2 text-xs font-semibold text-gray-400 pointer-events-none">
              {selectedAsset}
            </span>
          </div>

          {/* Live INR conversion feedback */}
          {inrEstimate !== null ? (
            <div className="mt-1.5 flex items-center justify-between text-xs px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
              <span>Estimated Value (INR):</span>
              <span className="font-semibold">
                ₹{inrEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
              <span>Presets:</span>
              {(selectedAsset === 'USDC' ? ['5', '10', '25', '50'] : ['0.001', '0.005', '0.01']).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  {preset} {selectedAsset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          disabled={isPending || isConfirming}
          type="submit"
          className={`w-full py-2 px-3 text-xs font-medium text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedAsset === 'USDC'
              ? 'bg-blue-600 hover:bg-blue-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {isPending
            ? 'Awaiting MetaMask Approval...'
            : isConfirming
              ? 'Confirming On-Chain...'
              : `Send Sepolia ${selectedAsset}`}
        </button>
      </form>

      {/* Validation & Gas messages */}
      {validationError && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded" role="alert">
          {validationError}
        </p>
      )}

      {isEstimatingGas && (
        <div className="text-[11px] text-gray-400">Estimating gas...</div>
      )}

      {gasEstimate !== undefined && (
        <div className="text-[11px] text-gray-400">
          Estimated gas: <span className="font-mono text-gray-300">{gasEstimate.toString()}</span> units
        </div>
      )}

      {gasEstimateError && (
        <p className="text-xs text-amber-400" role="alert">
          Gas estimation error: {gasEstimateError.message}
        </p>
      )}

      {/* Transaction status card */}
      {displayTransfer && (
        <div className="p-2.5 rounded-lg bg-black/30 border border-white/10 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Status:</span>
            <span className={`font-medium uppercase text-[10px] px-1.5 py-0.5 rounded ${
              displayTransfer.status === 'confirmed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : displayTransfer.status === 'failed'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {displayTransfer.status}
            </span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span className="text-gray-400">Amount:</span>
            <span className="font-mono">{displayTransfer.amount} {displayTransfer.assetSymbol}</span>
          </div>
          {displayTransfer.transactionHash && (
            <div className="pt-1 border-t border-white/5 space-y-2">
              <a
                href={`https://sepolia.etherscan.io/tx/${displayTransfer.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline font-mono text-[11px] break-all block"
              >
                View on Sepolia Etherscan ↗
              </a>
              <button
                type="button"
                onClick={() => setIsTrackerOpen(true)}
                className="w-full py-1.5 px-2.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>📡</span>
                <span>Open Live Settlement Tracker ↗</span>
              </button>
            </div>
          )}
        </div>
      )}

      {gasFee && <div className="text-[11px] text-gray-400">Actual Gas Fee: {gasFee}</div>}
      {receiptError && <p className="text-xs text-rose-400" role="alert">Receipt error: {receiptError.message}</p>}
      {error && <p className="text-xs text-rose-400" role="alert">Submission error: {error.message}</p>}

      {/* Live Settlement Tracker Modal */}
      <SettlementTrackerModal
        transfer={
          displayTransfer
            ? {
                senderAddress: displayTransfer.senderAddress,
                recipientAddress: displayTransfer.recipientAddress,
                amount: displayTransfer.amount,
                assetSymbol: displayTransfer.assetSymbol,
                chainId: Number(displayTransfer.chainId),
                inrSourceAmount: inrEstimate ? inrEstimate.toFixed(2) : null,
                referenceRate: tokenRateInr.toString(),
                estimatedDestinationUsd:
                  selectedAsset === 'USDC'
                    ? parsedAmount.toFixed(2)
                    : (parsedAmount * (marketData?.usd ?? 2400)).toFixed(2),
                networkFeeEth: gasFee,
                status: displayTransfer.status,
                transactionHash: displayTransfer.transactionHash ?? null,
                isSimulatedPayout: true,
                payoutStatus:
                  displayTransfer.status === 'confirmed'
                    ? 'simulated_completed'
                    : displayTransfer.status === 'failed'
                      ? 'failed'
                      : 'pending',
                createdAt: displayTransfer.createdAt,
                confirmedAt: displayTransfer.status === 'confirmed' ? new Date().toISOString() : null,
              }
            : null
        }
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />
    </div>
  )
}
