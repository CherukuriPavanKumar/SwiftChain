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

  // Format real current date dynamically
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
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#233a30]">
      {/* Left: Mobile Toggle & Section Heading */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileOpen}
            className="md:hidden p-2 rounded-lg bg-[#0d1e17] border border-[#233a30] text-[#a6b8b0] hover:text-[#F4F1E8]"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5 stroke-[1.5]" />
          </button>
          <span className="text-xs font-normal text-[#7a9187]">
            Dashboard · Sepolia testnet
          </span>
        </div>

        {activeTab === 'overview' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight">
              Overview
            </h2>
            <p className="text-xs sm:text-sm text-[#a6b8b0] font-normal">
              Account balances, live exchange rates, and recent transfer settlements.
            </p>
          </>
        ) : activeTab === 'send' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight">
              Send Money
            </h2>
            <p className="text-xs sm:text-sm text-[#a6b8b0] font-normal">
              Transfer crypto globally with low fees on Ethereum Sepolia.
            </p>
          </>
        ) : activeTab === 'exchange' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight">
              Exchange &amp; Remittance
            </h2>
            <p className="text-xs sm:text-sm text-[#a6b8b0] font-normal">
              Calculate real-time rates and multi-rail cost comparisons.
            </p>
          </>
        ) : activeTab === 'activity' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight">
              Activity
            </h2>
            <p className="text-xs sm:text-sm text-[#a6b8b0] font-normal">
              Track your transfers and verifiable on-chain settlement status.
            </p>
          </>
        ) : activeTab === 'wallet' ? (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight">
              Your Wallet
            </h2>
            <p className="text-xs sm:text-sm text-[#a6b8b0] font-normal">
              Manage your assets, view balances and testnet information.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1E8] tracking-tight">
              My Account
            </h2>
            <p className="text-xs sm:text-sm text-[#a6b8b0] font-normal">
              Manage your profile, security settings, and credentials.
            </p>
          </>
        )}
      </div>

      {/* Right: Controls & Network Indicator */}
      <div className="flex flex-col sm:items-end gap-2.5">
        {/* Top Controls: Status + Notifications + Profile */}
        <div className="flex items-center gap-2 self-end">
          {(activeTab === 'activity' || activeTab === 'exchange' || activeTab === 'send') && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1e17] border border-[#233a30] text-xs font-normal text-[#a6b8b0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
              <span>Sepolia Testnet</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7a9187] stroke-[1.5]" />
            </div>
          )}

          {/* Notifications Button */}
          {(activeTab === 'overview' || activeTab === 'wallet') && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                aria-label="Notifications"
                className="p-2 rounded-lg bg-[#0d1e17] border border-[#233a30] text-[#a6b8b0] hover:text-[#F4F1E8] hover:border-[#335345] transition-colors relative"
              >
                <Bell className="w-4 h-4 stroke-[1.5]" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
              </button>

              {/* Notification Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0d1e17] border border-[#233a30] p-4 shadow-xl z-50 text-left space-y-2.5 animate-in fade-in duration-100">
                  <p className="text-xs font-bold text-[#F4F1E8]">System Notifications</p>
                  <div className="text-[11px] text-[#a6b8b0] space-y-2">
                    <div className="p-2.5 rounded-lg bg-[#071410] border border-[#233a30]">
                      <p className="text-[#8BE3BB] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
                        Sepolia Testnet Active
                      </p>
                      <p className="text-[11px] text-[#7a9187] mt-0.5">Live market rates &amp; quote engine online.</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#071410] border border-[#233a30]">
                      <p className="text-[#8BE3BB] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
                        Circle USDC Verified
                      </p>
                      <p className="text-[11px] text-[#7a9187] mt-0.5">Official contract 0x1c7D...7238 operational.</p>
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0d1e17] border border-[#233a30] hover:border-[#8BE3BB]/50 text-xs font-bold text-[#8BE3BB] hover:text-[#a1ecd0] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Wallet className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onTabChange?.('wallet')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1e17] border border-[#233a30] hover:border-[#335345] transition-colors text-xs text-[#a6b8b0] hover:text-[#F4F1E8]"
                title={address}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8BE3BB]" />
                <span className="font-mono text-xs font-medium text-[#F4F1E8]">{shortAddress}</span>
              </button>
            </div>
          )}

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="User Profile"
              className="flex items-center gap-2 p-1.5 rounded-lg bg-[#0d1e17] border border-[#233a30] hover:border-[#335345] text-xs transition-colors"
            >
              <UserIdenticon address={address} size={22} />
              <ChevronDown className="w-3.5 h-3.5 text-[#7a9187] stroke-[1.5]" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0d1e17] border border-[#233a30] shadow-xl z-50 text-left py-1 animate-in fade-in duration-100">
                <div className="px-3.5 py-2.5 border-b border-[#233a30]">
                  <p className="text-xs font-bold text-[#F4F1E8] truncate">{userName}</p>
                  <p className="text-[11px] text-[#7a9187] font-mono truncate">{shortAddress}</p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange?.('account');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#a6b8b0] hover:text-[#F4F1E8] hover:bg-[#152920] transition-colors text-left"
                  >
                    <User className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>My Account</span>
                  </button>

                  {address && (
                    <a
                      href={`https://sepolia.etherscan.io/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#a6b8b0] hover:text-[#F4F1E8] hover:bg-[#152920] transition-colors text-left"
                    >
                      <ExternalLink className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>View on Etherscan</span>
                    </a>
                  )}

                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => {
                        disconnect();
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#FF8585] hover:bg-[#152920] transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Disconnect Wallet</span>
                    </button>
                  )}

                  <div className="border-t border-[#233a30] my-1" />

                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#FF8585] hover:bg-[#152920] transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date Display */}
        <p className="text-[11px] text-[#7a9187] font-normal hidden sm:block">
          {formattedDate}
        </p>
      </div>
    </header>
  );
}
