'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useConnection, WagmiProvider } from 'wagmi'
import { config } from '../config'
import { Connection } from './connection'
import { WalletOptions } from './wallet-options'
import { SendTransaction } from './send-transaction'

export function ConnectWallet() {
  const { isConnected } = useConnection()
  if (isConnected) return <Connection />
  return <WalletOptions />
}

export function WebProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SendTransaction />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

