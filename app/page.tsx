'use client'

import { ConnectWallet } from "@/wagmi/web_provider"

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>SwiftChain</h1>
      <ConnectWallet />
    </main>
  )
}
