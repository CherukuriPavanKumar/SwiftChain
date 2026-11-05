'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { encodeFunctionData, formatEther, isAddress, parseEther, parseUnits } from 'viem';
import { sepolia } from 'wagmi/chains';
import { getSepoliaGasAndFees, pollReceiptAndConfirm } from '@/lib/tx-helper';
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
  User,
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
  const [copiedRpc, setCopiedRpc] = useState(false);
  const [activeModalTransfer, setActiveModalTransfer] = useState<SettlementTrackerData | null>(null);

  async function handleSwitchMetaMaskRpc() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xaa36a7',
              chainName: 'Sepolia (Thirdweb)',
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://11155111.rpc.thirdweb.com', 'https://gateway.tenderly.co/public/sepolia'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
        setValidationError(null);
      } catch (e: any) {
        console.error('Failed to update RPC in wallet:', e);
      }
    }
  }

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
    if (isEstimatingGas) return 'Estimating\u2026';
    if (gasEstimate && gasPriceWei) {
      const totalGasWei = gasEstimate * gasPriceWei;
      const ethVal = parseFloat(formatEther(totalGasWei));
      const inrVal = ethVal * (marketData?.inr ?? 230000);
      return `${ethVal.toFixed(5)} ETH (\u2248 \u20b9${inrVal.toFixed(2)})`;
    }
    if (gasPriceWei) {
      const standardUnits =
        selectedAsset === 'USDC' ? BigInt(65000) : BigInt(21000);
      const totalGasWei = standardUnits * gasPriceWei;
      const ethVal = parseFloat(formatEther(totalGasWei));
      const inrVal = ethVal * (marketData?.inr ?? 230000);
      return `~${ethVal.toFixed(5)} ETH (\u2248 \u20b9${inrVal.toFixed(2)})`;
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
      setValidationError('Invalid Ethereum address. Must be a 42-character 0x\u2026 hex address.');
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
        const feeParams = await getSepoliaGasAndFees({
          account: address!,
          to,
          value,
          isErc20: false,
        });
        txHash = await sendTransactionAsync({
          to,
          value,
          gas: feeParams.gas,
          gasPrice: feeParams.gasPrice,
        });
      } else {
        const units = parseUnits(amount, SUPPORTED_TOKENS.USDC.decimals);
        const usdcAddress = SUPPORTED_TOKENS.USDC.contractAddress!;
        const data = encodeFunctionData({
          abi: ERC20_MINIMAL_ABI,
          functionName: 'transfer',
          args: [to, units],
        });
        const feeParams = await getSepoliaGasAndFees({
          account: address!,
          to: usdcAddress,
          data,
          isErc20: true,
        });
        txHash = await sendTransactionAsync({
          to: usdcAddress,
          data,
          gas: feeParams.gas,
          gasPrice: feeParams.gasPrice,
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

      // Independently poll for confirmation via our resilient RPC (not Infura/wagmi)
      pollReceiptAndConfirm({
        txHash,
        onConfirmed: () => {
          const now = new Date().toISOString();
          // Update the modal in-place so stages 4 & 5 flip to confirmed
          setActiveModalTransfer((prev) =>
            prev ? {
              ...prev,
              status: 'confirmed',
              confirmedAt: now,
              payoutStatus: 'simulated_completed',
              payoutCompletedAt: now,
            } : null
          );
          queryClient.invalidateQueries({ queryKey: ['transfers'] }).catch(console.error);
          refetchAll().catch(console.error);
        },
        onFailed: () => {
          setActiveModalTransfer((prev) =>
            prev ? { ...prev, status: 'failed', payoutStatus: 'failed' } : null
          );
          queryClient.invalidateQueries({ queryKey: ['transfers'] }).catch(console.error);
        },
      });

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
      const fullMsg = [
        err instanceof Error ? err.message : '',
        (err as any)?.details || '',
        (err as any)?.shortMessage || '',
        (err as any)?.cause?.message || '',
      ].join(' ');

      if (fullMsg.includes('User rejected') || fullMsg.includes('user rejected')) {
        setValidationError('Transaction was cancelled in your wallet.');
      } else if (
        fullMsg.includes('too many errors') ||
        fullMsg.includes('different RPC endpoint') ||
        fullMsg.includes('Requested resource not available') ||
        fullMsg.includes('0xaa36a7') ||
        fullMsg.includes('Infura')
      ) {
        setValidationError(
          "MetaMask’s default Infura RPC is rate-limiting Sepolia requests. Switch your RPC to Thirdweb or Publicnode."
        );
      } else {
        setValidationError(err instanceof Error ? err.message : 'Transaction was rejected or failed.');
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

  /* Shared class tokens */
  const cardCls = 'rounded-xl bg-[#0d1e17] border border-[#233a30] p-5 space-y-4';
  const inputWrapCls = 'flex items-center gap-3 px-3.5 py-3 rounded-lg bg-[#071410] border border-[#233a30] focus-within:border-[#8BE3BB]/50 transition-colors duration-150';
  const stepBadgeCls = 'w-6 h-6 rounded-full bg-[#152920] border border-[#233a30] text-[#8BE3BB] flex items-center justify-center font-bold text-xs shrink-0 tabular-nums';

  return (
    <div className="pt-6 animate-in fade-in duration-150">
      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3-Step Guided Transfer Form */}
        <div className="lg:col-span-7 space-y-4">

          {/* Validation Notice Banner */}
          {validationError && (
            <div
              className="p-3.5 rounded-lg bg-[#FF8585]/[0.08] border border-[#FF8585]/25 text-xs text-[#FF8585] space-y-2.5"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span className="leading-relaxed">{validationError}</span>
              </div>
              {validationError.includes('Infura') && (
                <div className="flex flex-wrap items-center gap-2 pl-6 pt-0.5">
                  <button
                    type="button"
                    onClick={handleSwitchMetaMaskRpc}
                    className="px-2.5 py-1 rounded-md bg-[#152920] border border-[#233a30] text-[#8BE3BB] hover:bg-[#1e3d30] font-medium transition-colors duration-150 cursor-pointer text-xs"
                  >
                    Switch MetaMask RPC (1-click)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://11155111.rpc.thirdweb.com');
                      setCopiedRpc(true);
                      setTimeout(() => setCopiedRpc(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#071410] border border-[#233a30] text-[#a6b8b0] hover:text-[#F4F1E8] font-medium transition-colors duration-150 cursor-pointer text-xs"
                  >
                    {copiedRpc ? 'Copied URL!' : 'Copy Thirdweb RPC'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Network Warning Banner */}
          {isConnected && !isSepolia && (
            <div className="p-3 rounded-lg bg-[#F2C66D]/[0.08] border border-[#F2C66D]/25 text-xs text-[#F2C66D] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You are connected to an unsupported network.</span>
              </div>
              <button
                type="button"
                onClick={() => switchChain({ chainId: sepolia.id })}
                disabled={isSwitchingChain}
                className="px-3 py-1 rounded-md bg-[#F2C66D]/15 hover:bg-[#F2C66D]/25 text-xs font-semibold text-[#F2C66D] transition-colors duration-150 shrink-0"
              >
                {isSwitchingChain ? 'Switching\u2026' : 'Switch to Sepolia'}
              </button>
            </div>
          )}

          {/* STEP 1: RECIPIENT */}
          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <span className={stepBadgeCls}>1</span>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Recipient</h3>
                <p className="text-xs text-[#7a9187] mt-0.5">
                  Enter the wallet address or ENS name.
                </p>
              </div>
            </div>

            {/* Recipient Input */}
            <div className={inputWrapCls}>
              <Wallet className="w-4 h-4 text-[#7a9187] shrink-0" />
              <input
                type="text"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setValidationError(null);
                }}
                placeholder="0x\u2026 or name.eth"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-mono text-[#F4F1E8] placeholder:text-[#7a9187]/50"
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
                className="text-[#7a9187] hover:text-[#8BE3BB] transition-colors duration-150 shrink-0"
              >
                <BookUser className="w-4 h-4" />
              </button>
            </div>

            {recipient && !isValidRecipient && (
              <p className="text-xs text-[#FF8585] font-mono">
                Enter a valid 42-character Ethereum address starting with 0x
              </p>
            )}
          </div>

          {/* STEP 2: ASSET & AMOUNT */}
          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <span className={stepBadgeCls}>2</span>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Asset &amp; Amount</h3>
                <p className="text-xs text-[#7a9187] mt-0.5">
                  Choose an asset and enter the amount to send.
                </p>
              </div>
            </div>

            {/* Input Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Asset Selector */}
              <div className="space-y-1.5 relative">
                <span className="text-xs text-[#7a9187]">Asset</span>
                <button
                  type="button"
                  onClick={() => setAssetDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#071410] border border-[#233a30] hover:border-[#8BE3BB]/35 transition-colors duration-150 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    {selectedAsset === 'USDC' ? (
                      <UsdcIcon className="w-7 h-7" />
                    ) : (
                      <EthereumIcon className="w-7 h-7" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-[#F4F1E8] font-mono leading-tight tabular-nums">
                        {selectedAsset}
                      </p>
                      <p className="text-xs text-[#7a9187]">
                        {selectedAsset === 'USDC' ? 'USD Coin' : 'Ethereum'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#7a9187]" />
                </button>

                {/* Asset Dropdown */}
                {assetDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full rounded-lg bg-[#0d1e17] border border-[#233a30] p-1 shadow-lg z-20 space-y-0.5">
                    {(['ETH', 'USDC'] as SupportedAssetSymbol[]).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          setSelectedAsset(sym);
                          setAssetDropdownOpen(false);
                          setValidationError(null);
                        }}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-md text-left transition-colors duration-150 ${
                          selectedAsset === sym
                            ? 'bg-[#152920] text-[#8BE3BB]'
                            : 'text-[#a6b8b0] hover:text-[#F4F1E8] hover:bg-[#152920]/60'
                        }`}
                      >
                        {sym === 'USDC' ? (
                          <UsdcIcon className="w-6 h-6" />
                        ) : (
                          <EthereumIcon className="w-6 h-6" />
                        )}
                        <div>
                          <p className="text-xs font-bold font-mono tabular-nums">{sym}</p>
                          <p className="text-xs text-[#7a9187]">
                            {sym === 'USDC' ? 'USD Coin \u00b7 ERC-20' : 'Native Ethereum'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <span className="text-xs text-[#7a9187]">Amount</span>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#071410] border border-[#233a30] focus-within:border-[#8BE3BB]/50 transition-colors duration-150 gap-2">
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
                    className="w-full bg-transparent border-none outline-none text-base font-bold font-mono tabular-nums text-[#F4F1E8] placeholder:text-[#7a9187]/40"
                  />
                  <button
                    type="button"
                    onClick={handleMax}
                    className="px-2.5 py-1 rounded-md bg-[#152920] border border-[#233a30] text-xs font-semibold text-[#8BE3BB] hover:bg-[#233a30] transition-colors duration-150 shrink-0"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            {/* Balance helper */}
            <div className="text-xs text-[#7a9187] flex items-center justify-between flex-wrap gap-2">
              <span>
                Balance:{' '}
                <span className="font-mono tabular-nums text-[#a6b8b0]">
                  {selectedAsset === 'USDC' ? `${usdcFormatted} USDC` : `${ethFormatted} ETH`}
                </span>{' '}
                <span className="font-mono tabular-nums">
                  (\u2248&nbsp;\u20b9
                  {selectedAsset === 'USDC'
                    ? ((parseFloat(usdcFormatted) || 0) * (marketData?.usdc?.inr ?? 94.88)).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : ((parseFloat(ethFormatted) || 0) * (marketData?.inr ?? 230000)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  )
                </span>
              </span>
            </div>
          </div>

          {/* STEP 3: REVIEW & SEND */}
          <div className={cardCls}>
            <div className="flex items-center gap-3">
              <span className={stepBadgeCls}>3</span>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1E8]">Review &amp; Send</h3>
                <p className="text-xs text-[#7a9187] mt-0.5">
                  Confirm the details and approve in your wallet.
                </p>
              </div>
            </div>

            {/* Info callout */}
            <div className="p-3 rounded-lg bg-[#071410] border border-[#233a30] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#8BE3BB] shrink-0 mt-px" />
              <div>
                <p className="text-xs font-semibold text-[#F4F1E8]">
                  You&apos;ll confirm this transaction in MetaMask.
                </p>
                <p className="text-xs text-[#7a9187] mt-0.5">
                  Make sure you&apos;re connected to Sepolia testnet.
                </p>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={handleReviewClick}
              disabled={isConnected && (!isFormComplete || isSending || isConfirming)}
              className={`w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 ${
                !isConnected
                  ? 'bg-[#152920] hover:bg-[#1e3d30] text-[#8BE3BB] border border-[#233a30] cursor-pointer'
                  : isFormComplete && !isSending && !isConfirming
                  ? 'bg-[#152920] hover:bg-[#1e3d30] text-[#8BE3BB] border border-[#233a30] active:scale-[0.99] cursor-pointer'
                  : 'bg-[#0d1e17] text-[#7a9187]/50 border border-[#233a30]/50 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <span>Awaiting signature in wallet\u2026</span>
              ) : isConfirming ? (
                <span>Confirming on Sepolia\u2026</span>
              ) : !isConnected ? (
                <span>Connect MetaMask &amp; review</span>
              ) : (
                <span>Review transfer</span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Summary + Notes */}
        <div className="lg:col-span-5 space-y-4">

          {/* TRANSACTION SUMMARY PANEL */}
          <div className={cardCls}>
            <div>
              <h3 className="text-sm font-bold text-[#F4F1E8]">Transaction summary</h3>
              <p className="text-xs text-[#7a9187] mt-0.5">Estimated details for this transfer.</p>
            </div>

            {/* Visual Transfer Flow */}
            <div className="rounded-lg bg-[#071410] border border-[#233a30] p-4 space-y-3">
              {/* You send */}
              <div className="flex items-center gap-3">
                {selectedAsset === 'USDC' ? (
                  <UsdcIcon className="w-8 h-8" />
                ) : (
                  <EthereumIcon className="w-8 h-8" />
                )}
                <div>
                  <p className="text-xs text-[#7a9187]">You send</p>
                  <p className="text-base font-bold text-[#F4F1E8] font-mono tabular-nums leading-tight">
                    {amount ? `${amount} ${selectedAsset}` : `0 ${selectedAsset}`}
                  </p>
                  <p className="text-xs text-[#7a9187] font-mono tabular-nums">
                    \u2248&nbsp;\u20b9{inrEstimate > 0 ? inrEstimate.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center pl-3">
                <div className="w-6 h-6 rounded-full bg-[#8BE3BB] text-[#071410] flex items-center justify-center">
                  <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              </div>

              {/* Recipient */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#152920] border border-[#233a30] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#7a9187]" />
                </div>
                <div>
                  <p className="text-xs text-[#7a9187]">To</p>
                  <p className="text-sm font-mono font-medium tabular-nums text-[#F4F1E8]">
                    {recipient ? truncateAddress(trimmedRecipient) : '0x\u2026'}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="text-xs divide-y divide-[#233a30]/50">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#7a9187]">Network</span>
                <span className="inline-flex items-center gap-1.5 text-[#6ED6A8] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6ED6A8]" />
                  Sepolia testnet
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#7a9187]">Estimated gas fee</span>
                <span className="font-mono font-medium tabular-nums text-[#F4F1E8]">
                  {formattedGasEstimate}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#7a9187]">Estimated time</span>
                <span className="font-medium text-[#F4F1E8]">15\u201330 seconds</span>
              </div>
            </div>

            {/* Secondary CTA */}
            <button
              type="button"
              onClick={handleReviewClick}
              disabled={isConnected && (!isFormComplete || isSending || isConfirming)}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-150 text-center ${
                !isConnected
                  ? 'bg-[#071410] hover:bg-[#0d1e17] text-[#8BE3BB] border border-[#233a30] cursor-pointer'
                  : isFormComplete && !isSending && !isConfirming
                  ? 'bg-[#071410] hover:bg-[#0d1e17] text-[#8BE3BB] border border-[#233a30] cursor-pointer'
                  : 'bg-[#071410]/60 text-[#7a9187]/50 border border-[#233a30]/40 cursor-not-allowed'
              }`}
            >
              {isSending
                ? 'Confirming in wallet\u2026'
                : isConfirming
                ? 'Processing on-chain\u2026'
                : !isConnected
                ? 'Connect in MetaMask'
                : 'Confirm in MetaMask'}
            </button>
          </div>

          {/* IMPORTANT NOTES PANEL */}
          <div className={cardCls}>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#8BE3BB] shrink-0" />
              <h3 className="text-sm font-bold text-[#F4F1E8]">Important notes</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-[#7a9187] shrink-0 mt-px" />
                <div>
                  <p className="font-semibold text-[#F4F1E8]">This is a testnet</p>
                  <p className="text-xs text-[#7a9187] mt-0.5">
                    Sepolia tokens have no real-world value.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-[#7a9187] shrink-0 mt-px" />
                <div>
                  <p className="font-semibold text-[#F4F1E8]">Double-check the address</p>
                  <p className="text-xs text-[#7a9187] mt-0.5">
                    Crypto transfers are irreversible once confirmed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#7a9187] shrink-0 mt-px" />
                <div>
                  <p className="font-semibold text-[#F4F1E8]">Keep ETH for gas</p>
                  <p className="text-xs text-[#7a9187] mt-0.5">
                    Ensure you have enough Sepolia ETH to cover network fees.
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
