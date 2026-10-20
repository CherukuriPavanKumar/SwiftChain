import { http, createConfig } from 'wagmi'
import { base, mainnet, sepolia } from 'wagmi/chains'
import { injected, safe, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9ce22127f80c6d5cd5be5302f849bdb1'

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
    [mainnet.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
})