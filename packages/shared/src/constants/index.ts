export const NETWORKS = {
  SEPOLIA: {
    chainId: '0xaa36a7',
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    }
  }
} as const;

export const CONTRACTS = {
  USDT: {
    address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    decimals: 6,
    symbol: 'USDT'
  }
} as const;

export const API_ENDPOINTS = {
  COINGECKO: 'https://api.coingecko.com/api/v3',
  HEALTH: '/api/health',
  CONVERT: '/api/convert',
  CRYPTO: '/api/crypto'
} as const;

export const FEES = {
  SWIFTCHAIN_PERCENTAGE: 0.01, // 1%
  NETWORK_USDT: 0.5,
  NETWORK_ETH: 0.001,
  WITHDRAWAL_PERCENTAGE: 0.005 // 0.5%
} as const;

export const FALLBACK_RATES = {
  USDT: 83, // 1 USDT = 83 INR
  ETH: 150000 // 1 ETH = 150,000 INR
} as const;