'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Send,
  ArrowLeftRight,
  Clock,
  Wallet,
  Copy,
  Check,
  X,
  UserCircle
} from 'lucide-react';
import { SwiftChainLogo, UserIdenticon } from './token-icons';
import { useConnection, useConnect, useConnectors } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export type DashboardTab = 'overview' | 'send' | 'exchange' | 'activity' | 'wallet' | 'account';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ activeTab, onTabChange, mobileOpen, onMobileClose }: SidebarProps) {
  const { address, isConnected, chainId } = useConnection();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const [copied, setCopied] = useState(false);

  function handleConnectMetaMask() {
    if (typeof window !== 'undefined' && !(window as any).ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    const target =
      connectors.find((c) => c.id === 'io.metamask' || c.id === 'io.metamask.mobile') ||
      connectors.find((c) => c.id === 'metaMask' && c.type === 'injected') ||
      connectors.find((c) => c.id === 'injected' && c.name.toLowerCase().includes('metamask')) ||
      connectors.find((c) => c.id === 'injected') ||
      connectors.find((c) => c.name.toLowerCase().includes('metamask')) ||
      connectors[0];

    if (target) {
      connect({ connector: target });
    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_requestAccounts' }).catch(console.error);
    }
  }

  const isSepolia = chainId === sepolia.id;

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Not connected';

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const navItems: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'send', label: 'Send Money', icon: Send },
    { id: 'exchange', label: 'Exchange', icon: ArrowLeftRight },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'account', label: 'My Account', icon: UserCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#040a08] border-r border-[#233a30] flex flex-col justify-between p-5 transition-transform duration-150 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Brand & Navigation */}
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0d1e17] border border-[#233a30] flex items-center justify-center">
                <SwiftChainLogo className="w-4 h-4 text-[#8BE3BB]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#F4F1E8] tracking-tight leading-none">
                  SwiftChain
                </h1>
                <p className="text-[11px] text-[#7a9187] font-normal mt-0.5">
                  Cross-border settlement
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onMobileClose}
              className="md:hidden text-[#7a9187] hover:text-[#F4F1E8] p-1.5 rounded-lg hover:bg-[#0d1e17]"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    onMobileClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    isActive
                      ? 'bg-[#152920] border border-[#233a30] text-[#8BE3BB] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'text-[#a6b8b0] hover:text-[#F4F1E8] hover:bg-[#0d1e17] border border-transparent font-normal'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[1.5] ${isActive ? 'text-[#8BE3BB]' : 'text-[#7a9187]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Network Status & Connected Wallet */}
        <div className="space-y-2.5 pt-4 border-t border-[#233a30]">
          {/* Network Card: Quiet status without pulsing */}
          <div className="p-2.5 rounded-lg bg-[#0d1e17] border border-[#233a30] flex items-center gap-2.5">
            <span
              className={`inline-flex rounded-full h-2 w-2 shrink-0 ${
                isConnected && isSepolia
                  ? 'bg-[#8BE3BB]'
                  : isConnected
                  ? 'bg-[#F2C66D]'
                  : 'bg-[#7a9187]'
              }`}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#F4F1E8] truncate">
                Sepolia Testnet
              </p>
              <p className="text-[11px] text-[#7a9187] truncate">
                {isConnected ? (isSepolia ? 'Operational' : 'Wrong network') : 'Disconnected'}
              </p>
            </div>
          </div>

          {/* Connected Wallet Box */}
          <div className="p-2.5 rounded-lg bg-[#0d1e17] border border-[#233a30] space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <UserIdenticon address={address} size={24} />
                <span className="text-xs font-mono font-medium text-[#F4F1E8] truncate" title={address}>
                  {displayAddress}
                </span>
              </div>

              {address ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy address"
                  className="p-1 rounded-md text-[#7a9187] hover:text-[#8BE3BB] hover:bg-[#152920] transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#8BE3BB]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.5]" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectMetaMask}
                  className="px-2 py-1 rounded-md bg-[#152920] hover:bg-[#1c362a] text-[10px] font-bold text-[#8BE3BB] border border-[#233a30] transition-colors cursor-pointer shrink-0"
                >
                  Connect
                </button>
              )}
            </div>

            {address && (
              <a
                href={`https://sepolia.etherscan.io/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-[#7a9187] hover:text-[#8BE3BB] transition-colors pl-8"
              >
                <span>View on Etherscan</span>
                <span className="text-[9px]">↗</span>
              </a>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
