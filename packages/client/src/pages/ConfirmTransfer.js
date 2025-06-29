import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Wallet, ArrowRight, CheckCircle, ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import metaMaskService from '../services/metamask';

const ConfirmTransfer = () => {
  const navigate = useNavigate();
  const [transferData, setTransferData] = useState(null);
  const [walletStatus, setWalletStatus] = useState({
    isConnected: false,
    account: null,
    isSepolia: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [balances, setBalances] = useState({
    eth: '0',
    usdt: '0'
  });

  useEffect(() => {
    // Get transfer data from session storage
    const storedData = sessionStorage.getItem('transferData');
    if (!storedData) {
      toast.error('No transfer data found. Please start over.');
      navigate('/');
      return;
    }

    setTransferData(JSON.parse(storedData));
    checkWalletConnection();
  }, [navigate]);

  const checkWalletConnection = async () => {
    const status = metaMaskService.getConnectionStatus();
    setWalletStatus(status);
    
    if (status.isConnected && status.account) {
      loadBalances(status.account);
    }
  };

  const loadBalances = async (address) => {
    try {
      const ethBalance = await metaMaskService.getETHBalance(address);
      const usdtBalance = await metaMaskService.getUSDTBalance(address);
      setBalances({
        eth: ethBalance,
        usdt: usdtBalance
      });
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      await metaMaskService.connect();
      await metaMaskService.switchToSepolia();
      checkWalletConnection();
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTransfer = async () => {
    if (!walletStatus.isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!walletStatus.isSepolia) {
      toast.error('Please switch to Sepolia network');
      return;
    }

    const { receiverAddress, conversion, currency } = transferData;
    const cryptoAmount = parseFloat(conversion.convertedAmount);

    // Check balance based on currency
    if (currency === 'USDT') {
      if (parseFloat(balances.usdt) < cryptoAmount) {
        toast.error(`Insufficient USDT balance. You have ${balances.usdt} USDT, need ${cryptoAmount} USDT`);
        return;
      }
    } else if (currency === 'ETH') {
      if (parseFloat(balances.eth) < cryptoAmount) {
        toast.error(`Insufficient ETH balance. You have ${balances.eth} ETH, need ${cryptoAmount} ETH`);
        return;
      }
    }

    setIsTransferring(true);
    try {
      // Send real crypto transaction via MetaMask
      const result = await metaMaskService.sendCryptoTransaction(receiverAddress, cryptoAmount, currency);

      // Store transaction data for status page
      const transactionData = {
        hash: result.hash,
        status: 'confirmed',
        from: walletStatus.account,
        to: receiverAddress,
        amount: cryptoAmount,
        currency: currency,
        gasUsed: result.receipt.gasUsed.toString(),
        gasPrice: result.receipt.gasPrice.toString(),
        timestamp: new Date().toISOString(),
        confirmations: result.receipt.confirmations,
        blockNumber: result.receipt.blockNumber
      };

      sessionStorage.setItem('transactionHash', result.hash);
      sessionStorage.setItem('transactionData', JSON.stringify(transactionData));

      toast.success(`${currency} transaction sent successfully! Check your MetaMask wallet.`);
      navigate('/status');
    } catch (error) {
      console.error('Error sending transaction:', error);
      toast.error(error.message || 'Failed to send transaction');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleBack = () => {
    navigate('/conversion');
  };

  if (!transferData) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p>Loading transfer details...</p>
      </div>
    );
  }

  const { receiverAddress, conversion } = transferData;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm Transfer</h1>
        <p className="text-gray-600">Review and confirm your USDT transfer</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Transfer Details */}
        <div className="space-y-6">
          {/* Amount Card */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Transfer Amount</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Original Amount:</span>
                <span className="font-medium">₹{conversion.originalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Converted Amount:</span>
                <span className="font-medium text-green-600">{conversion.convertedAmount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Exchange Rate:</span>
                <span className="font-medium">1 USDT = ₹{conversion.exchangeRate}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span className="font-medium">₹{conversion.fees.swiftChainFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network Fee:</span>
                <span className="font-medium">{conversion.fees.networkFee} USDT</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Fee:</span>
                <span className="text-red-600">₹{conversion.fees.totalFee}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between text-lg font-bold">
                <span>Net Amount:</span>
                <span className="text-green-600">₹{conversion.netAmount}</span>
              </div>
            </div>
          </div>

          {/* Receiver Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Receiver Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Wallet Address
                </label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-mono text-sm break-all">{receiverAddress}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Valid Ethereum address format</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wallet Connection & Actions */}
        <div className="space-y-6">
          {/* Wallet Status */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Wallet Connection</h3>
            {!walletStatus.isConnected ? (
              <div className="text-center">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Connect your MetaMask wallet to proceed</p>
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="btn-primary w-full"
                >
                  {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Wallet Connected</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-mono text-sm break-all">{walletStatus.account}</p>
                </div>
                
                {/* Network Status */}
                <div className="flex items-center space-x-2">
                  {walletStatus.isSepolia ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm">
                    {walletStatus.isSepolia ? 'Sepolia Network' : 'Wrong Network - Please switch to Sepolia'}
                  </span>
                </div>

                {/* Balances */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">ETH Balance:</span>
                    <span className="font-medium">{parseFloat(balances.eth).toFixed(4)} SEP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">USDT Balance:</span>
                    <span className="font-medium">{parseFloat(balances.usdt).toFixed(2)} USDT</span>
                  </div>
                </div>

                {/* Balance Warning */}
                {transferData?.currency === 'USDT' && parseFloat(balances.usdt) < parseFloat(conversion.convertedAmount) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Insufficient USDT Balance</span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      You need {conversion.convertedAmount} USDT but have {balances.usdt} USDT
                    </p>
                  </div>
                )}

                {transferData?.currency === 'ETH' && parseFloat(balances.eth) < parseFloat(conversion.convertedAmount) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Insufficient ETH Balance</span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      You need {conversion.convertedAmount} ETH but have {balances.eth} ETH
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={handleTransfer}
                disabled={!walletStatus.isConnected || !walletStatus.isSepolia || isTransferring || 
                  (transferData?.currency === 'USDT' && parseFloat(balances.usdt) < parseFloat(conversion.convertedAmount)) ||
                  (transferData?.currency === 'ETH' && parseFloat(balances.eth) < parseFloat(conversion.convertedAmount))}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isTransferring ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Send {conversion.convertedAmount} {transferData?.currency}</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleBack}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Conversion</span>
              </button>
            </div>
          </div>

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Important Information</h4>
            <div className="space-y-2 text-sm text-blue-700">
              {transferData?.currency === 'USDT' ? (
                <>
                  <p>• This will send real USDT tokens on Sepolia testnet</p>
                  <p>• You need USDT tokens in your wallet to complete the transfer</p>
                  <p>• You need some SEP (Sepolia ETH) for gas fees</p>
                  <p>• The transaction will be visible on Sepolia Etherscan</p>
                  <p>• The recipient will see the USDT in their MetaMask wallet</p>
                </>
              ) : (
                <>
                  <p>• This will send real ETH on Sepolia testnet</p>
                  <p>• You need ETH in your wallet to complete the transfer</p>
                  <p>• Gas fees will be deducted from your ETH balance</p>
                  <p>• The transaction will be visible on Sepolia Etherscan</p>
                  <p>• The recipient will see the ETH in their MetaMask wallet</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmTransfer; 