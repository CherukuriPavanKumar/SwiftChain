'use client';

import { useQuery } from "@tanstack/react-query";
import { useEthPrice } from "./components/eth-price-ticker";

interface TransferRecord {
  id: number;
  senderAddress: string;
  recipientAddress: string;
  amount: string;
  chainId: number;
  assetSymbol: string;
  status: string;
  transactionHash: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

function truncateAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/20 text-green-400",
  pending:   "bg-yellow-500/20 text-yellow-400",
  failed:    "bg-red-500/20 text-red-400",
  rejected:  "bg-red-500/20 text-red-400",
  draft:     "bg-gray-500/20 text-gray-400",
  "awaiting signature": "bg-blue-500/20 text-blue-400",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-gray-500/20 text-gray-400";
  return (
    <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function TransferHistory() {
  const { data: transfers, isLoading, error } = useQuery<TransferRecord[]>({
    queryKey: ["transfers"],
    queryFn: async () => {
      const response = await fetch("/api/transfers");
      if (!response.ok) throw new Error("Failed to load transfers");
      return response.json();
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });

  const { data: ethPrice } = useEthPrice();

  function toINR(ethAmount: string): string | null {
    if (!ethPrice?.inr) return null;
    const eth = parseFloat(ethAmount);
    if (isNaN(eth)) return null;
    const inr = eth * ethPrice.inr;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(inr);
  }

  return (
    <div className="mt-8 p-4 border border-white/10 rounded-xl bg-white/5 w-full">
      <h2 className="text-lg font-bold mb-4 text-white">Transfer History</h2>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-white/5" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm" role="alert">
          ⚠ Error loading transfers: {error.message}
        </p>
      )}

      {!isLoading && !error && (!transfers || transfers.length === 0) && (
        <p className="text-gray-500 text-sm">No transfers recorded yet.</p>
      )}

      {transfers && transfers.length > 0 && (
        <ul className="space-y-2">
          {transfers.map((tx) => {
            const inrEquiv = toINR(tx.amount);
            return (
              <li
                key={tx.id}
                className="p-3 border border-white/10 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">
                    {truncateAddress(tx.senderAddress)}{" "}
                    <span className="text-gray-500">→</span>{" "}
                    {truncateAddress(tx.recipientAddress)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(tx.createdAt).toLocaleString()}
                    {tx.confirmedAt && (
                      <span className="ml-2 text-green-600">
                        · Confirmed {new Date(tx.confirmedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="font-semibold text-white">
                    {tx.amount} {tx.assetSymbol}
                  </div>
                  {inrEquiv && (
                    <div className="text-xs text-gray-400">≈ {inrEquiv}</div>
                  )}
                  <div className="flex items-center gap-2 sm:justify-end mt-1">
                    <StatusBadge status={tx.status} />
                    {tx.transactionHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 underline hover:text-blue-300 transition-colors"
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
    </div>
  );
}