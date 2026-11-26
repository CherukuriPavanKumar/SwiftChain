'use client';

import React from 'react';
import { useBlockNumber, useGasPrice } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { DEFAULT_ETH_TRANSFER_GAS_UNITS } from '@/lib/quote';
import { formatGasFeeEth } from '@/lib/format';

export function NetworkStatus() {
  const {
    data: blockNumber,
    isLoading: isBlockLoading,
    isError: isBlockError,
  } = useBlockNumber({
    chainId: sepolia.id,
    watch: true,
  });

  const {
    data: gasPriceWei,
    isLoading: isGasLoading,
    isError: isGasError,
  } = useGasPrice({
    chainId: sepolia.id,
  });

  const gasFee = React.useMemo(() => {
    if (!gasPriceWei) return formatGasFeeEth(null);
    return formatGasFeeEth(gasPriceWei * DEFAULT_ETH_TRANSFER_GAS_UNITS, 'wei');
  }, [gasPriceWei]);

  const formattedBlock = blockNumber
    ? Number(blockNumber).toLocaleString('en-US')
    : isBlockError
      ? 'Unavailable'
      : '—';

  const rpcReachable = Boolean(blockNumber && !isBlockError);
  const statusLabel = isBlockLoading
    ? 'Checking'
    : rpcReachable
      ? 'RPC reachable'
      : 'RPC unavailable';

  return (
    <div className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 space-y-3.5 shadow-sm">
      {/* Header with Status Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#F4F1E8]">Network Status</h3>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
            isBlockLoading
              ? 'text-[#a6b8b0] bg-[#152920] border-[#233a30]'
              : rpcReachable
                ? 'text-[#8BE3BB] bg-[#152920] border-[#233a30]'
                : 'text-[#F2C66D] bg-[#231e13] border-[#3d331d]'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isBlockLoading
                ? 'bg-[#7a9187]'
                : rpcReachable
                  ? 'bg-[#8BE3BB]'
                  : 'bg-[#F2C66D]'
            }`}
          />
          {statusLabel}
        </span>
      </div>

      {/* Metrics List with Tabular Figures */}
      <div className="space-y-2.5 pt-1 text-xs divide-y divide-[#233a30]">
        <div className="flex items-center justify-between pt-2 first:pt-0">
          <span className="text-[#a6b8b0]">Network</span>
          <span className="font-medium text-[#F4F1E8]">Sepolia Testnet</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#a6b8b0]">Latest Block</span>
          <span className="font-mono font-medium text-[#F4F1E8] tabular-nums">
            {isBlockLoading ? 'Checking…' : formattedBlock}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#a6b8b0]">Est. Base Transfer Fee</span>
          <span className="font-mono font-medium text-[#F4F1E8] tabular-nums">
            {isGasLoading ? 'Checking…' : isGasError ? 'Unavailable' : gasFee.formatted}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#a6b8b0]">RPC Sync</span>
          <span className="font-medium text-[#F4F1E8]">
            {isBlockLoading
              ? 'Syncing…'
              : rpcReachable
                ? 'Receiving blocks'
                : 'Unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}
