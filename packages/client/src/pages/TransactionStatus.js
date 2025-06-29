import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, Home, RefreshCw, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import { cryptoAPI } from '../services/api';

const TransactionStatus = () => {
  const navigate = useNavigate();
  const [transactionData, setTransactionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolder: '',
  });

  const loadTransactionData = useCallback(async () => {
    try {
      const storedData = sessionStorage.getItem('transactionData');
      const txHash = sessionStorage.getItem('transactionHash');

      if (!storedData || !txHash) {
        toast.error('No transaction data found');
        navigate('/');
        return;
      }

      const data = JSON.parse(storedData);
      setTransactionData(data);

      // Start polling for transaction status
      pollTransactionStatus(txHash);
    } catch (error) {
      console.error('Error loading transaction data:', error);
      toast.error('Failed to load transaction data');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadTransactionData();
  }, [loadTransactionData]);

  const pollTransactionStatus = async (txHash) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await cryptoAPI.getTransactionStatus(txHash);
        setTransactionData(response.transaction);

        if (response.transaction.status === 'confirmed') {
          clearInterval(pollInterval);
          toast.success('Transaction confirmed successfully!');
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
      }
    }, 3000); // Poll every 3 seconds

    // Clear interval after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleWithdrawal = async () => {
    if (!withdrawalData.accountNumber || !withdrawalData.ifscCode || !withdrawalData.accountHolder) {
      toast.error('Please fill in all bank details');
      return;
    }

    try {
      await cryptoAPI.simulateWithdrawal({
        amount: transactionData.amount,
        bankDetails: withdrawalData,
      });

      toast.success('Withdrawal request submitted successfully!');
      setShowWithdrawal(false);
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('Failed to process withdrawal request');
    }
  };

  const getStatusIcon = () => {
    switch (transactionData?.status) {
      case 'confirmed':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Clock className="w-16 h-16 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (transactionData?.status) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p>Loading transaction status...</p>
      </div>
    );
  }

  if (!transactionData) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Transaction Not Found</h2>
        <p className="text-gray-600 mb-4">No transaction data available</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Start New Transfer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Status</h1>
        <p className="text-gray-600">Track your crypto transfer progress</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Transaction Status */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card text-center">
            <div className="mb-6">
              {getStatusIcon()}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${getStatusColor()}`}>
              {transactionData.status === 'confirmed' && 'Transaction Confirmed!'}
              {transactionData.status === 'pending' && 'Transaction Pending'}
              {transactionData.status === 'failed' && 'Transaction Failed'}
            </h2>
            <p className="text-gray-600 mb-4">
              {transactionData.status === 'confirmed' && 'Your USDT has been successfully transferred'}
              {transactionData.status === 'pending' && 'Your transaction is being processed on the blockchain'}
              {transactionData.status === 'failed' && 'The transaction could not be completed'}
            </p>

            {/* Confirmation Progress */}
            {transactionData.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
                  <span className="text-sm font-medium text-yellow-800">Confirming Transaction</span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(transactionData.confirmations / 12) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  {transactionData.confirmations} of 12 confirmations
                </p>
              </div>
            )}
          </div>

          {/* Transaction Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{transactionData.amount} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-mono text-sm">
                  {`${transactionData.from.slice(0, 6)}...${transactionData.from.slice(-4)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-mono text-sm">
                  {`${transactionData.to.slice(0, 6)}...${transactionData.to.slice(-4)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="text-sm">Sepolia Testnet</span>
              </div>
              {transactionData.blockNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Block Number:</span>
                  <span className="font-mono text-sm">{transactionData.blockNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Used:</span>
                <span className="text-sm">{transactionData.gasUsed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timestamp:</span>
                <span className="text-sm">
                  {new Date(transactionData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Hash & Actions */}
        <div className="space-y-6">
          {/* Transaction Hash */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Transaction Hash</h3>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-mono text-sm break-all mb-3">{transactionData.hash}</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(transactionData.hash)}
                  className="btn-secondary flex items-center space-x-2 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Hash</span>
                </button>
                <a
                  href={`https://sepolia.etherscan.io/tx/${transactionData.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center space-x-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on Etherscan</span>
                </a>
              </div>
            </div>
          </div>

          {/* Withdrawal to Bank */}
          {transactionData.status === 'confirmed' && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Banknote className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Withdraw to Bank</h3>
              </div>
              
              {!showWithdrawal ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Convert your USDT back to INR and withdraw to your bank account
                  </p>
                  <button
                    onClick={() => setShowWithdrawal(true)}
                    className="btn-primary w-full"
                  >
                    Withdraw to Bank
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={withdrawalData.accountNumber}
                      onChange={(e) => setWithdrawalData(prev => ({
                        ...prev,
                        accountNumber: e.target.value
                      }))}
                      className="input-field"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={withdrawalData.ifscCode}
                      onChange={(e) => setWithdrawalData(prev => ({
                        ...prev,
                        ifscCode: e.target.value
                      }))}
                      className="input-field"
                      placeholder="Enter IFSC code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={withdrawalData.accountHolder}
                      onChange={(e) => setWithdrawalData(prev => ({
                        ...prev,
                        accountHolder: e.target.value
                      }))}
                      className="input-field"
                      placeholder="Enter account holder name"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleWithdrawal}
                      className="btn-success flex-1"
                    >
                      Submit Withdrawal
                    </button>
                    <button
                      onClick={() => setShowWithdrawal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Start New Transfer</span>
              </button>
              
              <button
                onClick={loadTransactionData}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">What's Next?</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• Your transaction is being processed on the Sepolia testnet</p>
              <p>• Once confirmed, you can withdraw to your bank account</p>
              <p>• Transaction hash can be used to track on Etherscan</p>
              <p>• This is a demo - no real funds are transferred</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionStatus; 