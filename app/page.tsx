import type { Metadata } from 'next';
import LandingClient from './landing/landing-client';

export const metadata: Metadata = {
  title: 'SwiftChain — Global Payments, Reimagined',
  description:
    'SwiftChain is a blockchain-powered remittance prototype exploring a simpler, more transparent way to move money across borders using stablecoins, with transparent quotes and on-chain transaction visibility.',
};

/**
 * Root route — always serves the public landing page.
 * Auth-aware routing is handled in proxy.ts:
 *   - Authenticated users visiting "/" are redirected to "/app"
 *   - Unauthenticated users visiting "/app/*" are redirected to "/"
 */
export default function Home() {
  return <LandingClient />;
}
