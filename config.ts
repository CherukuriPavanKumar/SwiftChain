import { http, createConfig, fallback } from 'wagmi'
import { base, mainnet, sepolia } from 'wagmi/chains'
import { injected, safe, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9ce22127f80c6d5cd5be5302f849bdb1'
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

export const config = createConfig({
  ssr: true,
  chains: [mainnet, base, sepolia],
  connectors: [
    injected({ target: 'metaMask' }),
    injected(),
    walletConnect({ projectId }),
    safe(),
  ],
  transports: {
    [mainnet.id]: fallback([
      ...(alchemyKey ? [http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)] : []),
      http(),
    ]),
    [base.id]: fallback([
      ...(alchemyKey ? [http(`https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`)] : []),
      http(),
    ]),
    [sepolia.id]: fallback([
      // Primary: Alchemy — private key, high rate limits, reliable
      ...(alchemyKey ? [http(`https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`)] : []),
      // Fallback 1: Tenderly public (works from this machine)
      http('https://gateway.tenderly.co/public/sepolia'),
      // Fallback 2: thirdweb public
      http('https://11155111.rpc.thirdweb.com'),
      // Last resort: viem default
      http(),
    ]),
  },
})