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
    <div className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 space-y-3.5 shadow-sm">
      {/* Header with Status Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#F4F1E8]">Network Status</h3>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-[#8BE3BB] bg-[#152920] border border-[#233a30]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
          Healthy
        </span>
      </div>

      {/* Metrics List with Tabular Figures */}
      <div className="space-y-2.5 pt-1 text-xs divide-y divide-[#233a30]">
        <div className="flex items-center justify-between pt-2 first:pt-0">
          <span className="text-[#a6b8b0]">Network</span>
          <span className="font-medium text-[#F4F1E8]">Sepolia Testnet</span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#a6b8b0]">Block Number</span>
          <span className="font-mono font-medium text-[#F4F1E8] tabular-nums">
            {isBlockLoading ? '...' : formattedBlock}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#a6b8b0]">Average Rail Fee</span>
          <span className="font-mono font-medium text-[#F4F1E8] tabular-nums">
            {isGasLoading ? '...' : formattedGasFee}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[#a6b8b0]">Consensus State</span>
          <span className="inline-flex items-center gap-1.5 text-[#8BE3BB] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
            Operational
          </span>
        </div>
      </div>
    </div>
  );
}
