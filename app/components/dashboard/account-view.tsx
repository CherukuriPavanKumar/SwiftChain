'use client';

import React, { useState } from 'react';
import { User, Wallet, LogOut, Copy, Check, ExternalLink, CheckCircle2 } from 'lucide-react';
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

function truncateAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
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
    userSession?.name || (userSession?.email ? userSession.email.split('@')[0] : 'SwiftChain User');
  const displayEmail = userSession?.email || '—';
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

  return (
    <div className="pt-6 max-w-xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Profile Card */}
      <div className="rounded-2xl bg-[#183126] border border-[#294438] p-6 flex items-center gap-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3d30] to-[#10231B] border-2 border-[#8BE3BB]/40 flex items-center justify-center text-xl font-extrabold text-[#8BE3BB] font-mono">
            {initials}
          </div>
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#6ED6A8] border-2 border-[#183126]" />
        </div>

        {/* Info */}
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-extrabold text-[#F4F1E8] tracking-tight truncate">
            {displayName}
          </h2>
          <div className="flex items-center gap-1.5 text-sm text-[#91AAA0] font-mono truncate">
            <span>{displayEmail}</span>
            {emailVerified && <CheckCircle2 className="w-3.5 h-3.5 text-[#6ED6A8] shrink-0" />}
          </div>
          {memberSince && (
            <p className="text-xs text-[#91AAA0]">Member since {memberSince}</p>
          )}
        </div>
      </div>

      {/* Wallet Card */}
      <div className="rounded-2xl bg-[#183126] border border-[#294438] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#10231B] border border-[#294438] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#8BE3BB]" />
            </div>
            <span className="text-sm font-bold text-[#F4F1E8]">Connected Wallet</span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
              isWalletConnected
                ? 'bg-[#6ED6A8]/10 border border-[#6ED6A8]/30 text-[#6ED6A8]'
                : 'bg-[#91AAA0]/10 border border-[#91AAA0]/30 text-[#91AAA0]'
            }`}
          >
            {isWalletConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {isWalletConnected && address ? (
          <div className="space-y-3">
            {/* Address row */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#10231B] border border-[#294438]">
              <div className="flex items-center gap-2 min-w-0">
                <UserIdenticon address={address} size={20} />
                <span className="font-mono text-xs text-[#F4F1E8] truncate">{address}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1.5 rounded-lg text-[#91AAA0] hover:text-[#8BE3BB] hover:bg-[#183126] transition-colors cursor-pointer"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#6ED6A8]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-[#91AAA0] hover:text-[#8BE3BB] hover:bg-[#183126] transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between text-xs text-[#91AAA0]">
              <span>{connector?.name || 'MetaMask'}</span>
              <span>Sepolia Testnet</span>
            </div>

            {/* Disconnect */}
            <button
              type="button"
              onClick={() => disconnect()}
              className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold text-[#FF8585] transition-colors cursor-pointer"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnectMetaMask}
            className="w-full py-2.5 rounded-xl bg-[#1e3d30] hover:bg-[#254d3d] text-xs font-bold text-[#8BE3BB] border border-[#3b6352] transition-colors cursor-pointer"
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
        className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-sm font-bold text-[#FF8585] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
      </button>
    </div>
  );
}
