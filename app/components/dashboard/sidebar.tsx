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
  Menu,
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

  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : 'Not Connected';

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Not Connected';

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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#10231B] border-r border-[#294438] flex flex-col justify-between p-5 transition-transform duration-200 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Brand & Navigation */}
        <div className="space-y-8">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#183126] border border-[#294438] flex items-center justify-center">
                <SwiftChainLogo className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#F4F1E8] tracking-tight leading-none">
                  SwiftChain
                </h1>
                <p className="text-[9px] uppercase tracking-widest text-[#91AAA0] font-medium mt-1">
                  Global Payments, Reimagined
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onMobileClose}
              className="md:hidden text-[#91AAA0] hover:text-[#F4F1E8] p-1.5 rounded-lg hover:bg-[#183126]"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#183126] border border-[#294438] text-[#8BE3BB] shadow-xs'
                      : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#142920] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#8BE3BB]' : 'text-[#91AAA0]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Network Status & Connected Wallet */}
        <div className="space-y-3 pt-4 border-t border-[#294438]/60">
          {/* Network Card */}
          <div className="p-3 rounded-xl bg-[#183126]/60 border border-[#294438] flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              {isConnected && isSepolia && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6ED6A8] opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isConnected && isSepolia
                    ? 'bg-[#6ED6A8]'
                    : isConnected
                    ? 'bg-[#F2C66D]'
                    : 'bg-[#91AAA0]'
                }`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F4F1E8] truncate">
                Sepolia Testnet
              </p>
              <p className="text-[11px] text-[#91AAA0] truncate">
                {isConnected ? (isSepolia ? 'Connected' : 'Wrong Network') : 'Disconnected'}
              </p>
            </div>
          </div>

          {/* Connected Wallet Pill */}
          <div className="p-2.5 rounded-xl bg-[#183126]/60 border border-[#294438] space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserIdenticon address={address} size={28} />
                <span className="text-xs font-mono font-medium text-[#F4F1E8] truncate" title={address}>
                  {displayAddress}
                </span>
              </div>

              {address ? (
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy address"
                  className="p-1.5 rounded-lg text-[#91AAA0] hover:text-[#8BE3BB] hover:bg-[#294438]/50 transition-colors shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#6ED6A8]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectMetaMask}
                  className="px-2 py-1 rounded-lg bg-[#1e3d30] hover:bg-[#254d3d] text-[10px] font-semibold text-[#8BE3BB] border border-[#3b6352] transition-colors cursor-pointer shrink-0"
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
                className="inline-flex items-center gap-1 text-[10px] text-[#91AAA0] hover:text-[#8BE3BB] transition-colors pl-9.5"
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
