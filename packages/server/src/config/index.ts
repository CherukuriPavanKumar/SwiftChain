import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: [
    'http://localhost:3000',
    'https://swiftchain.vercel.app',
    'https://swiftchain-client.vercel.app',
    'https://swiftchain.netlify.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  api: {
    coingecko: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
    timeout: 10000
  },
  blockchain: {
    sepoliaRpc: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    privateKey: process.env.PRIVATE_KEY,
    usdtContract: process.env.USDT_CONTRACT_ADDRESS || '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple'
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};