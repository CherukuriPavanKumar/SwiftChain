'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { EthereumIcon, UsdcIcon } from './token-icons';

interface SupportedAssetsProps {
  onSelectAsset?: (symbol: 'ETH' | 'USDC') => void;
}

export function SupportedAssets({ onSelectAsset }: SupportedAssetsProps) {
  return (
    <div className="rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 space-y-3.5 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-[#F4F1E8]">Supported Assets</h3>
        <p className="text-xs text-[#a6b8b0] mt-0.5">Assets enabled for cross-border transfer</p>
      </div>

      <div className="space-y-2">
        {/* Ethereum */}
        <button
          type="button"
          onClick={() => onSelectAsset?.('ETH')}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#071410] border border-[#233a30] hover:border-[#335345] transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <EthereumIcon className="w-7 h-7" />
            <div>
              <p className="text-sm font-bold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                Ethereum
              </p>
              <p className="text-xs font-mono text-[#7a9187]">ETH · Sepolia native</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#7a9187] group-hover:text-[#8BE3BB] transition-colors stroke-[1.5]" />
        </button>

        {/* USD Coin */}
        <button
          type="button"
          onClick={() => onSelectAsset?.('USDC')}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#071410] border border-[#233a30] hover:border-[#335345] transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <UsdcIcon className="w-7 h-7" />
            <div>
              <p className="text-sm font-bold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                USD Coin
              </p>
              <p className="text-xs font-mono text-[#7a9187]">USDC · Official testnet ERC-20</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#7a9187] group-hover:text-[#8BE3BB] transition-colors stroke-[1.5]" />
        </button>
      </div>
    </div>
  );
}
