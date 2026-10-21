'use client';

import { useState, useEffect } from "react";
import { encodeFunctionData, formatEther, isAddress } from "viem";
import { sepolia } from "wagmi/chains";
import { getSepoliaGasAndFees, pollReceiptAndConfirm } from "@/lib/tx-helper";
import {
  useConnection,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { RemittanceQuote } from "@/types/quote";
import { formatINR, formatUSD, formatTokenAmount } from "@/lib/quote";
import { useTokenBalances } from "@/hooks/use-token-balances";
import { ERC20_MINIMAL_ABI, SUPPORTED_TOKENS } from "@/lib/tokens";
import SettlementTrackerModal from "./settlement-tracker-modal";
import { createTransfer, updateTransfer } from "@/lib/transfer-client";

interface TransferReviewModalProps {
  quote: RemittanceQuote;
  recipientAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onRefreshQuote: () => void;
}

export default function TransferReviewModal({
  quote,
  recipientAddress,
  isOpen,
  onClose,
  onRefreshQuote,
}: TransferReviewModalProps) {
  const queryClient = useQueryClient();
  const { address, chainId } = useConnection();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const isSepolia = chainId === sepolia.id;

  const { ethRaw, ethFormatted, usdcRaw, usdcFormatted, refetchAll } = useTokenBalances();

  // For native ETH
  const {
    data: ethTxHash,
    error: ethSendError,
    isPending: isEthSending,
    sendTransactionAsync,
  } = useSendTransaction();

  // For Circle USDC (ERC-20 transfer)
  const {
    data: erc20TxHash,
    error: erc20SendError,
    isPending: isErc20Sending,
    writeContractAsync,
  } = useWriteContract();

  const activeTxHash = quote.isNative ? ethTxHash : erc20TxHash;
  const isSending = quote.isNative ? isEthSending : isErc20Sending;
  const sendError = quote.isNative ? ethSendError : erc20SendError;

  const {
    data: receipt,
    isLoading: isConfirming,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: activeTxHash });

  const [timeLeft, setTimeLeft] = useState<number>(() =>
    Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000))
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoggedPending, setHasLoggedPending] = useState(false);
  const [simulatedPayoutComplete, setSimulatedPayoutComplete] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // Quote countdown
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [quote.expiresAt, isOpen]);

  const isQuoteExpired = timeLeft <= 0;

  // Gas balance check (always paid in Sepolia ETH)
  const estimatedGasWei = quote.fees.estimatedGasUnits * quote.fees.estimatedGasPriceWei;
  const hasInsufficientGas = address ? ethRaw < estimatedGasWei : false;

  // Token balance check
  const requiredTokenUnits = quote.destinationCryptoUnits;
  const hasInsufficientToken = address
    ? quote.isNative
      ? ethRaw < (requiredTokenUnits + estimatedGasWei)
      : usdcRaw < requiredTokenUnits
    : false;

  useEffect(() => {
    if (receipt?.status === 'success' && activeTxHash) {
      // 1. Mark transfer confirmed in Neon Postgres
      updateTransfer({
        transactionHash: activeTxHash,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        isSimulatedPayout: true,
        payoutStatus: 'simulated_pending',
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch((err) => console.error('Failed to update transfer confirmed status:', err));

      refetchAll().catch(console.error);

      // 2. Deterministic simulated payout window (3 seconds delay to mimic local settlement)
      const timer = setTimeout(() => {
        setSimulatedPayoutComplete(true);
        updateTransfer({
          transactionHash: activeTxHash,
          payoutStatus: 'simulated_completed',
          payoutCompletedAt: new Date().toISOString(),
        })
          .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
          .catch((err) => console.error('Failed to update simulated payout status:', err));
      }, 3000);

      return () => clearTimeout(timer);
    } else if (receipt?.status === 'reverted' && activeTxHash) {
      updateTransfer({
        transactionHash: activeTxHash,
        status: 'failed',
        payoutStatus: 'failed',
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch((err) => console.error('Failed to update transfer failed status:', err));
    }
  }, [receipt, activeTxHash, queryClient, refetchAll]);

  if (!isOpen) return null;

  async function handleConfirmTransfer() {
    setErrorMessage(null);

    if (!address) {
      setErrorMessage("Please connect your wallet before proceeding.");
      return;
    }

    if (!isSepolia) {
      setErrorMessage("Please switch your wallet network to Ethereum Sepolia.");
      return;
    }

    if (!isAddress(recipientAddress)) {
      setErrorMessage("Invalid recipient address. Must be a valid 0x EVM address.");
      return;
    }

    if (isQuoteExpired) {
      setErrorMessage("This quote has expired. Please refresh the quote to get the latest exchange rate.");
      return;
    }

    if (hasInsufficientGas) {
      setErrorMessage(
        `Insufficient Sepolia ETH for gas. You need ~${formatEther(estimatedGasWei)} ETH for gas, but have ${ethFormatted} ETH.`
      );
      return;
    }

    if (hasInsufficientToken) {
      setErrorMessage(
        `Insufficient ${quote.assetSymbol} balance. You need ${formatTokenAmount(quote.destinationCryptoAmount, quote.assetSymbol)}, but your wallet has ${quote.isNative ? ethFormatted : usdcFormatted} ${quote.assetSymbol}.`
      );
      return;
    }

    try {
      const to = recipientAddress as `0x${string}`;
      let txHash: `0x${string}`;

      if (quote.isNative) {
        // Native ETH Transfer
        const feeParams = await getSepoliaGasAndFees({
          account: address,
          to,
          value: quote.destinationCryptoUnits,
          isErc20: false,
        });
        txHash = await sendTransactionAsync({
          to,
          value: quote.destinationCryptoUnits,
          gas: feeParams.gas,
          gasPrice: feeParams.gasPrice,
        });
      } else {
        // Circle USDC (ERC-20 transfer)
        const usdcAddress = SUPPORTED_TOKENS.USDC.contractAddress!;
        const data = encodeFunctionData({
          abi: ERC20_MINIMAL_ABI,
          functionName: 'transfer',
          args: [to, quote.destinationCryptoUnits],
        });
        const feeParams = await getSepoliaGasAndFees({
          account: address,
          to: usdcAddress,
          data,
          isErc20: true,
        });
        txHash = await sendTransactionAsync({
          to: usdcAddress,
          data,
          gas: feeParams.gas,
          gasPrice: feeParams.gasPrice,
        });
      }

      // Record pending transfer in Neon Postgres
      if (!hasLoggedPending) {
        setHasLoggedPending(true);
        await createTransfer({
          senderAddress: address,
          recipientAddress: to,
          amount: quote.destinationCryptoAmount,
          chainId: sepolia.id,
          assetSymbol: quote.assetSymbol,
          tokenAddress: quote.isNative ? null : SUPPORTED_TOKENS.USDC.contractAddress,
          inrSourceAmount: quote.sourceAmountInr.toString(),
          referenceRate: quote.marketPriceInr.toString(),
          estimatedDestinationUsd: quote.estimatedUsdEquivalent.toFixed(2),
          networkFeeEth: quote.fees.estimatedNetworkFeeEth,
          platformFeeInr: quote.fees.platformFeeInr.toString(),
          status: "pending",
          transactionHash: txHash,
          isSimulatedPayout: true,
          payoutStatus: "pending",
        });

        await queryClient.invalidateQueries({ queryKey: ["transfers"] });

        // Independently poll for confirmation via our resilient RPC (not Infura/wagmi)
        pollReceiptAndConfirm({
          txHash,
          onConfirmed: () => {
            queryClient.invalidateQueries({ queryKey: ["transfers"] }).catch(console.error);
            refetchAll().catch(console.error);
          },
        });
      }
    } catch (err: unknown) {
      console.error("Transfer execution failed:", err);
      const msg = err instanceof Error ? err.message : "Transaction rejected or failed.";
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setErrorMessage('Transaction was cancelled in your wallet.');
      } else if (
        msg.includes('too many errors') ||
        msg.includes('Requested resource not available') ||
        msg.includes('0xaa36a7') ||
        msg.includes('Infura')
      ) {
        setErrorMessage(
          'MetaMask’s default Infura RPC is rate-limiting Sepolia requests. In MetaMask, go to Settings → Networks → Sepolia and change the RPC URL to https://11155111.rpc.thirdweb.com'
        );
      } else {
        setErrorMessage(msg);
      }
    }
  }

  const shortRecipient = `${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-6)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative text-gray-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Review Remittance ({quote.assetSymbol})</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                {quote.isNative ? "Native Token" : "Circle ERC-20"}
              </span>
            </h2>
            <p className="text-xs text-gray-400">Verify quote parameters before authorizing in MetaMask</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSending || isConfirming}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        {/* Sepolia Testnet Notice */}
        <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg text-xs text-amber-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            <strong>Ethereum Sepolia Testnet</strong> · Tokens have no real monetary value.
          </span>
        </div>

        {/* Expiry Countdown */}
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isQuoteExpired ? "bg-rose-500" : timeLeft < 15 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className={isQuoteExpired ? "text-rose-400 font-medium" : "text-gray-300"}>
              {isQuoteExpired ? "Quote Expired" : `Quote guaranteed for ${timeLeft}s`}
            </span>
          </div>
          {isQuoteExpired && (
            <button
              onClick={() => {
                onRefreshQuote();
                setTimeLeft(60);
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
            >
              Refresh Rate ⟳
            </button>
          )}
        </div>

        {/* Transfer Breakdown */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-2.5 text-xs">
          {/* Source Amount */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You Send (INR):</span>
            <div className="text-right">
              <span className="text-sm font-bold text-white">{formatINR(quote.sourceAmountInr)}</span>
              <span className="block text-[11px] text-gray-500">
                ≈ {formatUSD(quote.estimatedUsdEquivalent)} USD
              </span>
            </div>
          </div>

          {/* Rate */}
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-gray-400" title="Spot rate locked for 60 seconds">Quote Rate (60s spot):</span>
            <span className="font-mono text-gray-200">
              1 {quote.assetSymbol} = {formatINR(quote.marketPriceInr)}
            </span>
          </div>

          {/* Recipient */}
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-gray-400">Recipient Address:</span>
            <span className="font-mono text-white bg-white/5 px-2 py-0.5 rounded text-[11px]" title={recipientAddress}>
              {shortRecipient}
            </span>
          </div>

          {/* Token Contract (if ERC-20) */}
          {!quote.isNative && quote.contractAddress && (
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-gray-400">Circle USDC Contract:</span>
              <span className="font-mono text-gray-300 text-[10px]">
                {quote.contractAddress.slice(0, 10)}...{quote.contractAddress.slice(-8)}
              </span>
            </div>
          )}

          {/* Network Fee */}
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <div>
              <span className="text-gray-400">Est. Network Fee:</span>
              <span className="block text-[10px] text-gray-500">Paid in Sepolia ETH by sender</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-gray-300">{quote.fees.estimatedNetworkFeeEth.slice(0, 8)} ETH</span>
              <span className="block text-[10px] text-gray-500">≈ {formatINR(quote.fees.estimatedNetworkFeeInr)}</span>
            </div>
          </div>

          {/* Platform Fee */}
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span className="text-gray-400">Platform Fee:</span>
            <span className="text-emerald-400 font-medium">₹0.00 (0% MVP Promo)</span>
          </div>

          {/* Destination Deliverable */}
          <div className="flex justify-between items-center pt-3 border-t border-white/10 bg-emerald-500/5 -mx-4 -mb-4 p-3.5 rounded-b-xl">
            <div>
              <span className="text-xs font-semibold text-emerald-400">Recipient Receives:</span>
              <span className="block text-[10px] text-gray-400">Delivered on Ethereum Sepolia</span>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-white font-mono">
                {formatTokenAmount(quote.destinationCryptoAmount, quote.assetSymbol)}
              </span>
              <span className="block text-[11px] text-emerald-400">
                Net Value: {formatINR(quote.netDestinationValueInr)}
              </span>
            </div>
          </div>
        </div>

        {/* Sender Wallet Balance Snapshot */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
            <span className="text-gray-400 text-[10px] block">Your ETH (Gas):</span>
            <span className={`font-mono text-xs ${hasInsufficientGas ? "text-rose-400 font-bold" : "text-gray-200"}`}>
              {ethFormatted} ETH
            </span>
          </div>
          <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
            <span className="text-gray-400 text-[10px] block">Your {quote.assetSymbol}:</span>
            <span className={`font-mono text-xs ${hasInsufficientToken ? "text-rose-400 font-bold" : "text-gray-200"}`}>
              {quote.isNative ? `${ethFormatted} ETH` : `${usdcFormatted} USDC`}
            </span>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300" role="alert">
            {errorMessage}
          </div>
        )}
        {sendError && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300" role="alert">
            Transaction rejected: {sendError.message}
          </div>
        )}
        {receiptError && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300" role="alert">
            Receipt error: {receiptError.message}
          </div>
        )}

        {/* Milestone F: Simulated Destination Payout Card */}
        {receipt?.status === 'success' && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <span>✓</span> On-Chain Transfer Confirmed
              </span>
              <a
                href={`https://sepolia.etherscan.io/tx/${activeTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-400 hover:text-blue-300 font-mono text-[11px]"
              >
                Etherscan ↗
              </a>
            </div>

            {/* Clearly labeled simulated payout */}
            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">Destination Cashout:</span>
                <span className="font-mono font-bold text-white">
                  ${quote.estimatedUsdEquivalent.toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Simulation Status:</span>
                <span className={simulatedPayoutComplete ? "text-emerald-400 font-semibold" : "text-amber-400 animate-pulse"}>
                  {simulatedPayoutComplete ? "Simulated Payout Completed ✓" : "Processing simulated payout..."}
                </span>
              </div>
              <div className="pt-1 text-[10px] text-amber-300/80 italic border-t border-white/5">
                * Simulated payout — no real money transferred. Testnet demonstration only.
              </div>
            </div>
          </div>
        )}

        {/* Open Live Settlement Tracker Button */}
        {activeTxHash && (
          <button
            type="button"
            onClick={() => setIsTrackerOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>📡</span>
            <span>Open Live Settlement Tracker ↗</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending || isConfirming}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-medium transition-colors disabled:opacity-40"
          >
            {receipt?.status === 'success' ? 'Close' : 'Cancel / Edit'}
          </button>

          {!isSepolia ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isSwitchingChain}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSwitchingChain ? "Switching Network..." : "Switch to Sepolia"}
            </button>
          ) : receipt?.status === 'success' ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmTransfer}
              disabled={isSending || isConfirming || isQuoteExpired || hasInsufficientGas || hasInsufficientToken}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
            >
              {isSending
                ? "Confirm in MetaMask..."
                : isConfirming
                  ? "Confirming On-Chain..."
                  : isQuoteExpired
                    ? "Rate Expired"
                    : hasInsufficientGas
                      ? "Insufficient Gas (ETH)"
                      : hasInsufficientToken
                        ? `Insufficient ${quote.assetSymbol}`
                        : `Confirm & Send ${quote.assetSymbol}`}
            </button>
          )}
        </div>
      </div>

      {/* Live Settlement Tracker Modal Instance */}
      <SettlementTrackerModal
        transfer={
          activeTxHash
            ? {
                senderAddress: address ?? '',
                recipientAddress,
                amount: quote.destinationCryptoAmount,
                assetSymbol: quote.assetSymbol,
                chainId: sepolia.id,
                inrSourceAmount: quote.sourceAmountInr.toString(),
                referenceRate: quote.marketPriceInr.toString(),
                estimatedDestinationUsd: quote.estimatedUsdEquivalent.toFixed(2),
                networkFeeEth: quote.fees.estimatedNetworkFeeEth,
                status:
                  receipt?.status === 'success'
                    ? 'confirmed'
                    : receipt?.status === 'reverted'
                      ? 'failed'
                      : activeTxHash
                        ? 'pending'
                        : isSending
                          ? 'awaiting signature'
                          : 'draft',
                transactionHash: activeTxHash,
                isSimulatedPayout: true,
                payoutStatus: simulatedPayoutComplete
                  ? 'simulated_completed'
                  : receipt?.status === 'success'
                    ? 'simulated_pending'
                    : 'pending',
                payoutCompletedAt: simulatedPayoutComplete ? new Date().toISOString() : null,
                createdAt: quote.quoteCreatedAt,
                confirmedAt: receipt?.status === 'success' ? new Date().toISOString() : null,
              }
            : null
        }
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />
    </div>
  );
}
