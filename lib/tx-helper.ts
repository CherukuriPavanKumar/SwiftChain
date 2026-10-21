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
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/**
 * Pre-computes gas limit and EIP-1559 fee parameters using our resilient RPC pool.
 * This ensures neither Viem nor MetaMask needs to query rate-limited default RPCs
 * (like Infura on Sepolia) for eth_getBlockByNumber or eth_estimateGas.
 */
export async function getSepoliaGasAndFees(params: {
  account: `0x${string}`;
  to: `0x${string}`;
  value?: bigint;
  data?: `0x${string}`;
  isErc20?: boolean;
}): Promise<GasFeeParams> {
  try {
    const [fees, gasEst] = await Promise.all([
      sepoliaPublicClient.estimateFeesPerGas().catch(() => null),
      sepoliaPublicClient
        .estimateGas({
          account: params.account,
          to: params.to,
          value: params.value,
          data: params.data,
        })
        .catch(() => null),
    ]);

    // Use estimated gas with a 25% safety margin, or a sensible fallback
    const fallbackGas = params.isErc20 ? BigInt(65000) : BigInt(21000);
    const gas = gasEst ? (gasEst * BigInt(125)) / BigInt(100) : fallbackGas;

    // Default 1.5 gwei priority and 3 gwei max fee if RPC fee estimate fails
    const defaultPriority = BigInt(1500000000);
    const defaultMaxFee = BigInt(3000000000);

    const maxPriorityFeePerGas = fees?.maxPriorityFeePerGas ?? defaultPriority;
    const maxFeePerGas = fees?.maxFeePerGas
      ? (fees.maxFeePerGas * BigInt(130)) / BigInt(100)
      : defaultMaxFee;

    return {
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  } catch (err) {
    console.warn('Using default gas parameters for Sepolia transfer:', err);
    return {
      gas: params.isErc20 ? BigInt(65000) : BigInt(21000),
      maxFeePerGas: BigInt(3000000000),
      maxPriorityFeePerGas: BigInt(1500000000),
    };
  }
}
