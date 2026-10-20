'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransfers } from '@/lib/transfer-client';
import type { TransferRecord } from '@/app/transfer-history';
import { ChevronRight, ArrowRight, ExternalLink } from 'lucide-react';
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

// Generate contextual purpose labels based on recipient address or index
function getRecipientLabel(tx: TransferRecord, index: number): string {
  const labels = [
    'Personal Wallet',
    'Freelance Payment',
    'Family Support',
    'Business Expense',
    'Savings',
  ];
  return labels[index % labels.length];
}

function getRecipientAvatar(index: number) {
  const avatars = ['🧑‍💻', '💼', '🏡', '🏢', '🏦'];
  return avatars[index % avatars.length];
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
      <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F4F1E8]">Recent Transactions</h3>
            <p className="text-xs text-[#91AAA0] mt-0.5">Your latest activity on SwiftChain</p>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs font-semibold text-[#8BE3BB] hover:underline transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-14 rounded-xl bg-[#10231B] border border-[#294438]/40" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-[#FF8585]/10 border border-[#FF8585]/30 text-xs text-[#FF8585]">
            Failed to load transactions. Please check connection.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && recentList.length === 0 && (
          <div className="p-8 text-center space-y-2 rounded-xl bg-[#10231B]/40 border border-[#294438]/50">
            <p className="text-sm font-semibold text-[#F4F1E8]">No recent transactions</p>
            <p className="text-xs text-[#91AAA0] max-w-sm mx-auto">
              Send testnet ETH or USDC using the Send Money tab to track real-time blockchain settlements here.
            </p>
          </div>
        )}

        {/* Transactions Table / Responsive List */}
        {!isLoading && recentList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#294438]/80 text-[11px] font-semibold text-[#91AAA0] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Recipient</th>
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right sr-only">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#294438]/40 text-xs">
                {recentList.map((tx, idx) => {
                  const isUsdc = tx.assetSymbol === 'USDC';
                  const isConfirmed = tx.status === 'confirmed';
                  const isPending = tx.status === 'pending' || tx.status === 'awaiting signature';
                  const isFailed = tx.status === 'failed' || tx.status === 'rejected';
                  const { dateStr, timeStr } = formatDateParts(tx.createdAt);
                  const fiat = formatFiat(tx);
                  const label = getRecipientLabel(tx, idx);
                  const avatar = getRecipientAvatar(idx);

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTransfer(tx)}
                      className="hover:bg-[#10231B]/80 transition-colors cursor-pointer group"
                    >
                      {/* Recipient */}
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center text-sm shrink-0">
                            {avatar}
                          </div>
                          <div>
                            <p className="font-mono font-medium text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                              {truncateAddress(tx.recipientAddress)}
                            </p>
                            <p className="text-[11px] text-[#91AAA0] mt-0.5">{label}</p>
                          </div>
                        </div>
                      </td>

                      {/* Asset */}
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-1.5 font-medium text-[#F4F1E8]">
                          {isUsdc ? <UsdcIcon className="w-5 h-5 text-xs" /> : <EthereumIcon className="w-5 h-5 text-xs" />}
                          <span className="font-mono">{tx.assetSymbol}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 pr-3">
                        <div>
                          <p className="font-mono font-bold text-[#F4F1E8]">{tx.amount}</p>
                          <p className="font-mono text-[11px] text-[#91AAA0]">{fiat}</p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 pr-3">
                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#6ED6A8] bg-[#122c22] border border-[#254d3b]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                            Completed
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#F2C66D] bg-[#2e2615] border border-[#524320]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F2C66D] animate-pulse" />
                            Pending
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#FF8585] bg-[#331a1a] border border-[#592626]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF8585]" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 pr-3">
                        <div>
                          <p className="font-medium text-[#F4F1E8]">{dateStr}</p>
                          <p className="text-[11px] text-[#91AAA0]">{timeStr}</p>
                        </div>
                      </td>

                      {/* Chevron Action */}
                      <td className="py-3.5 text-right pl-2">
                        <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors ml-auto" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement Tracker Modal */}
      {selectedTransfer && (
        <SettlementTrackerModal
          transfer={selectedTransfer}
          isOpen={Boolean(selectedTransfer)}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </>
  );
}
