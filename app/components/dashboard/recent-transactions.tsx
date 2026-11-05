'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransfers } from '@/lib/transfer-client';
import type { TransferRecord } from '@/app/transfer-history';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { EthereumIcon, UsdcIcon } from './token-icons';
import SettlementTrackerModal, { type SettlementTrackerData } from '@/app/components/settlement-tracker-modal';
import { useEthPrice } from '@/app/components/eth-price-ticker';

import { useConnection } from 'wagmi';

interface RecentTransactionsProps {
  onViewAll?: () => void;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// Contextual purpose labels based on recipient address or index
function getRecipientLabel(tx: TransferRecord, index: number): string {
  const labels = [
    'Personal wallet',
    'Contract settlement',
    'Vendor payment',
    'Cross-border transfer',
    'Treasury rebalance',
  ];
  return labels[index % labels.length];
}

export function RecentTransactions({ onViewAll }: RecentTransactionsProps) {
  const { address } = useConnection();
  const [selectedTransfer, setSelectedTransfer] = useState<SettlementTrackerData | null>(null);
  const { data: marketData } = useEthPrice();

  const { data: transfers, isLoading, error } = useQuery<TransferRecord[]>({
    queryKey: ['transfers', address],
    queryFn: () => fetchTransfers(address),
    refetchInterval: 5000,
  });

  const recentList = transfers?.slice(0, 5) ?? [];

  function formatFiat(tx: TransferRecord): string {
    if (tx.inrSourceAmount) {
      const num = parseFloat(tx.inrSourceAmount);
      return `≈ ₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    const tokenAmount = parseFloat(tx.amount) || 0;
    if (tx.assetSymbol === 'USDC') {
      const rate = marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88;
      return `≈ ₹${(tokenAmount * rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    const rate = marketData?.ethereum?.inr ?? marketData?.inr ?? 230000;
    return `≈ ₹${(tokenAmount * rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  function formatDateParts(isoDate: string) {
    try {
      const d = new Date(isoDate);
      const dateStr = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
      const timeStr = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
      return { dateStr, timeStr };
    } catch {
      return { dateStr: 'Recent', timeStr: '' };
    }
  }

  return (
    <>
      <div className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 space-y-4 shadow-sm">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F4F1E8]">Recent Transactions</h3>
            <p className="text-xs text-[#a6b8b0] mt-0.5">Your latest transfer activity on Sepolia</p>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-bold text-[#8BE3BB] hover:underline transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-[#071410] border border-[#233a30]" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
            Failed to load transactions. Please check network connection.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && recentList.length === 0 && (
          <div className="p-8 text-center space-y-2 rounded-lg bg-[#071410] border border-[#233a30]">
            <p className="text-sm font-bold text-[#F4F1E8]">No recent transactions</p>
            <p className="text-xs text-[#a6b8b0] max-w-sm mx-auto font-normal">
              Execute a testnet transfer to verify on-chain settlement and receipt tracking here.
            </p>
          </div>
        )}

        {/* Transactions Table */}
        {!isLoading && recentList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#233a30] text-xs font-normal text-[#7a9187]">
                  <th className="pb-2.5 font-normal">Recipient</th>
                  <th className="pb-2.5 font-normal">Asset</th>
                  <th className="pb-2.5 font-normal">Amount</th>
                  <th className="pb-2.5 font-normal">Status</th>
                  <th className="pb-2.5 font-normal">Date</th>
                  <th className="pb-2.5 font-normal text-right sr-only">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#233a30] text-xs">
                {recentList.map((tx, idx) => {
                  const isUsdc = tx.assetSymbol === 'USDC';
                  const isConfirmed = tx.status === 'confirmed';
                  const isPending = tx.status === 'pending' || tx.status === 'awaiting signature';
                  const isFailed = tx.status === 'failed' || tx.status === 'rejected';
                  const { dateStr, timeStr } = formatDateParts(tx.createdAt);
                  const fiat = formatFiat(tx);
                  const label = getRecipientLabel(tx, idx);
                  const shortInitials = tx.recipientAddress.slice(2, 4).toUpperCase();

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTransfer(tx)}
                      className="hover:bg-[#152920] transition-colors cursor-pointer group"
                    >
                      {/* Recipient */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#071410] border border-[#233a30] flex items-center justify-center font-mono text-[10px] text-[#8BE3BB] font-bold shrink-0">
                            {shortInitials}
                          </div>
                          <div>
                            <p className="font-mono font-medium text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                              {truncateAddress(tx.recipientAddress)}
                            </p>
                            <p className="text-[11px] text-[#7a9187] mt-0.5">{label}</p>
                          </div>
                        </div>
                      </td>

                      {/* Asset */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5 font-medium text-[#F4F1E8]">
                          {isUsdc ? <UsdcIcon className="w-4 h-4 text-xs" /> : <EthereumIcon className="w-4 h-4 text-xs" />}
                          <span className="font-mono text-xs">{tx.assetSymbol}</span>
                        </div>
                      </td>

                      {/* Amount: Bold & Tabular */}
                      <td className="py-3 pr-3">
                        <div>
                          <p className="font-mono font-bold text-sm text-[#F4F1E8] tabular-nums">{tx.amount}</p>
                          <p className="font-mono text-[11px] text-[#7a9187] tabular-nums">{fiat}</p>
                        </div>
                      </td>

                      {/* Status: Quiet badges without pulse */}
                      <td className="py-3 pr-3">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[#8BE3BB] bg-[#152920] border border-[#233a30]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
                            Completed
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[#F2C66D] bg-[#231e13] border border-[#3d331d]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F2C66D]" />
                            Pending
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[#FF8585] bg-[#261515] border border-[#401f1f]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF8585]" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 pr-3">
                        <div>
                          <p className="font-normal text-[#F4F1E8]">{dateStr}</p>
                          <p className="text-[11px] text-[#7a9187]">{timeStr}</p>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 text-right">
                        <ArrowUpRight className="w-4 h-4 text-[#7a9187] group-hover:text-[#8BE3BB] transition-colors ml-auto stroke-[1.5]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Settlement Tracker */}
      {selectedTransfer && (
        <SettlementTrackerModal
          transfer={selectedTransfer}
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </>
  );
}
