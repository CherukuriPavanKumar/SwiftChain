'use client';

import { useEffect } from 'react';
import { formatEther, formatUnits } from 'viem';
import { useConnection, useBalance, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { SUPPORTED_TOKENS, ERC20_MINIMAL_ABI } from '@/lib/tokens';
import { formatTokenBalance } from '@/lib/format';

export interface TokenBalanceInfo {
  ethRaw: bigint;
  ethExactFormatted: string;
  ethFormatted: string;
  isEthLoading: boolean;
  isEthError: boolean;
  usdcRaw: bigint;
  usdcFormatted: string;
  usdcDisplayFormatted: string;
  isUsdcLoading: boolean;
  isUsdcError: boolean;
  refetchAll: () => Promise<void>;
}

export function useTokenBalances(): TokenBalanceInfo {
  const { address, chainId } = useConnection();

  // 1. Native Sepolia ETH balance (18 decimals)
  const {
    data: ethBalance,
    isLoading: isEthLoading,
    isError: isEthError,
    refetch: refetchEth,
  } = useBalance({
    address,
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  });

  // 2. Circle Sepolia USDC balance (6 decimals)
  const {
    data: usdcRawBalance,
    isLoading: isUsdcLoading,
    isError: isUsdcError,
    refetch: refetchUsdc,
  } = useReadContract({
    address: SUPPORTED_TOKENS.USDC.contractAddress,
    abi: ERC20_MINIMAL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  });

  // Refresh balances cleanly when wallet address or active chain switches
  useEffect(() => {
    if (address) {
      refetchEth();
      refetchUsdc();
    }
  }, [address, chainId, refetchEth, refetchUsdc]);

  const ethRaw = ethBalance?.value ?? BigInt(0);
  const ethExactFormatted = formatEther(ethRaw);
  const ethFormatted = formatTokenBalance(ethRaw, SUPPORTED_TOKENS.ETH.decimals, 'ETH', {
    includeSymbol: false,
  });

  const usdcRaw = (usdcRawBalance as bigint) ?? BigInt(0);
  const usdcFormatted = formatUnits(usdcRaw, SUPPORTED_TOKENS.USDC.decimals);
  const usdcDisplayFormatted = formatTokenBalance(usdcRaw, SUPPORTED_TOKENS.USDC.decimals, 'USDC', {
    includeSymbol: false,
  });

  async function refetchAll() {
    await Promise.all([refetchEth(), refetchUsdc()]);
  }

  return {
    ethRaw,
    ethExactFormatted,
    ethFormatted,
    isEthLoading,
    isEthError,
    usdcRaw,
    usdcFormatted,
    usdcDisplayFormatted,
    isUsdcLoading,
    isUsdcError,
    refetchAll,
  };
}
