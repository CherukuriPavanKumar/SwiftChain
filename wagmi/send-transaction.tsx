'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { formatEther, isAddress, parseEther } from 'viem'
import { sepolia } from 'wagmi/chains'
import {
  useConnection,
  useEstimateGas,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { useEthPrice } from '@/app/components/eth-price-ticker'
import type { Transfer } from '../types/transfer'

export function SendTransaction() {
  const queryClient = useQueryClient()
  const { address, chainId } = useConnection()
  const { data: hash, error, isPending, sendTransactionAsync } = useSendTransaction()
  const { data: ethPrice } = useEthPrice()

  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [validationError, setValidationError] = useState<string>()
  const [transfer, setTransfer] = useState<Transfer>()

  const validRecipient = isAddress(recipient) ? recipient : undefined
  let estimatedValue: bigint | undefined
  try {
    estimatedValue = amount ? parseEther(amount) : undefined
  } catch {
    estimatedValue = undefined
  }

  const canEstimateGas = Boolean(
    address &&
      chainId === sepolia.id &&
      validRecipient &&
      estimatedValue !== undefined &&
      estimatedValue > BigInt(0),
  )

  const {
    data: gasEstimate,
    error: gasEstimateError,
    isLoading: isEstimatingGas,
  } = useEstimateGas({
    account: address,
    chainId: sepolia.id,
    to: validRecipient,
    value: estimatedValue,
    query: { enabled: canEstimateGas },
  })

  const {
    data: receipt,
    error: receiptError,
    isLoading: isConfirming,
  } = useWaitForTransactionReceipt({ hash })

  // Real-time INR conversion
  const parsedAmount = parseFloat(amount)
  const inrEstimate =
    !isNaN(parsedAmount) && parsedAmount > 0 && ethPrice?.inr
      ? parsedAmount * ethPrice.inr
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
        }),
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch((err) => console.error('Failed to update confirmed status:', err))
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
  }, [receipt, hash, queryClient])

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

    let value: bigint
    try {
      value = parseEther(amount)
    } catch {
      setValidationError('Enter a valid ETH amount.')
      return
    }

    if (value <= BigInt(0)) {
      setValidationError('The amount must be greater than zero.')
      return
    }

    const to = recipient as `0x${string}`
    setTransfer({
      id: crypto.randomUUID(),
      senderAddress: address,
      recipientAddress: to,
      amount,
      chainId: String(chainId),
      assetSymbol: 'ETH',
      status: 'awaiting signature',
      createdAt: Date.now(),
    })

    try {
      const txHash = await sendTransactionAsync({ to, value })

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
          assetSymbol: 'ETH',
          status: 'pending',
          transactionHash: txHash,
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
    <div className="mt-3 space-y-3">
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

        {/* Amount Input with Live INR Calculation */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1">
            <label htmlFor="send-amount">Amount (ETH)</label>
            {ethPrice?.inr && (
              <span className="text-[11px] text-gray-400">
                1 ETH ≈ ₹{ethPrice.inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              id="send-amount"
              name="value"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.001"
              inputMode="decimal"
              required
              className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors pr-16"
            />
            <span className="absolute right-3 top-2 text-xs font-semibold text-gray-400 pointer-events-none">
              ETH
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
              <span>Quick select:</span>
              {['0.001', '0.005', '0.01'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          disabled={isPending || isConfirming}
          type="submit"
          className="w-full py-2 px-3 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
        >
          {isPending
            ? 'Awaiting Wallet Approval...'
            : isConfirming
              ? 'Confirming On-Chain...'
              : 'Send Sepolia ETH'}
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

      {/* Transaction status cards */}
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
            <div className="pt-1 border-t border-white/5">
              <a
                href={`https://sepolia.etherscan.io/tx/${displayTransfer.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 underline font-mono text-[11px] break-all block"
              >
                View on Sepolia Etherscan ↗
              </a>
            </div>
          )}
        </div>
      )}

      {gasFee && <div className="text-[11px] text-gray-400">Actual Gas Fee: {gasFee}</div>}
      {receiptError && <p className="text-xs text-rose-400" role="alert">Receipt error: {receiptError.message}</p>}
      {error && <p className="text-xs text-rose-400" role="alert">Submission error: {error.message}</p>}
    </div>
  )
}
