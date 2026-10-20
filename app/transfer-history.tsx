'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "wagmi";
import { fetchTransfers } from "@/lib/transfer-client";
import { useEthPrice } from "./components/eth-price-ticker";
import SettlementTrackerModal, { type SettlementTrackerData } from "./components/settlement-tracker-modal";

export interface TransferRecord {
  id: number;
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  chainId: number;
  assetSymbol: string;
  tokenAddress?: string | null;
  inrSourceAmount?: string | null;
  referenceRate?: string | null;
  estimatedDestinationUsd?: string | null;
  networkFeeEth?: string | null;
  status: string;
  transactionHash: string | null;
  isSimulatedPayout?: boolean;
  payoutStatus?: string;
  payoutCompletedAt?: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

function truncateAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  pending: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  failed: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  rejected: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  draft: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  "awaiting signature": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-500/20 text-gray-400";
  return (
    <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function TransferHistory() {
  const { address } = useConnection();
  const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);
  const [fallbackTransfer, setFallbackTransfer] = useState<TransferRecord | null>(null);

  const { data: transfers, isLoading, error } = useQuery<TransferRecord[]>({
    queryKey: ["transfers", address],
    queryFn: () => fetchTransfers(address),
    refetchInterval: (query) => {
      // Poll dynamically: every 2.5s if any transfer is active/pending, otherwise every 15s
      const data = query.state.data;
      const hasActive = data?.some(
        (t) =>
          t.status === "pending" ||
          t.status === "awaiting signature" ||
          t.payoutStatus === "simulated_pending"
      );
      return hasActive ? 2500 : 15000;
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });

  const { data: marketData } = useEthPrice();

  const activeModalTransfer = useMemo<SettlementTrackerData | null>(() => {
    if (selectedTrackerId === null && !fallbackTransfer) return null;
    const found = transfers?.find((t) => t.id === selectedTrackerId);
    const target = found ?? fallbackTransfer;
    if (!target) return null;

    return {
      id: target.id,
      senderAddress: target.senderAddress,
      recipientAddress: target.recipientAddress,
      amount: target.amount,
      assetSymbol: target.assetSymbol,
      chainId: target.chainId,
      inrSourceAmount: target.inrSourceAmount,
      referenceRate: target.referenceRate,
      estimatedDestinationUsd: target.estimatedDestinationUsd,
      networkFeeEth: target.networkFeeEth,
      status: target.status,
      transactionHash: target.transactionHash,
      isSimulatedPayout: target.isSimulatedPayout,
      payoutStatus: target.payoutStatus,
      payoutCompletedAt: target.payoutCompletedAt,
      createdAt: target.createdAt,
      confirmedAt: target.confirmedAt,
    };
  }, [transfers, selectedTrackerId, fallbackTransfer]);

  function formatFiatValue(tx: TransferRecord): string | null {
    if (tx.inrSourceAmount) {
      return `₹${parseFloat(tx.inrSourceAmount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    }
    // Fallback calculation using live rate
    if (tx.assetSymbol === "USDC") {
      const usdcInr = marketData?.usdc?.inr ?? 94.88;
      const val = parseFloat(tx.amount) * usdcInr;
      return !isNaN(val) ? `≈ ₹${val.toFixed(2)}` : null;
    }
    if (marketData?.inr) {
      const val = parseFloat(tx.amount) * marketData.inr;
      return !isNaN(val) ? `≈ ₹${val.toFixed(2)}` : null;
    }
    return null;
  }

  return (
    <div className="mt-8 p-5 border border-white/10 rounded-2xl bg-white/5 w-full shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Transfer & Remittance History</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
              Live Tracker Available
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            On-chain testnet transfers and simulated destination payouts with real-time lifecycle tracking
          </p>
        </div>
        <span className="text-[11px] text-gray-500 font-mono self-start sm:self-auto">
          Persistent via Neon Postgres
        </span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-xl bg-white/5" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-rose-400 text-xs p-3 rounded-lg bg-rose-500/10 border border-rose-500/20" role="alert">
          ⚠ Error loading transfers: {error.message}
        </p>
      )}

      {!isLoading && !error && (!transfers || transfers.length === 0) && (
        <div className="p-6 text-center space-y-2 bg-black/20 rounded-xl border border-white/5">
          <p className="text-sm text-gray-300 font-medium">No transfers yet</p>
          <p className="text-xs text-gray-500">
            Your transfer history is private — only visible to you after signing in.
            Submit a testnet transfer above to see it tracked here.
          </p>
        </div>
      )}

      {transfers && transfers.length > 0 && (
        <ul className="space-y-2.5">
          {transfers.map((tx) => {
            const fiatEquiv = formatFiatValue(tx);
            const isUsdc = tx.assetSymbol === "USDC";

            return (
              <li
                key={tx.id}
                className="p-3.5 border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm hover:bg-white/5 transition-all bg-black/20"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        isUsdc
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {tx.assetSymbol}
                    </span>
                    <span className="font-mono text-xs text-white truncate">
                      {truncateAddress(tx.senderAddress)}{" "}
                      <span className="text-gray-500">→</span>{" "}
                      {truncateAddress(tx.recipientAddress)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>{new Date(tx.createdAt).toLocaleString()}</span>
                    {tx.confirmedAt && (
                      <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                        <span>✓</span> Confirmed on-chain
                      </span>
                    )}
                  </div>

                  {/* Simulated Payout Status Badge */}
                  {tx.isSimulatedPayout && tx.status === "confirmed" && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-gray-400">Destination payout:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-medium ${
                          tx.payoutStatus === "simulated_completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse"
                        }`}
                      >
                        {tx.payoutStatus === "simulated_completed"
                          ? `Simulated Payout Delivered (${tx.estimatedDestinationUsd ? `$${tx.estimatedDestinationUsd} USD` : "USD"}) ✓`
                          : "Simulating Destination Settlement..."}
                      </span>
                    </div>
                  )}
                </div>

                <div className="sm:text-right shrink-0 space-y-1.5">
                  <div className="font-mono font-bold text-white text-base">
                    {tx.amount} {tx.assetSymbol}
                  </div>
                  {fiatEquiv && (
                    <div className="text-xs text-gray-400">{fiatEquiv}</div>
                  )}

                  <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                    <StatusBadge status={tx.status} />

                    {/* Track Settlement Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrackerId(tx.id);
                        setFallbackTransfer(tx);
                      }}
                      className="px-2 py-0.5 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded font-medium transition-colors flex items-center gap-1"
                      title="Open Live Settlement Tracker"
                    >
                      <span>Track Settlement</span>
                      <span>↗</span>
                    </button>

                    {tx.transactionHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 underline hover:text-blue-300 transition-colors font-mono"
                        title="View on Sepolia Etherscan"
                      >
                        Etherscan ↗
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal instance for reviewing / revisiting any historical transfer */}
      <SettlementTrackerModal
        transfer={activeModalTransfer}
        isOpen={Boolean(activeModalTransfer)}
        onClose={() => {
          setSelectedTrackerId(null);
          setFallbackTransfer(null);
        }}
      />
    </div>
  );
}