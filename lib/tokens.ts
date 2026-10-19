import { sepolia } from 'wagmi/chains';

export type SupportedAssetSymbol = 'ETH' | 'USDC';

export interface TokenConfig {
  symbol: SupportedAssetSymbol;
  name: string;
  decimals: number;
  isNative: boolean;
  contractAddress?: `0x${string}`;
  chainId: number;
  icon: string;
  faucetUrl?: string;
}

/**
 * Centralized, typed token configuration for SwiftChain V2.
 * Verified official Circle USDC testnet contract on Ethereum Sepolia:
 * Source: https://developers.circle.com/stablecoins/usdc-contract-addresses.md
 */
export const SUPPORTED_TOKENS: Record<SupportedAssetSymbol, TokenConfig> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
    chainId: sepolia.id,
    icon: 'Ξ',
    faucetUrl: 'https://sepoliafaucet.com/',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6, // Crucial: Circle USDC uses 6 decimals across all EVM deployments
    isNative: false,
    // Officially documented Circle USDC testnet contract on Ethereum Sepolia
    contractAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    chainId: sepolia.id,
    icon: '$',
    faucetUrl: 'https://faucet.circle.com/',
  },
};

/**
 * Standard ERC-20 ABI fragments required for token balance queries and transfers.
 * Uses exact minimal signatures to keep bundle size lightweight.
 */
export const ERC20_MINIMAL_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
