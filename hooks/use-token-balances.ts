'use client';

import { formatEther, formatUnits } from 'viem';
import { useConnection, useBalance, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { SUPPORTED_TOKENS, ERC20_MINIMAL_ABI } from '@/lib/tokens';

export interface TokenBalanceInfo {
  ethRaw: bigint;
  ethFormatted: string;
  isEthLoading: boolean;
  usdcRaw: bigint;
  usdcFormatted: string;
  isUsdcLoading: boolean;
  refetchAll: () => Promise<void>;
}

export function useTokenBalances(): TokenBalanceInfo {
  const { address } = useConnection();

  // 1. Native Sepolia ETH balance (18 decimals)
  const {
    data: ethBalance,
    isLoading: isEthLoading,
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
    refetch: refetchUsdc,
  } = useReadContract({
    address: SUPPORTED_TOKENS.USDC.contractAddress,
    abi: ERC20_MINIMAL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: Boolean(address) },
  });

  const ethRaw = ethBalance?.value ?? BigInt(0);
  const ethFormatted = ethBalance ? parseFloat(formatEther(ethRaw)).toFixed(4) : '0.0000';

  const usdcRaw = (usdcRawBalance as bigint) ?? BigInt(0);
  const usdcFormatted = formatUnits(usdcRaw, SUPPORTED_TOKENS.USDC.decimals);

  async function refetchAll() {
    await Promise.all([refetchEth(), refetchUsdc()]);
  }

  return {
    ethRaw,
    ethFormatted,
    isEthLoading,
    usdcRaw,
    usdcFormatted,
    isUsdcLoading,
    refetchAll,
  };
}
