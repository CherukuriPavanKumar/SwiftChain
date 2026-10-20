'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatEther, isAddress, parseEther, parseUnits } from 'viem';
import { sepolia } from 'wagmi/chains';
import {
  useConnection,
  useEstimateGas,
  useGasPrice,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useConnect,
} from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  ChevronDown,
  Info,
  Shield,
  Globe,
  Clock,
  ArrowDown,
  BookUser,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { EthereumIcon, UsdcIcon } from './token-icons';
import { useTokenBalances } from '@/hooks/use-token-balances';
import { useEthPrice } from '@/app/components/eth-price-ticker';
import { SUPPORTED_TOKENS, ERC20_MINIMAL_ABI, type SupportedAssetSymbol } from '@/lib/tokens';
import { createTransfer, updateTransfer } from '@/lib/transfer-client';
import SettlementTrackerModal, { type SettlementTrackerData } from '@/app/components/settlement-tracker-modal';
import { ConnectWallet } from '@/wagmi/web_provider';

interface SendMoneyViewProps {
  initialAsset?: SupportedAssetSymbol;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function SendMoneyView({ initialAsset = 'ETH' }: SendMoneyViewProps) {
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useConnection();
  const { connect, connectors } = useConnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { data: marketData } = useEthPrice();
  const { ethRaw, usdcRaw, ethFormatted, usdcFormatted, refetchAll } = useTokenBalances();
  const { data: gasPriceWei } = useGasPrice({ chainId: sepolia.id });

  const isSepolia = chainId === sepolia.id;

  // Form State
  const [selectedAsset, setSelectedAsset] = useState<SupportedAssetSymbol>(initialAsset);
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeModalTransfer, setActiveModalTransfer] = useState<SettlementTrackerData | null>(null);

  useEffect(() => {
    if (initialAsset) {
      setSelectedAsset(initialAsset);
    }
  }, [initialAsset]);

  function handleReviewClick() {
    if (!isConnected) {
      if (typeof window !== 'undefined' && !(window as any).ethereum) {
        window.open('https://metamask.io/download/', '_blank');
        return;
      }
      const targetConnector =
        connectors.find((c) => c.id === 'io.metamask' || c.id === 'io.metamask.mobile') ||
        connectors.find((c) => c.id === 'metaMask' && c.type === 'injected') ||
        connectors.find((c) => c.id === 'injected' && c.name.toLowerCase().includes('metamask')) ||
        connectors.find((c) => c.id === 'injected') ||
        connectors.find((c) => c.name.toLowerCase().includes('metamask')) ||
        connectors[0];
      if (targetConnector) {
        connect({ connector: targetConnector });
      } else if (typeof window !== 'undefined' && (window as any).ethereum) {
        (window as any).ethereum.request({ method: 'eth_requestAccounts' }).catch(console.error);
      }
      return;
    }
    handleSubmit();
  }

  // Wagmi native ETH send hook
  const {
    data: ethTxHash,
    error: ethSendError,
    isPending: isEthSending,
    sendTransactionAsync,
  } = useSendTransaction();

  // Wagmi ERC-20 USDC write hook
  const {
    data: erc20TxHash,
    error: erc20SendError,
    isPending: isErc20Sending,
    writeContractAsync,
  } = useWriteContract();

  const isSending = selectedAsset === 'ETH' ? isEthSending : isErc20Sending;
  const activeTxHash = selectedAsset === 'ETH' ? ethTxHash : erc20TxHash;

