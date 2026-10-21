import { createPublicClient, http, fallback } from 'viem';
import { sepolia } from 'viem/chains';

// Public client backed by fast, resilient non-Infura public RPCs
export const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http('https://11155111.rpc.thirdweb.com'),
    http('https://gateway.tenderly.co/public/sepolia'),
    http('https://ethereum-sepolia.publicnode.com'),
  ]),
});

export interface GasFeeParams {
  gas?: bigint;
  // Legacy type-0 gas price (avoids EIP-1559 "not supported" errors from MetaMask)
  gasPrice?: bigint;
}

/**
 * Pre-computes gas limit and a legacy gasPrice using our resilient RPC pool.
 *
 * We intentionally use the legacy gasPrice approach (type-0 tx) rather than
 * EIP-1559 maxFeePerGas/maxPriorityFeePerGas because:
 * 1. Some Sepolia RPC endpoints return unrealistically tiny EIP-1559 fee values
 *    that MetaMask rejects with "network does not support EIP-1559".
 * 2. Legacy gasPrice is simpler and avoids eth_getBlockByNumber calls that
 *    Infura rate-limits on Sepolia.
 */
export async function getSepoliaGasAndFees(params: {
  account: `0x${string}`;
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
  isErc20?: boolean;
}): Promise<GasFeeParams> {
  // Minimum floor: 1.5 gwei for gas price on Sepolia
  const FLOOR_GAS_PRICE = BigInt(1_500_000_000);

  try {
    const [gasPriceResult, gasEst] = await Promise.all([
      sepoliaPublicClient.getGasPrice().catch(() => null),
      sepoliaPublicClient
        .estimateGas({
          account: params.account,
          to: params.to,
          value: params.value,
          data: params.data,
        })
        .catch(() => null),
    ]);

    // Apply a 25% safety buffer to gas estimate, fallback to standard units
    const fallbackGas = params.isErc20 ? BigInt(65000) : BigInt(21000);
    const gas = gasEst ? (gasEst * BigInt(125)) / BigInt(100) : fallbackGas;

    // Apply a 20% buffer to gas price, enforce minimum floor
    let gasPrice = gasPriceResult
      ? (gasPriceResult * BigInt(120)) / BigInt(100)
      : FLOOR_GAS_PRICE;

    if (gasPrice < FLOOR_GAS_PRICE) {
      gasPrice = FLOOR_GAS_PRICE;
    }

    return { gas, gasPrice };
  } catch (err) {
    console.warn('Using default gas parameters for Sepolia transfer:', err);
    return {
      gas: params.isErc20 ? BigInt(65000) : BigInt(21000),
      gasPrice: FLOOR_GAS_PRICE,
    };
  }
}
