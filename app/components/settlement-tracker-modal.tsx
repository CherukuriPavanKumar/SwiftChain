'use client';

import React from 'react';
import { formatINR } from '@/lib/comparison';
import { Check, X, ExternalLink, Clock, AlertCircle, ArrowRight } from 'lucide-react';

export interface SettlementTrackerData {
  id?: number | string;
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  assetSymbol: string;
  chainId?: number;
  inrSourceAmount?: string | null;
  referenceRate?: string | null;
  estimatedDestinationUsd?: string | null;
  networkFeeEth?: string | null;
  status: string; // 'draft' | 'awaiting signature' | 'pending' | 'confirmed' | 'failed' | 'rejected'
  transactionHash?: string | null;
  isSimulatedPayout?: boolean;
  payoutStatus?: string; // 'none' | 'pending' | 'simulated_pending' | 'simulated_completed' | 'failed'
  payoutCompletedAt?: string | null;
  createdAt?: string | number;
  confirmedAt?: string | null;
}

interface SettlementTrackerModalProps {
  transfer: SettlementTrackerData | null;
  isOpen: boolean;
  onClose: () => void;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export default function SettlementTrackerModal({
  transfer,
  isOpen,
  onClose,
}: SettlementTrackerModalProps) {
  if (!isOpen || !transfer) return null;

  const isConfirmed = transfer.status === 'confirmed';
  const isFailed = transfer.status === 'failed' || transfer.status === 'rejected';
  const isPending = transfer.status === 'pending';
  const isAwaitingSig = transfer.status === 'awaiting signature';

  const isPayoutDone = transfer.payoutStatus === 'simulated_completed';
  const isPayoutPending = transfer.payoutStatus === 'simulated_pending' || (isConfirmed && !isPayoutDone);

  const createdAtDate = transfer.createdAt ? new Date(transfer.createdAt) : null;
  const confirmedAtDate = transfer.confirmedAt ? new Date(transfer.confirmedAt) : null;
  const payoutAtDate = transfer.payoutCompletedAt ? new Date(transfer.payoutCompletedAt) : null;

  const formattedInr = transfer.inrSourceAmount
    ? formatINR(parseFloat(transfer.inrSourceAmount))
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-[#0d1e17] border border-[#233a30] rounded-xl p-5 sm:p-6 text-[#F4F1E8] space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#233a30] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 id="tracker-title" className="text-base font-bold text-[#F4F1E8]">
                Live settlement tracker
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#071410] text-[#7a9187] font-mono border border-[#233a30]">
                Sepolia testnet
              </span>
            </div>
            <p className="text-xs text-[#7a9187]">
              Lifecycle tracking from INR quote to destination payout
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settlement tracker"
            className="text-[#7a9187] hover:text-[#F4F1E8] p-1.5 rounded-lg hover:bg-[#152920] transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Header Summary Card */}
        <div className="p-4 bg-[#071410] border border-[#233a30] rounded-lg space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#7a9187] text-xs block">Transfer amount</span>
              <span className="font-mono font-bold text-[#F4F1E8] text-sm tabular-nums">
                {transfer.amount} {transfer.assetSymbol}
              </span>
            </div>

            <div>
              <span className="text-[#7a9187] text-xs block">Source value</span>
              <span className="font-mono text-[#a6b8b0] tabular-nums">
                {formattedInr ?? '\u2014'}
              </span>
            </div>

            <div>
              <span className="text-[#7a9187] text-xs block">Destination estimate</span>
              <span className="font-mono text-[#8BE3BB] font-semibold tabular-nums">
                {transfer.estimatedDestinationUsd ? `$${transfer.estimatedDestinationUsd} USD` : '\u2014'}
              </span>
            </div>

            <div>
              <span className="text-[#7a9187] text-xs block">Lifecycle status</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded-md mt-0.5 ${
                  isConfirmed
                    ? 'bg-[#152920] text-[#6ED6A8] border border-[#233a30]'
                    : isFailed
                      ? 'bg-[#1a0f0f] text-[#e57373] border border-[#3d1f1f]'
                      : 'bg-[#1e1a0a] text-[#F2C66D] border border-[#3d3215]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConfirmed
                      ? 'bg-[#6ED6A8]'
                      : isFailed
                        ? 'bg-[#e57373]'
                        : 'bg-[#F2C66D]'
                  }`}
                />
                <span className="capitalize">{transfer.status}</span>
              </span>
            </div>
          </div>

          {/* Contextual routing and fee breakdown */}
          <div className="pt-2.5 border-t border-[#233a30]/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#7a9187]">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-mono text-[#a6b8b0] tabular-nums" title={transfer.senderAddress}>
                {truncateAddress(transfer.senderAddress)}
              </span>
              <ArrowRight className="w-3 h-3 text-[#7a9187] shrink-0" />
              <span className="font-mono text-[#a6b8b0] tabular-nums" title={transfer.recipientAddress}>
                {truncateAddress(transfer.recipientAddress)}
              </span>
            </div>

            <div className="sm:text-right space-y-0.5">
              <span className="text-[#a6b8b0] font-medium">
                Sepolia testnet (ID: {transfer.chainId ?? 11155111})
              </span>
              {transfer.networkFeeEth && (
                <span className="block text-xs text-[#7a9187] font-mono tabular-nums">
                  Gas: {transfer.networkFeeEth.slice(0, 8)} ETH
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Stages */}
        <div className="space-y-4 relative pl-7 before:content-[''] before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-px before:bg-[#233a30]">
          {/* Stage 1: Quote Created */}
          <div className="relative">
            <div className="absolute -left-7 top-0.5 w-5 h-5 rounded-full bg-[#152920] border border-[#233a30] flex items-center justify-center text-[#6ED6A8]">
              <Check className="w-3 h-3" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F4F1E8]">1. Remittance quote &amp; order created</span>
                <span className="text-xs text-[#7a9187] font-mono tabular-nums">
                  {createdAtDate ? createdAtDate.toLocaleTimeString() : 'Recorded'}
                </span>
              </div>
              <p className="text-xs text-[#7a9187]">
                Target asset: <strong className="text-[#a6b8b0] font-medium">{transfer.assetSymbol}</strong> on Ethereum Sepolia.
                {transfer.referenceRate && ` Rate locked at 1 ${transfer.assetSymbol} \u2248 \u20b9${parseFloat(transfer.referenceRate).toLocaleString('en-IN')}.`}
              </p>
            </div>
          </div>

          {/* Stage 2: Wallet Authorization */}
          <div className="relative">
            <div
              className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                isAwaitingSig
                  ? 'bg-[#1e1a0a] border border-[#3d3215] text-[#F2C66D]'
                  : transfer.status === 'rejected'
                    ? 'bg-[#1a0f0f] border border-[#3d1f1f] text-[#e57373]'
                    : 'bg-[#152920] border border-[#233a30] text-[#6ED6A8]'
              }`}
            >
              {isAwaitingSig ? (
                <Clock className="w-3 h-3" />
              ) : transfer.status === 'rejected' ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F4F1E8]">2. Wallet authorization</span>
                <span className="text-xs text-[#7a9187] font-mono">
                  {isAwaitingSig ? 'Awaiting signature' : transfer.status === 'rejected' ? 'Rejected' : 'Signed'}
                </span>
              </div>
              <p className="text-xs text-[#7a9187]">
                {isAwaitingSig
                  ? 'Prompting user for cryptographic signature in MetaMask.'
                  : transfer.status === 'rejected'
                    ? 'Transaction authorization declined in wallet.'
                    : `Authorized by sender ${truncateAddress(transfer.senderAddress)}.`}
              </p>
            </div>
          </div>

          {/* Stage 3: On-Chain Broadcast & Mining */}
          <div className="relative">
            <div
              className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                !transfer.transactionHash
                  ? 'bg-[#071410] border border-[#233a30] text-[#7a9187]'
                  : isPending
                    ? 'bg-[#1e1a0a] border border-[#3d3215] text-[#F2C66D]'
                    : isFailed
                      ? 'bg-[#1a0f0f] border border-[#3d1f1f] text-[#e57373]'
                      : 'bg-[#152920] border border-[#233a30] text-[#6ED6A8]'
              }`}
            >
              {!transfer.transactionHash ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#233a30]" />
              ) : isPending ? (
                <Clock className="w-3 h-3" />
              ) : isFailed ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F4F1E8]">3. Sepolia blockchain broadcast</span>
                <span className="text-xs text-[#7a9187] font-mono">
                  {transfer.transactionHash ? 'Broadcasted' : 'Pending'}
                </span>
              </div>
              {transfer.transactionHash ? (
                <div className="mt-1 space-y-0.5">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${transfer.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8BE3BB] hover:underline font-mono text-xs tabular-nums inline-flex items-center gap-1"
                  >
                    <span>Tx: {transfer.transactionHash.slice(0, 14)}\u2026{transfer.transactionHash.slice(-8)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {transfer.networkFeeEth && (
                    <span className="block text-xs text-[#7a9187] font-mono tabular-nums">
                      Gas paid: {transfer.networkFeeEth.slice(0, 8)} ETH
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#7a9187]">Awaiting broadcast to Ethereum Sepolia RPC.</p>
              )}
            </div>
          </div>

          {/* Stage 4: On-Chain Finality */}
          <div className="relative">
            <div
              className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                isConfirmed
                  ? 'bg-[#152920] border border-[#233a30] text-[#6ED6A8]'
                  : isFailed
                    ? 'bg-[#1a0f0f] border border-[#3d1f1f] text-[#e57373]'
                    : isPending
                      ? 'bg-[#1e1a0a] border border-[#3d3215] text-[#F2C66D]'
                      : 'bg-[#071410] border border-[#233a30] text-[#7a9187]'
              }`}
            >
              {isConfirmed ? (
                <Check className="w-3 h-3" />
              ) : isFailed ? (
                <AlertCircle className="w-3 h-3" />
              ) : isPending ? (
                <Clock className="w-3 h-3" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#233a30]" />
              )}
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F4F1E8]">4. Consensus &amp; finality</span>
                <span className="text-xs text-[#7a9187] font-mono tabular-nums">
                  {confirmedAtDate ? confirmedAtDate.toLocaleTimeString() : isPending ? 'Awaiting block' : '\u2014'}
                </span>
              </div>
              <p className="text-xs text-[#7a9187]">
                {isConfirmed
                  ? `Confirmed on Ethereum Sepolia. Delivered to recipient address ${truncateAddress(transfer.recipientAddress)}.`
                  : isFailed
                    ? 'Transaction reverted on-chain. Funds were not transferred.'
                    : isPending
                      ? 'Transaction in mempool. Waiting for block validation\u2026'
                      : 'Pending preceding steps.'}
              </p>
            </div>
          </div>

          {/* Stage 5: Simulated Destination Settlement */}
          <div className="relative">
            <div
              className={`absolute -left-7 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                isPayoutDone
                  ? 'bg-[#152920] border border-[#233a30] text-[#6ED6A8]'
                  : isPayoutPending
                    ? 'bg-[#1e1a0a] border border-[#3d3215] text-[#F2C66D]'
                    : 'bg-[#071410] border border-[#233a30] text-[#7a9187]'
              }`}
            >
              {isPayoutDone ? (
                <Check className="w-3 h-3" />
              ) : isPayoutPending ? (
                <Clock className="w-3 h-3" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#233a30]" />
              )}
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#F4F1E8]">5. Destination payout</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#152920] text-[#a6b8b0] border border-[#233a30] font-mono">
                    Simulation
                  </span>
                </div>
                <span className="text-xs text-[#7a9187] font-mono tabular-nums">
                  {payoutAtDate ? payoutAtDate.toLocaleTimeString() : isPayoutDone ? 'Completed' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-[#7a9187]">
                {isPayoutDone ? (
                  <span className="text-[#6ED6A8]">
                    Simulated delivery of {transfer.estimatedDestinationUsd ? `$${transfer.estimatedDestinationUsd} USD` : 'funds'} completed to recipient account.
                  </span>
                ) : isPayoutPending ? (
                  <span className="text-[#F2C66D]">
                    Processing simulated settlement rails (ACH/Fedwire simulation delay)\u2026
                  </span>
                ) : (
                  <span>Awaiting on-chain transaction confirmation before triggering payout simulation.</span>
                )}
              </p>
              <div className="mt-1 text-xs text-[#7a9187]/70 italic">
                * Simulated payout &mdash; testnet demonstration only.
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#233a30] flex items-center justify-between">
          <div className="text-xs text-[#7a9187] font-mono tabular-nums">
            {transfer.id ? `Record #${transfer.id}` : 'Active session'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-lg bg-[#152920] hover:bg-[#1e3d30] border border-[#233a30] text-[#8BE3BB] text-xs font-semibold transition-colors duration-150 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
