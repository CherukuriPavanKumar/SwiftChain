'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { EthereumIcon, UsdcIcon } from './token-icons';

interface SupportedAssetsProps {
  onSelectAsset?: (symbol: 'ETH' | 'USDC') => void;
}

export function SupportedAssets({ onSelectAsset }: SupportedAssetsProps) {
  return (
    <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-[#F4F1E8]">Supported Assets</h3>
        <p className="text-xs text-[#91AAA0] mt-0.5">Assets you can send and receive</p>
      </div>

      <div className="space-y-2.5">
        {/* Ethereum */}
        <button
          type="button"
          onClick={() => onSelectAsset?.('ETH')}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#10231B] border border-[#294438]/70 hover:border-[#8BE3BB]/40 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <EthereumIcon className="w-8 h-8" />
            <div>
              <p className="text-sm font-semibold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                Ethereum
              </p>
              <p className="text-[11px] font-mono text-[#91AAA0]">ETH</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors" />
        </button>

        {/* USD Coin */}
        <button
          type="button"
          onClick={() => onSelectAsset?.('USDC')}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#10231B] border border-[#294438]/70 hover:border-[#8BE3BB]/40 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <UsdcIcon className="w-8 h-8" />
            <div>
              <p className="text-sm font-semibold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors leading-tight">
                USD Coin
              </p>
              <p className="text-[11px] font-mono text-[#91AAA0]">USDC</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors" />
        </button>
      </div>
    </div>
  );
}
