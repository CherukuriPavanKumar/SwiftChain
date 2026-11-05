'use client';

import React, { useState } from 'react';
import { Wallet, LogOut, Copy, Check, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useConnection, useAccount, useDisconnect, useConnect, useConnectors } from 'wagmi';
import { UserIdenticon } from './token-icons';
import { signOut } from '@/app/auth/sign-out/actions';
import type { DashboardTab } from './sidebar';

export interface UserSessionData {
  id?: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  image?: string | null;
  createdAt?: string | Date | null;
}

interface AccountViewProps {
  userSession?: UserSessionData | null;
  onNavigate?: (tab: DashboardTab) => void;
}

export function AccountView({ userSession }: AccountViewProps) {
  const { address, isConnected } = useConnection();
  const { connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const connectors = useConnectors();

  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isWalletConnected = Boolean(isConnected && address);

  const displayName =
    userSession?.name || (userSession?.email ? userSession.email.split('@')[0] : 'SwiftChain user');
  const displayEmail = userSession?.email || '\u2014';
  const emailVerified = Boolean(userSession?.emailVerified);

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = userSession?.createdAt
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(userSession.createdAt)
      )
    : null;

  function handleCopyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleConnectMetaMask() {
    if (typeof window !== 'undefined' && !(window as any).ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    const target =
      connectors.find((c) => c.id === 'io.metamask') ||
      connectors.find((c) => c.id === 'injected') ||
      connectors[0];
    if (target) connect({ connector: target });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  const cardCls = 'rounded-xl bg-[#0d1e17] border border-[#233a30]';
  const innerCls = 'rounded-lg bg-[#071410] border border-[#233a30]';

  return (
    <div className="pt-6 max-w-xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Profile Card */}
      <div className={`${cardCls} p-5 sm:p-6 flex items-center gap-5`}>
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#152920] border border-[#233a30] flex items-center justify-center text-lg sm:text-xl font-bold text-[#8BE3BB] font-mono">
            {initials}
          </div>
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#6ED6A8] border-2 border-[#0d1e17]" />
        </div>

        {/* Info */}
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-bold text-[#F4F1E8] truncate">
            {displayName}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-[#a6b8b0] font-mono truncate">
            <span>{displayEmail}</span>
            {emailVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#6ED6A8] shrink-0" />}
          </div>
          {memberSince && (
            <p className="text-xs text-[#7a9187]">Member since {memberSince}</p>
          )}
        </div>
      </div>

      {/* Wallet Card */}
      <div className={`${cardCls} p-5 sm:p-6 space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${innerCls} flex items-center justify-center`}>
              <Wallet className="w-4 h-4 text-[#8BE3BB]" />
            </div>
            <span className="text-sm font-bold text-[#F4F1E8]">Connected wallet</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${
              isWalletConnected
                ? 'bg-[#071410] border border-[#233a30] text-[#6ED6A8]'
                : 'bg-[#071410] border border-[#233a30] text-[#7a9187]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWalletConnected ? 'bg-[#6ED6A8]' : 'bg-[#7a9187]'
              }`}
            />
            <span>{isWalletConnected ? 'Connected' : 'Not connected'}</span>
          </span>
        </div>

        {isWalletConnected && address ? (
          <div className="space-y-3">
            {/* Address row */}
            <div className={`flex items-center justify-between gap-3 p-3 ${innerCls}`}>
              <div className="flex items-center gap-2 min-w-0">
                <UserIdenticon address={address} size={20} />
                <span className="font-mono text-xs text-[#F4F1E8] truncate tabular-nums">
                  {address}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1.5 rounded-md text-[#7a9187] hover:text-[#8BE3BB] hover:bg-[#152920] transition-colors duration-150 cursor-pointer"
                  title="Copy address"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#6ED6A8]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md text-[#7a9187] hover:text-[#8BE3BB] hover:bg-[#152920] transition-colors duration-150"
                  title="View on Etherscan"
                  aria-label="View on Etherscan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between text-xs text-[#7a9187]">
              <span>{connector?.name || 'MetaMask'}</span>
              <span>Sepolia testnet</span>
            </div>

            {/* Disconnect button */}
            <button
              type="button"
              onClick={() => disconnect()}
              className="w-full py-2.5 rounded-lg bg-[#1a0f0f] hover:bg-[#281414] border border-[#3d1f1f] text-xs font-semibold text-[#e57373] transition-colors duration-150 cursor-pointer"
            >
              Disconnect wallet
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnectMetaMask}
            className="w-full py-2.5 rounded-lg bg-[#152920] hover:bg-[#1e3d30] text-xs font-bold text-[#8BE3BB] border border-[#233a30] transition-colors duration-150 cursor-pointer"
          >
            Connect MetaMask
          </button>
        )}
      </div>

      {/* Sign Out */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="w-full py-2.5 rounded-lg bg-[#1a0f0f] hover:bg-[#281414] border border-[#3d1f1f] text-xs sm:text-sm font-semibold text-[#e57373] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        <span>{signingOut ? 'Signing out\u2026' : 'Sign out'}</span>
      </button>
    </div>
  );
}
