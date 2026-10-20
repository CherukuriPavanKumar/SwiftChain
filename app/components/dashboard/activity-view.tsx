'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useConnection } from 'wagmi';
import { fetchTransfers } from '@/lib/transfer-client';
import type { TransferRecord } from '@/app/transfer-history';
import { useEthPrice } from '@/app/components/eth-price-ticker';
import SettlementTrackerModal, { type SettlementTrackerData } from '@/app/components/settlement-tracker-modal';
import { EthereumIcon, UsdcIcon } from './token-icons';
import {
  Search,
  ChevronDown,
  Calendar,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  X,
  RefreshCw,
  AlertCircle,
  Inbox,
  Send,
} from 'lucide-react';

interface ActivityViewProps {
  onNavigateToSend?: () => void;
}

type StatusFilterType = 'all' | 'completed' | 'pending' | 'failed';
type AssetFilterType = 'all' | 'ETH' | 'USDC';
type DateFilterType = 'all' | '24h' | '7d' | '30d';

const ITEMS_PER_PAGE = 10;

function truncateAddress(addr: string | null | undefined): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ActivityView({ onNavigateToSend }: ActivityViewProps) {
  const { address } = useConnection();
  const { data: marketData } = useEthPrice();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [assetFilter, setAssetFilter] = useState<AssetFilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown menus open/close state
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  // Modal inspection state
  const [selectedTransfer, setSelectedTransfer] = useState<SettlementTrackerData | null>(null);

  // Dropdown click outside listeners
  const statusRef = useRef<HTMLDivElement>(null);
  const assetRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (assetRef.current && !assetRef.current.contains(e.target as Node)) {
        setAssetDropdownOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real transfers from DB API
  const {
    data: transfers,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<TransferRecord[]>({
    queryKey: ['transfers', address],
    queryFn: () => fetchTransfers(address),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActive = data?.some(
        (t) =>
          t.status === 'pending' ||
          t.status === 'awaiting signature' ||
          t.payoutStatus === 'simulated_pending'
      );
      return hasActive ? 2500 : 8000;
    },
  });

  // Calculate live INR fiat valuation
  function formatFiat(tx: TransferRecord): string {
    if (tx.inrSourceAmount) {
      const num = parseFloat(tx.inrSourceAmount);
      if (!isNaN(num) && num > 0) {
        return `≈ ₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    const tokenAmount = parseFloat(tx.amount) || 0;
    if (tx.assetSymbol === 'USDC') {
      const rate = marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88;
      return `≈ ₹${(tokenAmount * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const rate = marketData?.ethereum?.inr ?? marketData?.inr ?? 230000;
    return `≈ ₹${(tokenAmount * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Format date and time
  function formatDateTimeParts(isoDate: string) {
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

  // Combined Multi-Filter Pipeline
  const filteredTransfers = useMemo(() => {
    if (!transfers) return [];

    const now = Date.now();
    const query = searchQuery.trim().toLowerCase();

    return transfers.filter((tx) => {
      // 1. Text Search: tx hash, recipient, or sender
      if (query) {
        const matchesHash = tx.transactionHash?.toLowerCase().includes(query) ?? false;
        const matchesRecipient = tx.recipientAddress?.toLowerCase().includes(query) ?? false;
        const matchesSender = tx.senderAddress?.toLowerCase().includes(query) ?? false;
        if (!matchesHash && !matchesRecipient && !matchesSender) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed') {
          if (tx.status !== 'confirmed') return false;
        } else if (statusFilter === 'pending') {
          if (
            tx.status !== 'pending' &&
            tx.status !== 'awaiting signature' &&
            tx.payoutStatus !== 'simulated_pending'
          ) {
            return false;
          }
        } else if (statusFilter === 'failed') {
          if (tx.status !== 'failed' && tx.status !== 'rejected') {
            return false;
          }
        }
      }

      // 3. Asset Filter
      if (assetFilter !== 'all') {
        if (tx.assetSymbol.toUpperCase() !== assetFilter) {
          return false;
        }
      }

      // 4. Date Filter
      if (dateFilter !== 'all') {
        const txTime = new Date(tx.createdAt).getTime();
        if (dateFilter === '24h' && now - txTime > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '7d' && now - txTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30d' && now - txTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [transfers, searchQuery, statusFilter, assetFilter, dateFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, assetFilter, dateFilter]);

  // Pagination bounds
  const totalItems = filteredTransfers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentSlice = useMemo(() => {
    return filteredTransfers.slice(startIndex, endIndex);
  }, [filteredTransfers, startIndex, endIndex]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== 'all' ||
    assetFilter !== 'all' ||
    dateFilter !== 'all';

  function handleResetFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setAssetFilter('all');
    setDateFilter('all');
    setCurrentPage(1);
  }

  return (
    <div className="pt-6 space-y-6 animate-in fade-in duration-150">
      {/* ================= 1. SEARCH & FILTERS ROW ================= */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Search Input Box */}
        <div className="flex-1 relative flex items-center rounded-xl bg-[#10231B] border border-[#294438] px-3.5 py-2.5 focus-within:border-[#8BE3BB]/50 transition-colors shadow-xs">
          <Search className="w-4 h-4 text-[#91AAA0] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or transaction hash..."
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-[#F4F1E8] placeholder:text-[#91AAA0]/60 pl-2.5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#91AAA0] hover:text-[#F4F1E8] transition-colors p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns Row: Status, Asset, Date */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Dropdown 1: All status */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => {
                setStatusDropdownOpen((prev) => !prev);
                setAssetDropdownOpen(false);
                setDateDropdownOpen(false);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-medium text-[#F4F1E8] flex items-center gap-2 hover:border-[#8BE3BB]/40 transition-colors shadow-xs"
            >
              <span>
                {statusFilter === 'all'
                  ? 'All status'
                  : statusFilter === 'completed'
                  ? 'Completed'
                  : statusFilter === 'pending'
                  ? 'Pending'
                  : 'Failed'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#91AAA0]" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-36 rounded-xl bg-[#10231B] border border-[#294438] p-1.5 shadow-xl z-30 space-y-1">
                {[
                  { id: 'all', label: 'All status' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'failed', label: 'Failed' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(item.id as StatusFilterType);
                      setStatusDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === item.id
                        ? 'bg-[#183126] text-[#8BE3BB]'
                        : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown 2: All assets */}
          <div className="relative" ref={assetRef}>
            <button
              type="button"
              onClick={() => {
                setAssetDropdownOpen((prev) => !prev);
                setStatusDropdownOpen(false);
                setDateDropdownOpen(false);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-medium text-[#F4F1E8] flex items-center gap-2 hover:border-[#8BE3BB]/40 transition-colors shadow-xs"
            >
              <span>
                {assetFilter === 'all' ? 'All assets' : assetFilter}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#91AAA0]" />
            </button>

            {assetDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-36 rounded-xl bg-[#10231B] border border-[#294438] p-1.5 shadow-xl z-30 space-y-1">
                {[
                  { id: 'all', label: 'All assets' },
                  { id: 'ETH', label: 'ETH' },
                  { id: 'USDC', label: 'USDC' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAssetFilter(item.id as AssetFilterType);
                      setAssetDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      assetFilter === item.id
                        ? 'bg-[#183126] text-[#8BE3BB]'
                        : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown 3: All time */}
          <div className="relative" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setDateDropdownOpen((prev) => !prev);
                setStatusDropdownOpen(false);
                setAssetDropdownOpen(false);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-medium text-[#F4F1E8] flex items-center gap-2 hover:border-[#8BE3BB]/40 transition-colors shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#91AAA0]" />
              <span>
                {dateFilter === 'all'
                  ? 'All time'
                  : dateFilter === '24h'
                  ? 'Last 24 hours'
                  : dateFilter === '7d'
                  ? 'Last 7 days'
                  : 'Last 30 days'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#91AAA0]" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-40 rounded-xl bg-[#10231B] border border-[#294438] p-1.5 shadow-xl z-30 space-y-1">
                {[
                  { id: 'all', label: 'All time' },
                  { id: '24h', label: 'Last 24 hours' },
                  { id: '7d', label: 'Last 7 days' },
                  { id: '30d', label: 'Last 30 days' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDateFilter(item.id as DateFilterType);
                      setDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      dateFilter === item.id
                        ? 'bg-[#183126] text-[#8BE3BB]'
                        : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. MAIN TRANSACTION HISTORY TABLE ================= */}
      <div className="rounded-2xl bg-[#183126] border border-[#294438] shadow-sm overflow-hidden">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-[#10231B] rounded-lg animate-pulse w-1/4" />
            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-[#10231B]/60 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && (
          <div className="p-10 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-[#FF8585] mx-auto" />
            <p className="text-sm font-semibold text-[#F4F1E8]">Unable to load transfer history</p>
            <p className="text-xs text-[#91AAA0] max-w-sm mx-auto">
              {error instanceof Error ? error.message : 'Please check your connection and try again.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#8BE3BB] hover:border-[#8BE3BB]/50 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty History State (Zero transactions in DB) */}
        {!isLoading && !isError && transfers?.length === 0 && (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#10231B] border border-[#294438] flex items-center justify-center mx-auto text-[#91AAA0]">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#F4F1E8]">No transactions recorded yet</p>
              <p className="text-xs text-[#91AAA0] mt-1 max-w-sm mx-auto">
                Your transfers and cross-border settlements on Ethereum Sepolia testnet will appear here.
              </p>
            </div>
            {onNavigateToSend && (
              <button
                type="button"
                onClick={onNavigateToSend}
                className="px-4 py-2.5 rounded-xl bg-[#1e3d30] border border-[#294438] text-xs font-bold text-[#8BE3BB] hover:bg-[#254d3b] transition-all inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Money →</span>
              </button>
            )}
          </div>
        )}

        {/* No Results from Filter State */}
        {!isLoading && !isError && (transfers?.length ?? 0) > 0 && currentSlice.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <Search className="w-8 h-8 text-[#91AAA0] mx-auto opacity-60" />
            <p className="text-sm font-semibold text-[#F4F1E8]">No transactions match your filters</p>
            <p className="text-xs text-[#91AAA0]">
              Try adjusting your search query, status, asset, or date range.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#8BE3BB] hover:border-[#8BE3BB]/50 transition-colors"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Table View (Desktop & Tablet) */}
        {!isLoading && !isError && currentSlice.length > 0 && (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#294438] text-[11px] font-semibold text-[#91AAA0] uppercase tracking-wider">
                    <th className="py-4 px-6 font-medium">Transaction</th>
                    <th className="py-4 px-6 font-medium">Asset</th>
                    <th className="py-4 px-6 font-medium">Amount</th>
                    <th className="py-4 px-6 font-medium">Status</th>
                    <th className="py-4 px-6 font-medium">Date</th>
                    <th className="py-4 px-4 font-medium text-right" aria-label="Details" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#294438]/50 text-xs">
                  {currentSlice.map((tx) => {
                    const isOutgoing = !address || tx.senderAddress.toLowerCase() === address.toLowerCase();
                    const { dateStr, timeStr } = formatDateTimeParts(tx.createdAt);

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTransfer(tx as SettlementTrackerData)}
                        className="hover:bg-[#10231B]/40 transition-colors cursor-pointer group"
                      >
                        {/* 1. Transaction Column (Direction Icon + Sent/Received Label + Hash) */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-8 h-8 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center text-[#8BE3BB] shrink-0">
                              {isOutgoing ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#F4F1E8]">
                                {isOutgoing
                                  ? `Sent to ${truncateAddress(tx.recipientAddress)}`
                                  : `Received from ${truncateAddress(tx.senderAddress)}`}
                              </p>
                              <p className="text-[11px] font-mono text-[#91AAA0] mt-0.5">
                                {truncateAddress(tx.transactionHash || '')}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Asset Column (Token Icon + Symbol) */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            {tx.assetSymbol === 'USDC' ? (
                              <UsdcIcon className="w-6 h-6" />
                            ) : (
                              <EthereumIcon className="w-6 h-6" />
                            )}
                            <span className="font-mono text-xs font-bold text-[#F4F1E8]">
                              {tx.assetSymbol}
                            </span>
                          </div>
                        </td>

                        {/* 3. Amount Column (Token Amount + Fiat Equivalent) */}
                        <td className="py-3.5 px-6">
                          <div>
                            <p className="font-mono text-xs font-bold text-[#F4F1E8] tabular-nums">
                              {tx.amount}
                            </p>
                            <p className="font-mono text-[11px] text-[#91AAA0] mt-0.5">
                              {formatFiat(tx)}
                            </p>
                          </div>
                        </td>

                        {/* 4. Status Column (Semantic Badges) */}
                        <td className="py-3.5 px-6">
                          {tx.status === 'confirmed' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1e3d30] border border-[#294438] text-[#6ED6A8]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                              Completed
                            </span>
                          ) : tx.status === 'failed' || tx.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#331818] border border-[#522929] text-[#FF8585]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8585]" />
                              Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#332614] border border-[#523d1d] text-[#F2C66D]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F2C66D]" />
                              Pending
                            </span>
                          )}
                        </td>

                        {/* 5. Date Column (Date + Time) */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <p className="text-xs font-medium text-[#F4F1E8]">{dateStr}</p>
                          <p className="text-[11px] text-[#91AAA0] mt-0.5">{timeStr}</p>
                        </td>

                        {/* 6. Details Affordance (Chevron Right) */}
                        <td className="py-3.5 px-4 text-right">
                          <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] group-hover:translate-x-0.5 transition-all inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Structured Transaction Cards */}
            <div className="sm:hidden divide-y divide-[#294438]/50">
              {currentSlice.map((tx) => {
                const isOutgoing = !address || tx.senderAddress.toLowerCase() === address.toLowerCase();
                const { dateStr, timeStr } = formatDateTimeParts(tx.createdAt);

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTransfer(tx as SettlementTrackerData)}
                    className="p-4 space-y-2.5 hover:bg-[#10231B]/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center text-[#8BE3BB] shrink-0">
                          {isOutgoing ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#F4F1E8]">
                            {isOutgoing
                              ? `Sent to ${truncateAddress(tx.recipientAddress)}`
                              : `Received from ${truncateAddress(tx.senderAddress)}`}
                          </p>
                          <p className="text-[10px] font-mono text-[#91AAA0]">
                            {truncateAddress(tx.transactionHash || '')}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {tx.status === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e3d30] text-[#6ED6A8]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                          Completed
                        </span>
                      ) : tx.status === 'failed' || tx.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#331818] text-[#FF8585]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF8585]" />
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#332614] text-[#F2C66D]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F2C66D]" />
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        {tx.assetSymbol === 'USDC' ? (
                          <UsdcIcon className="w-5 h-5" />
                        ) : (
                          <EthereumIcon className="w-5 h-5" />
                        )}
                        <span className="font-mono font-bold text-[#F4F1E8]">
                          {tx.amount} {tx.assetSymbol}
                        </span>
                        <span className="text-[11px] text-[#91AAA0] font-mono">
                          ({formatFiat(tx)})
                        </span>
                      </div>

                      <div className="text-right text-[11px] text-[#91AAA0]">
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer: Range & Pagination Controls */}
            <div className="border-t border-[#294438] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p className="text-[#91AAA0]">
                Showing {totalItems > 0 ? startIndex + 1 : 0}–{endIndex} of {totalItems} transactions
              </p>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1.5">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg bg-[#10231B] border border-[#294438] text-[#91AAA0] hover:text-[#F4F1E8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#6ED6A8] text-[#071410] font-bold shadow-xs'
                        : 'bg-[#10231B] border border-[#294438] text-[#91AAA0] hover:text-[#F4F1E8]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg bg-[#10231B] border border-[#294438] text-[#91AAA0] hover:text-[#F4F1E8] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Real-time Settlement Tracker Modal Affordance */}
      {selectedTransfer && (
        <SettlementTrackerModal
          transfer={selectedTransfer}
          isOpen={Boolean(selectedTransfer)}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </div>
  );
}
