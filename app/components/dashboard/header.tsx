'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, ExternalLink, LogOut, User, Menu, Wallet } from 'lucide-react';
import { UserIdenticon } from './token-icons';
import { useConnection, useDisconnect, useConnect, useConnectors } from 'wagmi';
import Link from 'next/link';
import { signOut } from '@/app/auth/sign-out/actions';

import type { DashboardTab } from './sidebar';

interface HeaderProps {
  userName?: string;
  activeTab?: DashboardTab;
  onMobileOpen: () => void;
  onTabChange?: (tab: DashboardTab) => void;
}

export function Header({
  userName = 'User',
  activeTab = 'overview',
  onMobileOpen,
  onTabChange,
}: HeaderProps) {
  const { address, isConnected } = useConnection();
  const { disconnect } = useDisconnect();
  const { connect, isPending: isConnecting } = useConnect();
  const connectors = useConnectors();

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

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : 'Connect Wallet';

  // Format real current date dynamically as "Thu, 24 Apr 2025"
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#294438]/40">
      {/* Left: Mobile Toggle & Section Heading */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileOpen}
            className="md:hidden p-2 rounded-xl bg-[#183126] border border-[#294438] text-[#91AAA0] hover:text-[#F4F1E8]"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#91AAA0]">
            {activeTab === 'send'
              ? 'Send Money'
              : activeTab === 'exchange'
              ? 'Exchange'
              : activeTab === 'activity'
              ? 'Activity'
              : activeTab === 'wallet'
              ? 'Wallet'
              : activeTab === 'account'
              ? 'My Account'
              : 'Overview'}
          </span>
        </div>

        {activeTab === 'overview' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
              Welcome back, <span className="text-[#8BE3BB]">{userName}.</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#91AAA0]">
              Here&apos;s an overview of your SwiftChain activity.
            </p>
          </>
        ) : activeTab === 'send' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
              Send Money
            </h2>
            <p className="text-xs sm:text-sm text-[#91AAA0]">
              Transfer crypto globally with low fees. Currently using Sepolia testnet.
            </p>
          </>
        ) : activeTab === 'exchange' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
              Exchange & Remittance
            </h2>
            <p className="text-xs sm:text-sm text-[#91AAA0]">
              Calculate real-time rates and multi-rail cost comparisons.
            </p>
          </>
        ) : activeTab === 'activity' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
              Activity
            </h2>
            <p className="text-xs sm:text-sm text-[#91AAA0]">
              Track your transfers and transaction status.
            </p>
          </>
        ) : activeTab === 'wallet' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
              Your Wallet
            </h2>
            <p className="text-xs sm:text-sm text-[#91AAA0]">
              Manage your assets, view balances and network information.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight">
              My Account
            </h2>
            <p className="text-xs sm:text-sm text-[#91AAA0]">
              Manage your profile, security settings, and linked Web3 credentials.
            </p>
          </>
        )}
      </div>

      {/* Right: Controls & Network Indicator */}
      <div className="flex flex-col sm:items-end gap-2.5">
        {/* Top Controls: Network Pill (Activity / Exchange / Send) + Notifications + Profile */}
        <div className="flex items-center gap-2 self-end">
          {(activeTab === 'activity' || activeTab === 'exchange' || activeTab === 'send') && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#183126] border border-[#294438] text-xs font-medium text-[#F4F1E8]">
              <span className="w-2 h-2 rounded-full bg-[#6ED6A8]" />
              <span>Sepolia Testnet</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#91AAA0]" />
            </div>
          )}

          {/* Notifications Button (shown on overview and wallet tabs) */}
          {(activeTab === 'overview' || activeTab === 'wallet') && (
            <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              aria-label="Notifications"
              className="p-2.5 rounded-full bg-[#183126] border border-[#294438] text-[#91AAA0] hover:text-[#F4F1E8] hover:border-[#8BE3BB]/40 transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8BE3BB]" />
            </button>

            {/* Notification Drawer */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#183126] border border-[#294438] p-4 shadow-xl z-50 text-left space-y-2.5 animate-in fade-in duration-100">
                <p className="text-xs font-semibold text-[#F4F1E8]">System Notifications</p>
                <div className="text-[11px] text-[#91AAA0] space-y-2">
                  <div className="p-2 rounded-lg bg-[#10231B] border border-[#294438]/50">
                    <p className="text-[#6ED6A8] font-medium">● Sepolia Testnet Active</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Live market rates & 60-second quote engine online.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#10231B] border border-[#294438]/50">
                    <p className="text-[#8BE3BB] font-medium">● Circle USDC Verified</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Official contract 0x1c7D...7238 operational.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Wallet & Profile Controls */}
          {!isConnected || !address ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConnectMetaMask}
                disabled={isConnecting}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#183126] border border-[#294438] hover:border-[#8BE3BB]/50 text-xs font-semibold text-[#8BE3BB] hover:text-[#A7F3D0] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="p-1.5 rounded-full bg-[#183126] border border-[#294438] hover:border-[#8BE3BB]/50 text-[#91AAA0] hover:text-[#F4F1E8] transition-colors cursor-pointer"
                  aria-label="User Account Menu"
                >
                  <User className="w-4 h-4" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#183126] border border-[#294438] p-2 shadow-xl z-50 text-left space-y-1 animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange ? onTabChange('account') : window.location.assign('/account');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] rounded-xl transition-colors cursor-pointer"
                    >
                      <span>My Account</span>
                      <User className="w-3.5 h-3.5" />
                    </button>
                    <div className="border-t border-[#294438]/60 my-1" />
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] rounded-xl transition-colors"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#183126] border border-[#294438] hover:border-[#8BE3BB]/50 text-[#F4F1E8] transition-colors cursor-pointer"
              >
                <UserIdenticon address={address} size={24} />
                <span className="font-mono text-xs font-medium">
                  {shortAddress}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#91AAA0]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#183126] border border-[#294438] p-2 shadow-xl z-50 text-left space-y-1 animate-in fade-in duration-100">
                  <a
                    href={`https://sepolia.etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3 py-2 text-xs text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] rounded-xl transition-colors"
                  >
                    <span>View on Etherscan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange ? onTabChange('account') : window.location.assign('/account');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] rounded-xl transition-colors cursor-pointer"
                  >
                    <span>My Account</span>
                    <User className="w-3.5 h-3.5" />
                  </button>

                  <div className="border-t border-[#294438]/60 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      disconnect();
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#FF8585] hover:bg-[#FF8585]/10 rounded-xl transition-colors"
                  >
                    <span>Disconnect Wallet</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>

                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] rounded-xl transition-colors"
                    >
                      <span>Sign Out</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date & Sepolia Testnet Indicator (Overview tab) */}
        {activeTab === 'overview' && (
          <div className="flex items-center gap-3 text-xs text-[#91AAA0] font-medium self-end">
            <span>{formattedDate}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6ED6A8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
              Sepolia Testnet
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
