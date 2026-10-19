'use client';

import { formatINR } from '@/lib/comparison';

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
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative text-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="tracker-title" className="text-base font-bold text-white">
                Live Remittance Settlement Tracker
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">
                Ethereum Sepolia
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Consumer-fintech lifecycle tracking from local INR quote to simulated USD destination delivery
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settlement tracker"
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Transfer Header Summary Card */}
        <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400 text-[10px] block">Transfer Amount:</span>
              <span className="font-mono font-bold text-white text-sm">
                {transfer.amount} {transfer.assetSymbol}
              </span>
            </div>

            <div>
              <span className="text-gray-400 text-[10px] block">Source Value:</span>
              <span className="font-mono text-gray-200">
                {formattedInr ?? '—'}
              </span>
            </div>

            <div>
              <span className="text-gray-400 text-[10px] block">Destination Est.:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {transfer.estimatedDestinationUsd ? `$${transfer.estimatedDestinationUsd} USD` : '—'}
              </span>
            </div>

            <div>
              <span className="text-gray-400 text-[10px] block">Lifecycle Status:</span>
              <span
                className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded inline-block ${
                  isConfirmed
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isFailed
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                }`}
              >
                {transfer.status}
              </span>
            </div>
          </div>

          {/* Contextual routing and fee breakdown */}
          <div className="pt-2.5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-400">
            <div>
              <span className="text-gray-500">Sender:</span>{' '}
              <span className="font-mono text-gray-300" title={transfer.senderAddress}>
                {truncateAddress(transfer.senderAddress)}
              </span>{' '}
              <span className="text-gray-600">→</span>{' '}
              <span className="text-gray-500">Recipient:</span>{' '}
              <span className="font-mono text-gray-300" title={transfer.recipientAddress}>
                {truncateAddress(transfer.recipientAddress)}
              </span>
            </div>

            <div className="sm:text-right">
              <span className="text-gray-500">Source Network:</span>{' '}
              <span className="text-gray-300 font-medium">Sepolia Testnet (ID: {transfer.chainId ?? 11155111})</span>
              {transfer.networkFeeEth && (
                <span className="block text-[10px] text-gray-500">
                  Gas: {transfer.networkFeeEth.slice(0, 8)} ETH
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Stages */}
        <div className="space-y-4 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
          {/* Stage 1: Quote Created */}
          <div className="relative">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
              ✓
            </div>
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Stage 1: Remittance Quote & Order Created</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {createdAtDate ? createdAtDate.toLocaleTimeString() : 'Recorded'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Target asset: <strong className="text-gray-200">{transfer.assetSymbol}</strong> on Ethereum Sepolia.
                {transfer.referenceRate && ` Rate locked at 1 ${transfer.assetSymbol} ≈ ₹${parseFloat(transfer.referenceRate).toLocaleString('en-IN')}.`}
              </p>
            </div>
          </div>

          {/* Stage 2: Wallet Authorization */}
          <div className="relative">
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isAwaitingSig
                  ? 'bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse'
                  : transfer.status === 'rejected'
                    ? 'bg-rose-500/20 border border-rose-500 text-rose-400'
                    : 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
              }`}
            >
              {isAwaitingSig ? '⋯' : transfer.status === 'rejected' ? '✕' : '✓'}
            </div>
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Stage 2: Wallet Authorization (MetaMask)</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {isAwaitingSig ? 'Awaiting Signature' : transfer.status === 'rejected' ? 'Rejected' : 'Signed'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isAwaitingSig
                  ? 'Prompting user for explicit cryptographic signature in MetaMask extension.'
                  : transfer.status === 'rejected'
                    ? 'User declined transaction authorization in their connected wallet.'
                    : `Authorized by sender ${truncateAddress(transfer.senderAddress)}.`}
              </p>
            </div>
          </div>

          {/* Stage 3: On-Chain Broadcast & Mining */}
          <div className="relative">
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                !transfer.transactionHash
                  ? 'bg-gray-800 border border-white/20 text-gray-500'
                  : isPending
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse'
                    : isFailed
                      ? 'bg-rose-500/20 border border-rose-500 text-rose-400'
                      : 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
              }`}
            >
              {!transfer.transactionHash ? '○' : isPending ? '⋯' : isFailed ? '✕' : '✓'}
            </div>
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Stage 3: Sepolia Blockchain Broadcast</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {transfer.transactionHash ? 'Broadcasted' : 'Pending'}
                </span>
              </div>
              {transfer.transactionHash ? (
                <div className="mt-1 space-y-0.5">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${transfer.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-mono text-[11px] underline break-all inline-flex items-center gap-1"
                  >
                    <span>Tx Hash: {transfer.transactionHash.slice(0, 16)}...{transfer.transactionHash.slice(-8)}</span>
                    <span>↗</span>
                  </a>
                  {transfer.networkFeeEth && (
                    <span className="block text-[10px] text-gray-400">
                      Network Gas: {transfer.networkFeeEth.slice(0, 8)} ETH paid on Sepolia
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 mt-0.5">Awaiting broadcast to Ethereum Sepolia RPC.</p>
              )}
            </div>
          </div>

          {/* Stage 4: On-Chain Finality */}
          <div className="relative">
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isConfirmed
                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                  : isFailed
                    ? 'bg-rose-500/20 border border-rose-500 text-rose-400'
                    : isPending
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-300 animate-pulse'
                      : 'bg-gray-800 border border-white/20 text-gray-500'
              }`}
            >
              {isConfirmed ? '✓' : isFailed ? '✕' : isPending ? '⋯' : '○'}
            </div>
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Stage 4: Blockchain Consensus & Confirmation</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {confirmedAtDate ? confirmedAtDate.toLocaleTimeString() : isPending ? 'Awaiting Block' : '—'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isConfirmed
                  ? `Confirmed on Ethereum Sepolia. Delivered to recipient address ${truncateAddress(transfer.recipientAddress)}.`
                  : isFailed
                    ? 'Transaction reverted on-chain. Funds were not transferred.'
                    : isPending
                      ? 'Transaction is in the Sepolia mempool. Waiting for block validation...'
                      : 'Pending preceding steps.'}
              </p>
            </div>
          </div>

          {/* Stage 5: Simulated Destination Settlement */}
          <div className="relative">
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isPayoutDone
                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                  : isPayoutPending
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300 animate-pulse'
                    : 'bg-gray-800 border border-white/20 text-gray-500'
              }`}
            >
              {isPayoutDone ? '✓' : isPayoutPending ? '⋯' : '○'}
            </div>
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Stage 5: Destination Payout</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    SIMULATION
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  {payoutAtDate ? payoutAtDate.toLocaleTimeString() : isPayoutDone ? 'Completed' : 'Pending'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {isPayoutDone ? (
                  <span className="text-emerald-400">
                    Simulated delivery of {transfer.estimatedDestinationUsd ? `$${transfer.estimatedDestinationUsd} USD` : 'funds'} completed to recipient account.
                  </span>
                ) : isPayoutPending ? (
                  <span className="text-amber-300">
                    Processing simulated settlement rails (ACH/Fedwire simulation delay)...
                  </span>
                ) : (
                  <span>Awaiting on-chain transaction confirmation before triggering payout simulation.</span>
                )}
              </p>
              <div className="mt-1 text-[10px] text-gray-500 italic">
                * Simulated payout — no real money transferred. Testnet demonstration only.
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            {transfer.id ? `Record #${transfer.id}` : 'Active Session'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
}
