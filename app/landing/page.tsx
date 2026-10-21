import type { Metadata } from 'next';
import LandingClient from './landing-client';

export const metadata: Metadata = {
  title: 'SwiftChain — Global Payments, Reimagined',
  description:
    'SwiftChain is a blockchain-powered remittance prototype exploring a simpler, more transparent way to move money across borders using stablecoins, with transparent quotes and on-chain transaction visibility.',
  openGraph: {
    title: 'SwiftChain — Global Payments, Reimagined',
    description:
      'Explore a simpler way to move money across borders using stablecoins and on-chain transaction visibility.',
    type: 'website',
  },
};

export default function LandingPage() {
  return <LandingClient />;
}