  // Wait for on-chain receipt
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: activeTxHash,
  });

  // Automatically update status on receipt confirmation
  useEffect(() => {
    if (receipt?.status === 'success' && activeTxHash) {
      updateTransfer({
        transactionHash: activeTxHash,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        isSimulatedPayout: true,
        payoutStatus: 'simulated_completed',
        payoutCompletedAt: new Date().toISOString(),
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch(console.error);

      refetchAll().catch(console.error);
    } else if (receipt?.status === 'reverted' && activeTxHash) {
      updateTransfer({
        transactionHash: activeTxHash,
        status: 'failed',
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ['transfers'] }))
        .catch(console.error);
    }
  }, [receipt, activeTxHash, queryClient, refetchAll]);

  // Address validation
  const isValidRecipient = Boolean(recipient && isAddress(recipient.trim()));
  const trimmedRecipient = recipient.trim();

  // Amount parsing
  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  // Live currency conversions
  const tokenRateInr =
    selectedAsset === 'USDC'
      ? (marketData?.usdc?.inr ?? marketData?.fiatReference?.inrPerUsd ?? 94.88)
      : (marketData?.ethereum?.inr ?? marketData?.inr ?? 230000);

  const inrEstimate =
    isValidAmount && tokenRateInr ? parsedAmount * tokenRateInr : 0;

  // Native ETH Gas estimation
  let estimatedEthValue: bigint | undefined;
  try {
    estimatedEthValue =
      isValidAmount && selectedAsset === 'ETH' ? parseEther(amount) : undefined;
  } catch {
    estimatedEthValue = undefined;
  }

  const canEstimateGas = Boolean(
    address &&
      isSepolia &&
      isValidRecipient &&
      selectedAsset === 'ETH' &&
      estimatedEthValue !== undefined &&
      estimatedEthValue > BigInt(0)
  );

  const { data: gasEstimate, isLoading: isEstimatingGas } = useEstimateGas({
    account: address,
    chainId: sepolia.id,
    to: isValidRecipient ? (trimmedRecipient as `0x${string}`) : undefined,
    value: estimatedEthValue,
    query: { enabled: canEstimateGas },
  });

  // Calculate formatted gas estimate
  const formattedGasEstimate = useMemo(() => {
    if (isEstimatingGas) return 'Estimating...';
    if (gasEstimate && gasPriceWei) {
      const totalGasWei = gasEstimate * gasPriceWei;
      const ethVal = parseFloat(formatEther(totalGasWei));
      const inrVal = ethVal * (marketData?.inr ?? 230000);
      return `${ethVal.toFixed(5)} ETH (≈ ₹${inrVal.toFixed(2)})`;
    }
    if (gasPriceWei) {
      const standardUnits =
        selectedAsset === 'USDC' ? BigInt(65000) : BigInt(21000);
      const totalGasWei = standardUnits * gasPriceWei;
      const ethVal = parseFloat(formatEther(totalGasWei));
      const inrVal = ethVal * (marketData?.inr ?? 230000);
      return `~${ethVal.toFixed(5)} ETH (≈ ₹${inrVal.toFixed(2)})`;
    }
    return '--';
  }, [gasEstimate, gasPriceWei, isEstimatingGas, marketData, selectedAsset]);

  // Max balance handler
  function handleMax() {
    if (selectedAsset === 'USDC') {
      setAmount(usdcFormatted);
    } else {
      // Leave 0.001 ETH for gas
      const num = parseFloat(ethFormatted);
      const safeMax = Math.max(0, num - 0.001);
      setAmount(safeMax.toFixed(4));
    }
    setValidationError(null);
  }

  // Pre-submission validation
  function validateForm(): boolean {
    setValidationError(null);

    if (!isConnected || !address) {
      setValidationError('Please connect a wallet before submitting.');
      return false;
    }

    if (!isSepolia) {
      setValidationError('Unsupported network. Please switch to Ethereum Sepolia.');
      return false;
    }

    if (!recipient.trim()) {
      setValidationError('Please enter a recipient address.');
      return false;
    }

    if (!isAddress(recipient.trim())) {
      setValidationError('Invalid Ethereum address. Must be a 42-character 0x... hex address.');
      return false;
    }

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Enter a valid transfer amount greater than zero.');
      return false;
    }

    // Balance checks
    if (selectedAsset === 'USDC') {
      const units = parseUnits(amount, SUPPORTED_TOKENS.USDC.decimals);
      if (usdcRaw < units) {
        setValidationError(`Insufficient USDC balance. You have ${usdcFormatted} USDC.`);
        return false;
      }
      if (ethRaw <= BigInt(0)) {
        setValidationError('Insufficient Sepolia ETH for gas. Gas fees must be paid in Sepolia ETH.');
        return false;
      }
    } else {
      const units = parseEther(amount);
      if (ethRaw < units) {
        setValidationError(`Insufficient ETH balance. You have ${ethFormatted} ETH.`);
        return false;
      }
    }

    return true;
  }

  // Submit transfer
  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    const to = trimmedRecipient as `0x${string}`;

    try {
      let txHash: `0x${string}`;

      if (selectedAsset === 'ETH') {
        const value = parseEther(amount);
        txHash = await sendTransactionAsync({ to, value });
      } else {
        const units = parseUnits(amount, SUPPORTED_TOKENS.USDC.decimals);
        const usdcAddress = SUPPORTED_TOKENS.USDC.contractAddress!;
        txHash = await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_MINIMAL_ABI,
          functionName: 'transfer',
          args: [to, units],
        });
      }

      // Record pending transfer in Neon Postgres
      const created = await createTransfer({
        senderAddress: address!,
        recipientAddress: to,
        amount,
        chainId: sepolia.id,
        assetSymbol: selectedAsset,
        tokenAddress: selectedAsset === 'USDC' ? SUPPORTED_TOKENS.USDC.contractAddress : null,
        inrSourceAmount: inrEstimate > 0 ? inrEstimate.toFixed(2) : null,
        referenceRate: tokenRateInr.toString(),
        estimatedDestinationUsd:
          selectedAsset === 'USDC'
            ? parsedAmount.toFixed(2)
            : (parsedAmount * (marketData?.usd ?? 2400)).toFixed(2),
        status: 'pending',
        transactionHash: txHash,
        isSimulatedPayout: true,
        payoutStatus: 'pending',
      });

      await queryClient.invalidateQueries({ queryKey: ['transfers'] });

      // Open settlement tracker modal immediately with created record
      setActiveModalTransfer({
        id: created.id,
        senderAddress: address!,
        recipientAddress: to,
        amount,
        assetSymbol: selectedAsset,
        chainId: sepolia.id,
        inrSourceAmount: inrEstimate > 0 ? inrEstimate.toFixed(2) : null,
        status: 'pending',
        transactionHash: txHash,
        isSimulatedPayout: true,
        payoutStatus: 'pending',
      });
    } catch (err: unknown) {
      console.error('Transfer execution failed:', err);
      const msg = err instanceof Error ? err.message : 'Transaction was rejected or failed.';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setValidationError('Transaction was cancelled in your wallet.');
      } else {
        setValidationError(msg);
      }
    }
  }

  const isFormComplete = Boolean(
    isConnected &&
      isSepolia &&
      isValidRecipient &&
      isValidAmount &&
      !isSending
  );

  return (
    <div className="pt-6 animate-in fade-in duration-150">
      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3-Step Guided Transfer Form (approx 62% width) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Validation Notice Banner */}
          {validationError && (
            <div
              className="p-3.5 rounded-xl bg-[#FF8585]/10 border border-[#FF8585]/30 text-xs text-[#FF8585] flex items-center gap-2.5 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Network Warning Banner */}
          {isConnected && !isSepolia && (
            <div className="p-3.5 rounded-xl bg-[#F2C66D]/10 border border-[#F2C66D]/30 text-xs text-[#F2C66D] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You are connected to an unsupported network.</span>
              </div>
              <button
                type="button"
                onClick={() => switchChain({ chainId: sepolia.id })}
                disabled={isSwitchingChain}
                className="px-3 py-1 rounded-lg bg-[#F2C66D]/20 hover:bg-[#F2C66D]/30 text-xs font-semibold text-[#F2C66D] transition-colors"
              >
                {isSwitchingChain ? 'Switching...' : 'Switch to Sepolia'}
              </button>
            </div>
          )}

          {/* ================= STEP 1: RECIPIENT ================= */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#183126] border border-[#294438] text-[#8BE3BB] flex items-center justify-center font-bold text-xs shrink-0">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Recipient</h3>
                <p className="text-xs text-[#91AAA0]">
                  Enter the recipient&apos;s wallet address (or ENS name).
                </p>
              </div>
            </div>

            {/* Recipient Input Box */}
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[#10231B] border border-[#294438] focus-within:border-[#8BE3BB]/60 transition-colors">
              <Wallet className="w-4 h-4 text-[#91AAA0] shrink-0" />
              <input
                type="text"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setValidationError(null);
                }}
                placeholder="0x... or name.eth"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-mono text-[#F4F1E8] placeholder:text-[#91AAA0]/50"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const clip = await navigator.clipboard.readText();
                    if (clip) setRecipient(clip.trim());
                  } catch {}
                }}
                title="Paste from clipboard"
                className="text-[#91AAA0] hover:text-[#8BE3BB] transition-colors shrink-0"
              >
                <BookUser className="w-4 h-4" />
              </button>
            </div>

            {recipient && !isValidRecipient && (
              <p className="text-[11px] text-[#FF8585] font-mono">
                ⚠ Please enter a valid 42-character Ethereum address (0x...)
              </p>
            )}
          </div>

          {/* ================= STEP 2: ASSET & AMOUNT ================= */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#183126] border border-[#294438] text-[#8BE3BB] flex items-center justify-center font-bold text-xs shrink-0">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Asset & Amount</h3>
                <p className="text-xs text-[#91AAA0]">
                  Select the asset you want to send and enter the amount.
                </p>
              </div>
            </div>

            {/* Input Row: Asset selector (Left) + Amount input (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Asset Selector */}
              <div className="space-y-1 relative">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#91AAA0]">
                  Asset
                </span>
                <button
                  type="button"
                  onClick={() => setAssetDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#10231B] border border-[#294438] hover:border-[#8BE3BB]/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {selectedAsset === 'USDC' ? (
                      <UsdcIcon className="w-7 h-7" />
                    ) : (
                      <EthereumIcon className="w-7 h-7" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-[#F4F1E8] font-mono leading-tight">
                        {selectedAsset}
                      </p>
                      <p className="text-[11px] text-[#91AAA0]">
                        {selectedAsset === 'USDC' ? 'USD Coin' : 'Ethereum'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#91AAA0]" />
                </button>

                {/* Asset Dropdown */}
                {assetDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full rounded-xl bg-[#10231B] border border-[#294438] p-1.5 shadow-xl z-20 space-y-1">
                    {(['ETH', 'USDC'] as SupportedAssetSymbol[]).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          setSelectedAsset(sym);
                          setAssetDropdownOpen(false);
                          setValidationError(null);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                          selectedAsset === sym
                            ? 'bg-[#183126] text-[#8BE3BB]'
                            : 'text-[#91AAA0] hover:text-[#F4F1E8] hover:bg-[#183126]/50'
                        }`}
                      >
                        {sym === 'USDC' ? (
                          <UsdcIcon className="w-6 h-6" />
                        ) : (
                          <EthereumIcon className="w-6 h-6" />
                        )}
                        <div>
                          <p className="text-xs font-bold font-mono">{sym}</p>
                          <p className="text-[10px] text-[#91AAA0]">
                            {sym === 'USDC' ? 'USD Coin (ERC-20)' : 'Native Ethereum'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-[#91AAA0]">
                  Amount
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#10231B] border border-[#294438] focus-within:border-[#8BE3BB]/60 transition-colors gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setAmount(val);
                        setValidationError(null);
                      }
                    }}
                    placeholder="0.0"
                    className="w-full bg-transparent border-none outline-none text-base font-bold font-mono text-[#F4F1E8] placeholder:text-[#91AAA0]/40"
                  />
                  <button
                    type="button"
                    onClick={handleMax}
                    className="px-2.5 py-1 rounded-lg bg-[#183126] border border-[#294438] text-xs font-semibold text-[#8BE3BB] hover:bg-[#294438] transition-colors shrink-0"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            {/* Balance Helper Line */}
            <div className="text-xs text-[#91AAA0] pt-0.5 flex items-center justify-between flex-wrap gap-2">
              <span>
                Balance:{' '}
                <span className="font-mono text-[#F4F1E8]">
                  {selectedAsset === 'USDC' ? `${usdcFormatted} USDC` : `${ethFormatted} ETH`}
                </span>{' '}
                <span className="font-mono text-[#91AAA0]">
                  (≈ ₹
                  {selectedAsset === 'USDC'
                    ? ((parseFloat(usdcFormatted) || 0) * (marketData?.usdc?.inr ?? 94.88)).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : ((parseFloat(ethFormatted) || 0) * (marketData?.inr ?? 230000)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  )
                </span>
              </span>
            </div>
          </div>

          {/* ================= STEP 3: REVIEW & SEND ================= */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#183126] border border-[#294438] text-[#8BE3BB] flex items-center justify-center font-bold text-xs shrink-0">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Review & Send</h3>
                <p className="text-xs text-[#91AAA0]">
                  Review the details and confirm the transaction in your wallet.
                </p>
              </div>
            </div>

            {/* Info Notice Box */}
            <div className="p-3.5 rounded-xl bg-[#10231B] border border-[#294438] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#8BE3BB] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#F4F1E8]">
                  You&apos;ll confirm this transaction in MetaMask.
                </p>
                <p className="text-[11px] text-[#91AAA0] mt-0.5">
                  Make sure you&apos;re connected to Sepolia testnet.
                </p>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              type="button"
              onClick={handleReviewClick}
              disabled={isConnected && (!isFormComplete || isSending || isConfirming)}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                !isConnected
                  ? 'bg-[#1e3d30] hover:bg-[#254d3b] text-[#8BE3BB] border border-[#294438] shadow-sm cursor-pointer'
                  : isFormComplete && !isSending && !isConfirming
                  ? 'bg-[#1e3d30] hover:bg-[#254d3b] text-[#8BE3BB] border border-[#294438] shadow-sm active:scale-[0.99] cursor-pointer'
                  : 'bg-[#142920] text-[#91AAA0]/50 border border-[#294438]/50 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <span>Awaiting signature in wallet...</span>
              ) : isConfirming ? (
                <span>Confirming on Sepolia...</span>
              ) : !isConnected ? (
                <span>Connect MetaMask & Review →</span>
              ) : (
                <span>Review transfer →</span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Transaction Summary + Important Notes (approx 38% width) */}
        <div className="lg:col-span-5 space-y-5">
          {/* ================= TRANSACTION SUMMARY PANEL ================= */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-[#F4F1E8]">Transaction Summary</h3>
              <p className="text-xs text-[#91AAA0] mt-0.5">Estimated details for this transfer.</p>
            </div>

            {/* Visual Transfer Flow Diagram */}
            <div className="rounded-xl bg-[#10231B] border border-[#294438] p-4 space-y-3.5">
              {/* "You send" */}
              <div className="flex items-center gap-3">
                {selectedAsset === 'USDC' ? (
                  <UsdcIcon className="w-8 h-8" />
                ) : (
                  <EthereumIcon className="w-8 h-8" />
                )}
                <div>
                  <p className="text-[11px] text-[#91AAA0]">You send</p>
                  <p className="text-base font-bold text-[#F4F1E8] font-mono leading-tight">
                    {amount ? `${amount} ${selectedAsset}` : `0 ${selectedAsset}`}
                  </p>
                  <p className="text-[11px] text-[#91AAA0] font-mono">
                    ≈ ₹{inrEstimate > 0 ? inrEstimate.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Centered Directional Arrow */}
              <div className="flex items-center justify-start pl-3.5">
                <div className="w-6 h-6 rounded-full bg-[#8BE3BB] text-[#071410] flex items-center justify-center shadow-xs">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>

              {/* "To" Recipient */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#183126] border border-[#294438] flex items-center justify-center text-xs text-[#91AAA0]">
                  👤
                </div>
                <div>
                  <p className="text-[11px] text-[#91AAA0]">To</p>
                  <p className="text-sm font-mono font-medium text-[#F4F1E8]">
                    {recipient ? truncateAddress(trimmedRecipient) : '0x...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Breakdown Metrics */}
            <div className="space-y-2.5 pt-1 text-xs divide-y divide-[#294438]/40">
              <div className="flex items-center justify-between pt-2 first:pt-0">
                <span className="text-[#91AAA0]">Network</span>
                <span className="inline-flex items-center gap-1.5 text-[#6ED6A8] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                  Sepolia Testnet
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#91AAA0]">Estimated gas fee</span>
                <span className="font-mono font-medium text-[#F4F1E8]">
                  {formattedGasEstimate}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#91AAA0]">Estimated time</span>
                <span className="font-medium text-[#F4F1E8]">~ 15–30 seconds</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleReviewClick}
              disabled={isConnected && (!isFormComplete || isSending || isConfirming)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center ${
                !isConnected
                  ? 'bg-[#10231B] hover:bg-[#142920] text-[#8BE3BB] border border-[#294438] cursor-pointer'
                  : isFormComplete && !isSending && !isConfirming
                  ? 'bg-[#10231B] hover:bg-[#142920] text-[#8BE3BB] border border-[#294438] cursor-pointer'
                  : 'bg-[#10231B]/60 text-[#91AAA0]/50 border border-[#294438]/40 cursor-not-allowed'
              }`}
            >
              {isSending
                ? 'Confirming in Wallet...'
                : isConfirming
                ? 'Processing on-chain...'
                : !isConnected
                ? 'Connect in MetaMask'
                : 'Confirm in MetaMask'}
            </button>
          </div>

          {/* ================= IMPORTANT NOTES PANEL ================= */}
          <div className="rounded-2xl bg-[#183126] border border-[#294438] p-5.5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#8BE3BB]" />
              <h3 className="text-sm font-bold text-[#F4F1E8]">Important Notes</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Note 1 */}
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-[#91AAA0] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#F4F1E8]">This is a testnet</p>
                  <p className="text-[11px] text-[#91AAA0] mt-0.5">
                    You are using Sepolia testnet. Tokens have no real-world value.
                  </p>
                </div>
              </div>

              {/* Note 2 */}
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-[#91AAA0] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#F4F1E8]">Double-check the address</p>
                  <p className="text-[11px] text-[#91AAA0] mt-0.5">
                    Crypto transactions are irreversible.
                  </p>
                </div>
              </div>

              {/* Note 3 */}
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#91AAA0] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#F4F1E8]">Keep some ETH for gas</p>
                  <p className="text-[11px] text-[#91AAA0] mt-0.5">
                    Ensure you have enough SEP ETH to cover network fees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Settlement Tracker Modal */}
      {activeModalTransfer && (
        <SettlementTrackerModal
          transfer={activeModalTransfer}
          isOpen={Boolean(activeModalTransfer)}
          onClose={() => setActiveModalTransfer(null)}
        />
      )}
    </div>
  );
}
