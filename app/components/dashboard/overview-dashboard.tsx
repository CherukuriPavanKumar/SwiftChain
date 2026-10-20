'use client';

import React, { useState } from 'react';
import { Sidebar, type DashboardTab } from './sidebar';
import { Header } from './header';
import { PortfolioSummary } from './portfolio-summary';
import { RecentTransactions } from './recent-transactions';
import { SupportedAssets } from './supported-assets';
import { NetworkStatus } from './network-status';
import { ConnectWallet } from '@/wagmi/web_provider';
import InrEthCalculator from '@/app/components/inr-eth-calculator';
import SavingsComparison from '@/app/components/savings-comparison';
import TransferHistory from '@/app/transfer-history';
import EthPriceTicker from '@/app/components/eth-price-ticker';

import { SendMoneyView } from './send-money-view';
import { ActivityView } from './activity-view';
import { ExchangeView } from './exchange-view';
import { WalletView } from './wallet-view';
import { AccountView, type UserSessionData } from './account-view';

interface OverviewDashboardProps {
  userName?: string;
  initialTab?: DashboardTab;
  userSession?: UserSessionData | null;
}

export function OverviewDashboard({
  userName = 'Pavan',
  initialTab = 'overview',
  userSession,
}: OverviewDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<'ETH' | 'USDC'>('ETH');

  function handleSelectAsset(asset: 'ETH' | 'USDC') {
    setSelectedAsset(asset);
    setActiveTab('send');
  }

  return (
    <div className="min-h-screen bg-[#071410] text-[#F4F1E8] flex flex-col md:flex-row">
      {/* 1. Left Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 max-w-7xl mx-auto w-full">
        {/* Header Bar */}
        <Header
          userName={userName}
          activeTab={activeTab}
          onMobileOpen={() => setMobileOpen(true)}
          onTabChange={setActiveTab}
        />

        {/* Tab 1: Overview Dashboard (Matches Primary Visual Reference) */}
        {activeTab === 'overview' && (
          <div className="space-y-6 pt-6 animate-in fade-in duration-150">
            {/* Row 1: 3-Card Portfolio & Asset Summary */}
            <PortfolioSummary onSelectAsset={handleSelectAsset} />

            {/* Row 2: Recent Transactions (Left) + Supporting Panels (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Primary Column: Recent Transactions Table */}
              <div className="lg:col-span-2">
                <RecentTransactions onViewAll={() => setActiveTab('activity')} />
              </div>

              {/* Supporting Column: Supported Assets + Network Status */}
              <div className="lg:col-span-1 space-y-5">
                <SupportedAssets onSelectAsset={handleSelectAsset} />
                <NetworkStatus />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Send Money (Matches Send Money Visual Reference) */}
        {activeTab === 'send' && (
          <SendMoneyView initialAsset={selectedAsset} />
        )}

        {/* Tab 3: Exchange & Remittance (Matches SwiftChain V2 Visual Language) */}
        {activeTab === 'exchange' && (
          <ExchangeView
            onLockRateAndSend={(asset) => {
              setSelectedAsset(asset);
              setActiveTab('send');
            }}
          />
        )}

        {/* Tab 4: Activity / Full Transfer History (Matches Activity Visual Reference) */}
        {activeTab === 'activity' && (
          <ActivityView onNavigateToSend={() => setActiveTab('send')} />
        )}

        {/* Tab 5: Wallet Management */}
        {activeTab === 'wallet' && (
          <WalletView
            onNavigateToSend={(asset) => {
              if (asset) setSelectedAsset(asset);
              setActiveTab('send');
            }}
            onNavigateToExchange={() => setActiveTab('exchange')}
            onNavigateToActivity={() => setActiveTab('activity')}
          />
        )}

        {/* Tab 6: My Account Management */}
        {activeTab === 'account' && (
          <AccountView
            userSession={userSession}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}
      </main>
    </div>
  );
}
