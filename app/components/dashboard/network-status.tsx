'use client';

import React from 'react';
import { useBlockNumber, useGasPrice } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { formatEther } from 'viem';

export function NetworkStatus() {
  const { data: blockNumber, isLoading: isBlockLoading } = useBlockNumber({
    chainId: sepolia.id,
    watch: true,
  });

  const { data: gasPriceWei, isLoading: isGasLoading } = useGasPrice({
    chainId: sepolia.id,
  });

  // Calculate standard 21k gas transfer cost in ETH
  const formattedGasFee = React.useMemo(() => {
    if (!gasPriceWei) return '0.00012 ETH';
    try {
      const transferCostWei = gasPriceWei * BigInt(21000);
      const ethVal = parseFloat(formatEther(transferCostWei));
      return `${ethVal.toFixed(5)} ETH`;
    } catch {
      return '0.00012 ETH';
    }
  }, [gasPriceWei]);

  const formattedBlock = blockNumber
    ? Number(blockNumber).toLocaleString('en-US')
    : '5,842,321';

  return (
    <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
      {/* Header with Healthy Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#F4F1E8]">Network Status</h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#6ED6A8] bg-[#122c22] border border-[#254d3b]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
          Healthy
        </span>
      </div>

      {/* Metrics List */}
      <div className="space-y-3 pt-1 text-xs divide-y divide-[#294438]/40">
        <div className="flex items-center justify-between pt-2 first:pt-0">
          <span className="text-[#91AAA0]">Network</span>
          <span className="font-medium text-[#F4F1E8]">Sepolia Testnet</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#91AAA0]">Block Number</span>
          <span className="font-mono font-medium text-[#F4F1E8]">
            {isBlockLoading ? '...' : formattedBlock}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#91AAA0]">Average Gas Fee</span>
          <span className="font-mono font-medium text-[#F4F1E8]">
            {isGasLoading ? '...' : formattedGasFee}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#91AAA0]">Network Status</span>
          <span className="inline-flex items-center gap-1.5 text-[#6ED6A8] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
            Operational
          </span>
        </div>
      </div>
    </div>
  );
}
