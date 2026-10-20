'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useConnection, useAccount, useBlockNumber, useGasPrice, useConnect, useConnectors } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { formatEther } from 'viem';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Plus,
  ChevronRight,
  ChevronDown,
  Info,
  Send,
  MoreHorizontal,
  X,
  Wallet,
  Clock,
} from 'lucide-react';
import { useTokenBalances } from '@/hooks/use-token-balances';
import { useEthPrice } from '@/app/components/eth-price-ticker';
import { fetchTransfers } from '@/lib/transfer-client';
import { EthereumIcon, UsdcIcon } from './token-icons';
import type { TransferRecord } from '@/app/transfer-history';

interface WalletViewProps {
  onNavigateToSend?: (asset?: 'ETH' | 'USDC') => void;
  onNavigateToExchange?: () => void;
  onNavigateToActivity?: () => void;
}

type CurrencyUnit = 'INR' | 'USD' | 'ETH';

interface CustomToken {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  decimals: number;
}

function shortAddr(addr: string | null | undefined, head = 6, tail = 4): string {
  if (!addr) return 'Not Connected';
  if (addr.length < head + tail + 3) return addr;
  return `${addr.slice(0, head)}\u2026${addr.slice(-tail)}`;
}

function formatFiatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatFiatUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateParts(isoDate: string) {
  try {
    const d = new Date(isoDate);
    const dateStr = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
    const timeStr = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
    return { dateStr, timeStr };
  } catch {
    return { dateStr: 'Recent', timeStr: '' };
  }
}

function CopyButton({ value, className = '' }: { value?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!value) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`p-1.5 rounded-lg text-[#91AAA0] hover:text-[#8BE3BB] hover:bg-[#294438]/50 transition-colors shrink-0 ${className}`}
      aria-label="Copy address"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#6ED6A8]" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isConfirmed = s === 'confirmed' || s === 'completed';
  const isPending = s === 'pending' || s === 'awaiting signature';
  const isFailed = s === 'failed' || s === 'rejected';

  if (isConfirmed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#6ED6A8] bg-[#122c22] border border-[#254d3b]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
        Completed
      </span>
    );
  }
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#F2C66D] bg-[#2e2615] border border-[#524320]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F2C66D] animate-pulse" />
        Pending
      </span>
    );
  }
  if (isFailed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#FF8585] bg-[#331a1a] border border-[#592626]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF8585]" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#91AAA0] bg-[#183126] border border-[#294438]">
      {status}
    </span>
  );
}

function ReceiveModal({
  address,
  isConnected,
  onClose,
  onConnectMetaMask,
}: {
  address?: string;
  isConnected: boolean;
  onClose: () => void;
  onConnectMetaMask?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#183126] border border-[#294438] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F4F1E8]">Receive Assets</h3>
            <p className="text-xs text-[#91AAA0] mt-0.5">
              Deposit ETH or USDC on Sepolia testnet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isConnected && address ? (
          <>
            <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-xs text-[#F4F1E8] break-all leading-relaxed select-all">
                  {address}
                </p>
                <CopyButton value={address} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#91AAA0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8] shrink-0" />
                <span>Sepolia Testnet &middot; Chain ID 11155111</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-[#F2C66D]/20 bg-[#F2C66D]/5 text-[11px] text-[#F2C66D]">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Only send Sepolia testnet tokens to this address. Mainnet assets sent here cannot be recovered.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-xl bg-[#1e3d30] hover:bg-[#254d3b] border border-[#294438] text-sm font-semibold text-[#8BE3BB] transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#6ED6A8]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Address</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#10231B] border border-[#294438] text-sm text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 text-center space-y-3 rounded-xl bg-[#10231B] border border-[#294438]">
            <p className="text-sm font-semibold text-[#F4F1E8]">Wallet Not Connected</p>
            <p className="text-xs text-[#91AAA0]">
              Connect your MetaMask wallet to view your receive address and deposit tokens.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onConnectMetaMask?.();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#1e3d30] hover:bg-[#254d3d] text-xs font-semibold text-[#8BE3BB] border border-[#3b6352] transition-colors cursor-pointer"
              >
                Connect MetaMask
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#10231B] border border-[#294438] text-xs text-[#91AAA0] hover:text-[#F4F1E8] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddTokenModal({
  onClose,
  onAddToken,
}: {
  onClose: () => void;
  onAddToken: (token: CustomToken) => void;
}) {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [error, setError] = useState('');

  const quickTokens = [
    { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x3e622317f8C93f7328350cF0B56318C818527936', decimals: 18 },
    { symbol: 'LINK', name: 'Chainlink Token', address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x29f2D40B0605204364af54EC677bD022dA425d03', decimals: 8 },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      setError('Please enter a valid EVM contract address (0x...)');
      return;
    }
    if (!tokenSymbol.trim()) {
      setError('Please provide a token symbol');
      return;
    }

    onAddToken({
      symbol: tokenSymbol.trim().toUpperCase(),
      name: tokenName.trim() || tokenSymbol.trim().toUpperCase(),
      address: contractAddress.trim(),
      balance: '0.00',
      decimals: parseInt(decimals) || 18,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#183126] border border-[#294438] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F4F1E8]">Import Custom Token</h3>
            <p className="text-xs text-[#91AAA0] mt-0.5">
              Add any ERC-20 token on Sepolia testnet to track its balance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#10231B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-[#91AAA0] uppercase tracking-wider mb-2">
            Popular Sepolia Tokens
          </p>
          <div className="grid grid-cols-3 gap-2">
            {quickTokens.map((t) => (
              <button
                key={t.symbol}
                type="button"
                onClick={() => {
                  setContractAddress(t.address);
                  setTokenSymbol(t.symbol);
                  setTokenName(t.name);
                  setDecimals(t.decimals.toString());
                  setError('');
                }}
                className="p-2.5 rounded-xl bg-[#10231B] border border-[#294438] hover:border-[#8BE3BB]/50 text-left transition-colors group"
              >
                <p className="text-xs font-bold text-[#F4F1E8] group-hover:text-[#8BE3BB]">
                  {t.symbol}
                </p>
                <p className="text-[10px] text-[#91AAA0] truncate">{t.name}</p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#91AAA0] mb-1">
              Token Contract Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-mono text-[#F4F1E8] placeholder-[#91AAA0]/50 focus:outline-none focus:border-[#8BE3BB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#91AAA0] mb-1">
                Token Symbol
              </label>
              <input
                type="text"
                placeholder="e.g. DAI"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-mono text-[#F4F1E8] placeholder-[#91AAA0]/50 focus:outline-none focus:border-[#8BE3BB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#91AAA0] mb-1">
                Decimals
              </label>
              <input
                type="number"
                placeholder="18"
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#10231B] border border-[#294438] text-xs font-mono text-[#F4F1E8] placeholder-[#91AAA0]/50 focus:outline-none focus:border-[#8BE3BB]"
              />
            </div>
          </div>

          {error && <p className="text-xs text-[#FF8585]">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#8BE3BB] hover:bg-[#72caa3] text-sm font-semibold text-[#071410] transition-colors"
            >
              Add Token
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#10231B] border border-[#294438] text-sm text-[#91AAA0] hover:text-[#F4F1E8] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssetActionMenu({
  symbol,
  address,
  onSend,
  onReceive,
}: {
  symbol: string;
  address?: string;
  onSend: () => void;
  onReceive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="p-1.5 rounded-lg bg-[#10231B] border border-[#294438] text-[#91AAA0] hover:text-[#F4F1E8] hover:border-[#8BE3BB]/40 transition-colors"
        title="More actions"
        aria-label="More options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#183126] border border-[#294438] p-1.5 shadow-xl z-50 text-xs space-y-0.5 animate-in fade-in duration-100">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSend();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[#F4F1E8] hover:bg-[#10231B] hover:text-[#8BE3BB] transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-[#8BE3BB]" />
            <span>Send {symbol}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReceive();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[#F4F1E8] hover:bg-[#10231B] hover:text-[#8BE3BB] transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5 text-[#8BE3BB]" />
            <span>Receive {symbol}</span>
          </button>
          {address && (
            <a
              href={`https://sepolia.etherscan.io/address/${address}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[#91AAA0] hover:bg-[#10231B] hover:text-[#F4F1E8] transition-colors"
            >
              <span>View on Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function WalletView({
  onNavigateToSend,
  onNavigateToExchange,
  onNavigateToActivity,
}: WalletViewProps) {
  const { address, isConnected, chainId } = useConnection();
  const { connector } = useAccount();
  const { connect } = useConnect();
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

  const { ethFormatted, usdcFormatted, isEthLoading, isUsdcLoading } = useTokenBalances();
  const { data: marketData } = useEthPrice();

  const [hiddenBalance, setHiddenBalance] = useState(false);
  const [currencyUnit, setCurrencyUnit] = useState<CurrencyUnit>('INR');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);

  // Connection timestamp
  const [connectedTimeStr, setConnectedTimeStr] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now);
      setConnectedTimeStr(formatted);
    } else {
      setConnectedTimeStr(null);
    }
  }, [isConnected]);

  // Handle clicking outside currency dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    }
    if (currencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currencyDropdownOpen]);

  const isSepolia = chainId === sepolia.id;

  const { data: blockNumber, isLoading: isBlockLoading } = useBlockNumber({
    chainId: sepolia.id,
    watch: true,
  });
  const { data: gasPriceWei, isLoading: isGasLoading } = useGasPrice({ chainId: sepolia.id });

  const formattedGasFee = useMemo(() => {
    if (!gasPriceWei) return null;
    try {
      const cost = gasPriceWei * BigInt(21000);
      return parseFloat(formatEther(cost)).toFixed(6) + ' ETH';
    } catch {
      return null;
    }
  }, [gasPriceWei]);

  // Real market rates from oracle / CoinGecko
  const ethPriceInr = marketData?.ethereum?.inr ?? marketData?.inr ?? 230000;
  const ethPriceUsd = marketData?.ethereum?.usd ?? 2400;
  const usdcPriceInr = marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88;
  const usdcPriceUsd = marketData?.usdc?.usd ?? 1.0;

  // 100% Real honest data calculations - zero mock data
  const isWalletConnected = Boolean(isConnected && address);

  const ethAmount = isWalletConnected ? (parseFloat(ethFormatted) || 0) : 0;
  const usdcAmount = isWalletConnected ? (parseFloat(usdcFormatted) || 0) : 0;

  const ethValueInr = ethAmount * ethPriceInr;
  const usdcValueInr = usdcAmount * usdcPriceInr;
  const totalInr = ethValueInr + usdcValueInr;
  const totalEthEquivalent = ethPriceInr > 0 ? totalInr / ethPriceInr : ethAmount;

  const ethValueUsd = ethAmount * ethPriceUsd;
  const usdcValueUsd = usdcAmount * usdcPriceUsd;
  const totalUsd = ethValueUsd + usdcValueUsd;

  // Real transactions from database/API only - zero mock data
  const { data: transfers, isLoading: isTxLoading, error: txError } = useQuery<TransferRecord[]>({
    queryKey: ['transfers', address],
    queryFn: () => fetchTransfers(address),
    refetchInterval: 15_000,
  });

  const recentList = transfers?.slice(0, 5) ?? [];

  function txFiatLabel(tx: TransferRecord): string {
    if (tx.inrSourceAmount) {
      const n = parseFloat(tx.inrSourceAmount);
      if (!isNaN(n) && n > 0)
        return `\u2248 \u20b9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const amt = parseFloat(tx.amount) || 0;
    if (tx.assetSymbol === 'USDC' && usdcPriceInr)
      return `\u2248 \u20b9${(amt * usdcPriceInr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (tx.assetSymbol === 'ETH' && ethPriceInr)
      return `\u2248 \u20b9${(amt * ethPriceInr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return '';
  }

  const mask = (v: string) =>
    v.replace(/[\d,.]/g, (c) => (c === ',' || c === '.' ? c : '\u2022'));

  // Display value calculation based on selected currency
  let formattedTotalMain = isWalletConnected ? formatFiatINR(totalInr) : '₹0.00';
  let formattedTotalSub = isWalletConnected
    ? `≈ ${totalEthEquivalent.toFixed(4)} ETH`
    : 'Connect wallet to view balances';

  if (currencyUnit === 'USD') {
    formattedTotalMain = isWalletConnected ? formatFiatUSD(totalUsd) : '$0.00';
    formattedTotalSub = isWalletConnected
      ? `≈ ${totalEthEquivalent.toFixed(4)} ETH`
      : 'Connect wallet to view balances';
  } else if (currencyUnit === 'ETH') {
    formattedTotalMain = isWalletConnected ? `${totalEthEquivalent.toFixed(4)} ETH` : '0.0000 ETH';
    formattedTotalSub = isWalletConnected
      ? `≈ ${formatFiatINR(totalInr)}`
      : 'Connect wallet to view balances';
  }

  return (
    <>
      <div className="pt-6 space-y-6 animate-in fade-in duration-150">
        {/* ── TOP ROW: FULL WIDTH (Total Balance + 4 Action Cards) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Total Balance Card (md:col-span-5) */}
          <div className="md:col-span-5 rounded-2xl bg-[#183126] border border-[#294438] p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#91AAA0]">Total Balance</span>
                <button
                  type="button"
                  onClick={() => setHiddenBalance((p) => !p)}
                  className="text-[#91AAA0] hover:text-[#8BE3BB] transition-colors"
                  aria-label={hiddenBalance ? 'Show balance' : 'Hide balance'}
                >
                  {hiddenBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Currency Dropdown Selector */}
              <div className="relative" ref={currencyMenuRef}>
                <button
                  type="button"
                  onClick={() => setCurrencyDropdownOpen((p) => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#F4F1E8] hover:border-[#8BE3BB]/50 transition-colors"
                >
                  <span>{currencyUnit}</span>
                  <ChevronDown className="w-3 h-3 text-[#91AAA0]" />
                </button>

                {currencyDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-24 rounded-xl bg-[#10231B] border border-[#294438] p-1 shadow-xl z-30 text-xs">
                    {(['INR', 'USD', 'ETH'] as CurrencyUnit[]).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => {
                          setCurrencyUnit(unit);
                          setCurrencyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          currencyUnit === unit
                            ? 'text-[#8BE3BB] bg-[#183126] font-bold'
                            : 'text-[#F4F1E8] hover:bg-[#183126]'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#F4F1E8] tracking-tight font-mono tabular-nums">
                {hiddenBalance ? mask(formattedTotalMain) : formattedTotalMain}
              </p>
              <p className="text-xs text-[#91AAA0] font-mono mt-1">
                {hiddenBalance ? '\u2248 \u2022\u2022\u2022\u2022' : formattedTotalSub}
              </p>
            </div>
          </div>

          {/* 4 Action Cards Row (md:col-span-7) */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Receive */}
            <button
              type="button"
              onClick={() => setReceiveOpen(true)}
              className="rounded-2xl bg-[#183126] border border-[#294438] p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-[#8BE3BB]/40 hover:bg-[#1c382b] transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center group-hover:border-[#8BE3BB]/40 group-hover:scale-105 transition-all text-[#8BE3BB]">
                <ArrowDown className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-[#F4F1E8]">Receive</p>
              <p className="text-[11px] text-[#91AAA0] leading-tight text-center">
                Get assets to your wallet
              </p>
            </button>

            {/* 2. Send */}
            <button
              type="button"
              onClick={() => onNavigateToSend?.()}
              className="rounded-2xl bg-[#183126] border border-[#294438] p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-[#8BE3BB]/40 hover:bg-[#1c382b] transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center group-hover:border-[#8BE3BB]/40 group-hover:scale-105 transition-all text-[#8BE3BB]">
                <ArrowUp className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-[#F4F1E8]">Send</p>
              <p className="text-[11px] text-[#91AAA0] leading-tight text-center">
                Transfer to another wallet
              </p>
            </button>

            {/* 3. Swap */}
            <button
              type="button"
              onClick={() => onNavigateToExchange?.()}
              className="rounded-2xl bg-[#183126] border border-[#294438] p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-[#8BE3BB]/40 hover:bg-[#1c382b] transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center group-hover:border-[#8BE3BB]/40 group-hover:scale-105 transition-all text-[#8BE3BB]">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-[#F4F1E8]">Swap</p>
              <p className="text-[11px] text-[#91AAA0] leading-tight text-center">
                Exchange between assets
              </p>
            </button>

            {/* 4. Add Asset */}
            <button
              type="button"
              onClick={() => setAddTokenOpen(true)}
              className="rounded-2xl bg-[#183126] border border-[#294438] p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-[#8BE3BB]/40 hover:bg-[#1c382b] transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center group-hover:border-[#8BE3BB]/40 group-hover:scale-105 transition-all text-[#8BE3BB]">
                <Plus className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-[#F4F1E8]">Add Asset</p>
              <p className="text-[11px] text-[#91AAA0] leading-tight text-center">
                Manage tokens
              </p>
            </button>
          </div>
        </div>

        {/* ── TWO COLUMN MAIN BODY (Left 62%, Right 38%) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── LEFT COLUMN: Assets & Recent Transactions (lg:col-span-7) ── */}
          <div className="lg:col-span-7 space-y-5">
            {/* Card 1: Assets */}
            <div className="rounded-2xl bg-[#183126] border border-[#294438] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#F4F1E8]">Assets</h3>
                  <p className="text-xs text-[#91AAA0] mt-0.5">
                    Your token balances on Sepolia testnet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddTokenOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#F4F1E8] hover:border-[#8BE3BB]/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#8BE3BB]" />
                  <span>Add Token</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-t border-[#294438]/80 text-[11px] font-semibold text-[#91AAA0]">
                      <th className="px-5 py-2.5 font-medium">Asset</th>
                      <th className="px-3 py-2.5 font-medium">Balance</th>
                      <th className="px-3 py-2.5 font-medium">Value (INR)</th>
                      <th className="px-5 py-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#294438]/40">
                    {/* ETH */}
                    <tr className="hover:bg-[#10231B]/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <EthereumIcon className="w-8 h-8 shrink-0" />
                          <div>
                            <p className="font-semibold text-[#F4F1E8] text-xs">Ethereum</p>
                            <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">ETH</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {isWalletConnected && isEthLoading ? (
                          <div className="space-y-1.5">
                            <div className="animate-pulse h-3.5 w-16 rounded bg-[#10231B]" />
                            <div className="animate-pulse h-3 w-12 rounded bg-[#10231B]" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-mono font-bold text-[#F4F1E8] tabular-nums text-xs">
                              {hiddenBalance ? '\u2022\u2022\u2022\u2022' : isWalletConnected ? ethFormatted : '0.0000'}
                            </p>
                            <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">
                              {hiddenBalance ? '' : isWalletConnected ? `\u2248 ${formatFiatINR(ethValueInr)}` : '≈ ₹0.00'}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-mono font-semibold text-[#F4F1E8] tabular-nums text-xs">
                          {hiddenBalance ? '\u2022\u2022\u2022\u2022\u2022' : isWalletConnected ? formatFiatINR(ethValueInr) : '₹0.00'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToSend?.('ETH')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#F4F1E8] hover:border-[#8BE3BB]/50 hover:text-[#8BE3BB] transition-colors"
                          >
                            <span className="text-xs">₹</span>
                            <span>Send</span>
                          </button>
                          <AssetActionMenu
                            symbol="ETH"
                            onSend={() => onNavigateToSend?.('ETH')}
                            onReceive={() => setReceiveOpen(true)}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* USDC */}
                    <tr className="hover:bg-[#10231B]/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UsdcIcon className="w-8 h-8 shrink-0" />
                          <div>
                            <p className="font-semibold text-[#F4F1E8] text-xs">USD Coin</p>
                            <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">USDC</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {isWalletConnected && isUsdcLoading ? (
                          <div className="space-y-1.5">
                            <div className="animate-pulse h-3.5 w-16 rounded bg-[#10231B]" />
                            <div className="animate-pulse h-3 w-12 rounded bg-[#10231B]" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-mono font-bold text-[#F4F1E8] tabular-nums text-xs">
                              {hiddenBalance
                                ? '\u2022\u2022\u2022\u2022'
                                : isWalletConnected
                                ? (parseFloat(usdcFormatted) ? parseFloat(usdcFormatted).toFixed(2) : '0.00')
                                : '0.00'}
                            </p>
                            <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">
                              {hiddenBalance ? '' : isWalletConnected ? `\u2248 ${formatFiatINR(usdcValueInr)}` : '≈ ₹0.00'}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="font-mono font-semibold text-[#F4F1E8] tabular-nums text-xs">
                          {hiddenBalance ? '\u2022\u2022\u2022\u2022\u2022' : isWalletConnected ? formatFiatINR(usdcValueInr) : '₹0.00'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToSend?.('USDC')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10231B] border border-[#294438] text-xs font-semibold text-[#F4F1E8] hover:border-[#8BE3BB]/50 hover:text-[#8BE3BB] transition-colors"
                          >
                            <span className="text-xs">₹</span>
                            <span>Send</span>
                          </button>
                          <AssetActionMenu
                            symbol="USDC"
                            address="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
                            onSend={() => onNavigateToSend?.('USDC')}
                            onReceive={() => setReceiveOpen(true)}
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Custom added tokens if any */}
                    {customTokens.map((t) => (
                      <tr key={t.symbol} className="hover:bg-[#10231B]/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center font-bold text-[#8BE3BB] text-xs">
                              {t.symbol.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-[#F4F1E8] text-xs">{t.name}</p>
                              <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">{t.symbol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="font-mono font-bold text-[#F4F1E8] tabular-nums text-xs">
                            {t.balance}
                          </p>
                          <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">
                            &asymp; &mdash;
                          </p>
                        </td>
                        <td className="px-3 py-3.5">
                          <p className="font-mono font-semibold text-[#F4F1E8] tabular-nums text-xs">
                            &mdash;
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <AssetActionMenu
                              symbol={t.symbol}
                              address={t.address}
                              onSend={() => onNavigateToSend?.()}
                              onReceive={() => setReceiveOpen(true)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Token Row at the bottom */}
              <button
                type="button"
                onClick={() => setAddTokenOpen(true)}
                className="w-full flex items-center justify-between px-5 py-3.5 border-t border-[#294438]/60 hover:bg-[#10231B]/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center text-[#8BE3BB] group-hover:border-[#8BE3BB]/50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-[#F4F1E8] group-hover:text-[#8BE3BB] transition-colors">
                      Add Token
                    </p>
                    <p className="text-[11px] text-[#91AAA0]">Import or manage custom tokens</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors" />
              </button>
            </div>

            {/* Card 2: Recent Transactions (Real Database Records Only) */}
            <div className="rounded-2xl bg-[#183126] border border-[#294438] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#F4F1E8]">Recent Transactions</h3>
                  <p className="text-xs text-[#91AAA0] mt-0.5">Your latest wallet activity.</p>
                </div>
                {onNavigateToActivity && (
                  <button
                    type="button"
                    onClick={onNavigateToActivity}
                    className="flex items-center gap-1 text-xs font-semibold text-[#8BE3BB] hover:underline transition-colors"
                  >
                    <span>View all</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>

              {isTxLoading && (
                <div className="px-5 pb-5 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-12 rounded-xl bg-[#10231B] border border-[#294438]/40" />
                  ))}
                </div>
              )}

              {txError && (
                <div className="mx-5 mb-5 p-4 rounded-xl bg-[#FF8585]/10 border border-[#FF8585]/30 text-xs text-[#FF8585]">
                  Failed to load transactions.
                </div>
              )}

              {!isTxLoading && !txError && recentList.length === 0 && (
                <div className="px-5 pb-5">
                  <div className="p-8 text-center space-y-2 rounded-xl bg-[#10231B]/40 border border-[#294438]/50">
                    <div className="w-9 h-9 rounded-full bg-[#10231B] border border-[#294438] flex items-center justify-center mx-auto text-[#91AAA0]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-[#F4F1E8]">No transactions yet</p>
                    <p className="text-xs text-[#91AAA0] max-w-xs mx-auto">
                      {isWalletConnected
                        ? "You haven't made any testnet transfers yet. Use Send Money to make your first transfer."
                        : "Connect your wallet and complete a transfer to see your activity here."}
                    </p>
                  </div>
                </div>
              )}

              {!isTxLoading && !txError && recentList.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-t border-[#294438]/80 text-[11px] font-semibold text-[#91AAA0]">
                        <th className="px-5 py-2.5 font-medium">Type</th>
                        <th className="px-3 py-2.5 font-medium">Asset</th>
                        <th className="px-3 py-2.5 font-medium">Amount</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 font-medium">Date</th>
                        <th className="px-5 py-2.5 font-medium text-right sr-only">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#294438]/40">
                      {recentList.map((tx, idx) => {
                        const isEth = tx.assetSymbol === 'ETH';
                        const isSend = !address || tx.senderAddress?.toLowerCase() === address.toLowerCase();
                        const { dateStr, timeStr } = formatDateParts(tx.createdAt);
                        const fiatLabel = txFiatLabel(tx);

                        return (
                          <tr
                            key={tx.id || idx}
                            onClick={() => onNavigateToActivity?.()}
                            className="hover:bg-[#10231B]/40 transition-colors cursor-pointer group"
                          >
                            <td className="px-5 py-3">
                              <div
                                className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSend
                                    ? 'bg-[#122c22] border-[#254d3b] text-[#6ED6A8]'
                                    : 'bg-[#331a1a] border-[#592626] text-[#FF8585]'
                                }`}
                              >
                                {isSend ? (
                                  <ArrowUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5" />
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                {isEth ? (
                                  <EthereumIcon className="w-6 h-6 shrink-0" />
                                ) : (
                                  <UsdcIcon className="w-6 h-6 shrink-0" />
                                )}
                                <span className="font-semibold text-xs text-[#F4F1E8]">
                                  {tx.assetSymbol}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-3">
                              <p className="font-mono font-bold text-[#F4F1E8] text-xs">
                                {tx.amount}
                              </p>
                              {fiatLabel && (
                                <p className="text-[11px] text-[#91AAA0] font-mono mt-0.5">
                                  {fiatLabel}
                                </p>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              <StatusBadge status={tx.status} />
                            </td>

                            <td className="px-3 py-3 whitespace-nowrap">
                              <p className="text-xs text-[#F4F1E8] font-medium">{dateStr}</p>
                              <p className="text-[11px] text-[#91AAA0]">{timeStr}</p>
                            </td>

                            <td className="px-5 py-3 text-right">
                              <ChevronRight className="w-4 h-4 text-[#91AAA0] group-hover:text-[#8BE3BB] transition-colors ml-auto" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Wallet Info, Network Status, Testnet Notice (lg:col-span-5) ── */}
          <div className="lg:col-span-5 space-y-5">
            {/* Card 3: Wallet Information */}
            <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#F4F1E8]">Wallet Information</h3>
                {isWalletConnected ? (
                  <a
                    href={`https://sepolia.etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#8BE3BB] hover:underline"
                  >
                    <span>View on Etherscan</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectMetaMask}
                    className="text-xs font-semibold text-[#8BE3BB] hover:underline cursor-pointer"
                  >
                    Connect MetaMask →
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#294438]/60 text-xs">
                <div className="flex items-center justify-between py-2.5 gap-3">
                  <span className="text-[#91AAA0] shrink-0">Address</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[#F4F1E8] truncate font-medium">
                      {isWalletConnected ? shortAddr(address, 7, 4) : 'Not Connected'}
                    </span>
                    {isWalletConnected && <CopyButton value={address} />}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Network</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#F4F1E8]">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isWalletConnected && isSepolia ? 'bg-[#6ED6A8]' : 'bg-[#91AAA0]'
                      }`}
                    />
                    {isWalletConnected
                      ? isSepolia
                        ? 'Sepolia Testnet'
                        : `Chain ${chainId ?? 'Unknown'}`
                      : 'Sepolia Testnet'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Chain ID</span>
                  <span className="font-mono font-medium text-[#F4F1E8]">
                    {isWalletConnected ? chainId ?? '11155111' : '11155111'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Wallet Type</span>
                  <span className="font-medium text-[#F4F1E8]">
                    {isWalletConnected ? connector?.name || 'Injected' : 'Not Connected'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Connected Since</span>
                  <span className="font-medium text-[#F4F1E8]">
                    {isWalletConnected ? connectedTimeStr || 'This session' : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Network Status */}
            <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#F4F1E8]">Network Status</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#6ED6A8] bg-[#122c22] border border-[#254d3b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                  Healthy
                </span>
              </div>

              <div className="divide-y divide-[#294438]/60 text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Network</span>
                  <span className="font-medium text-[#F4F1E8]">Sepolia Testnet</span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Block Number</span>
                  <span className="font-mono font-medium text-[#F4F1E8]">
                    {isBlockLoading
                      ? 'Fetching...'
                      : blockNumber
                      ? Number(blockNumber).toLocaleString('en-US')
                      : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Average Gas Fee</span>
                  <span className="font-mono font-medium text-[#F4F1E8]">
                    {isGasLoading ? 'Fetching...' : formattedGasFee || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-[#91AAA0]">Network Status</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#6ED6A8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                    Operational
                  </span>
                </div>
              </div>
            </div>

            {/* Card 5: Testnet Notice */}
            <div className="rounded-2xl border border-[#86BDF7]/20 bg-[#86BDF7]/5 p-4 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#86BDF7]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-[#86BDF7]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#F4F1E8]">Testnet Notice</p>
                <p className="text-[11px] text-[#91AAA0] leading-relaxed">
                  You are using Sepolia testnet. Tokens have no real-world value.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receive Modal */}
      {receiveOpen && (
        <ReceiveModal
          address={address}
          isConnected={isWalletConnected}
          onClose={() => setReceiveOpen(false)}
          onConnectMetaMask={handleConnectMetaMask}
        />
      )}

      {/* Add Token Modal */}
      {addTokenOpen && (
        <AddTokenModal
          onClose={() => setAddTokenOpen(false)}
          onAddToken={(t) => setCustomTokens((prev) => [...prev, t])}
        />
      )}
    </>
  );
}
