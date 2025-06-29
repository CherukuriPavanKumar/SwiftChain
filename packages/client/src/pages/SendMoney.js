import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, IndianRupee, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { convertAPI } from '../services/api';

const SendMoney = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    receiverAddress: '',
    currency: 'USDT',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [feeComparison, setFeeComparison] = useState(null);

  // Load fee comparison on mount
  useEffect(() => {
    loadFeeComparison();
  }, []);

  const loadFeeComparison = async () => {
    try {
      const comparison = await convertAPI.getFeeComparison(10000);
      setFeeComparison(comparison);
    } catch (error) {
      console.error('Error loading fee comparison:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) < 0.01) {
      toast.error('Please enter a valid amount (minimum ₹0.01)');
      return false;
    }

    if (!formData.receiverAddress) {
      toast.error('Please enter receiver wallet address');
      return false;
    }

    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(formData.receiverAddress)) {
      toast.error('Please enter a valid Ethereum wallet address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Convert INR to selected crypto
      const conversion = await convertAPI.convertINRToCrypto(parseFloat(formData.amount), formData.currency);
      
      // Store data in session storage for next page
      sessionStorage.setItem('transferData', JSON.stringify({
        ...formData,
        conversion
      }));
      
      toast.success('Conversion calculated successfully!');
      navigate('/conversion');
    } catch (error) {
      console.error('Error converting currency:', error);
      toast.error(error.response?.data?.error || 'Failed to convert currency');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Send Money Internationally</h1>
        <p className="text-gray-600">Convert INR to USDT and send it anywhere in the world with lower fees</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Main Form */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-6">
            <Wallet className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">Transfer Details</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (INR)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount in INR"
                  className="input-field pl-10"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send As
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="currency"
                    value="USDT"
                    checked={formData.currency === 'USDT'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">USDT (Tether)</span>
                    <span className="text-xs text-gray-500">Stablecoin - 1:1 with USD</span>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="currency"
                    value="ETH"
                    checked={formData.currency === 'ETH'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">ETH (Ethereum)</span>
                    <span className="text-xs text-gray-500">Native cryptocurrency</span>
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.currency === 'USDT' 
                  ? 'USDT is a stablecoin pegged to USD, ideal for money transfers'
                  : 'ETH is the native cryptocurrency of Ethereum network'
                }
              </p>
            </div>

            {/* Receiver Address */}
            <div>
              <label htmlFor="receiverAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Receiver Wallet Address
              </label>
              <input
                type="text"
                id="receiverAddress"
                name="receiverAddress"
                value={formData.receiverAddress}
                onChange={handleInputChange}
                placeholder="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
                className="input-field font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the recipient's Ethereum wallet address
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <span>Calculate Conversion</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Fee Comparison */}
        <div className="space-y-6">
          {/* Fee Comparison Card */}
          {feeComparison && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Fee Comparison</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-red-800">Traditional Bank</p>
                    <p className="text-sm text-red-600">SWIFT Transfer</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-800">₹{feeComparison.traditionalBank.totalCost}</p>
                    <p className="text-xs text-red-600">Total Cost</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium text-green-800">SwiftChain</p>
                    <p className="text-sm text-green-600">Crypto Transfer</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-800">₹{feeComparison.swiftChain.totalCost}</p>
                    <p className="text-xs text-green-600">Total Cost</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">You Save:</span>
                    <span className="font-bold text-green-600">
                      ₹{feeComparison.savings} ({feeComparison.savingsPercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Card */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Why Choose SwiftChain?</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Up to 80% lower fees compared to traditional banks</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Instant global transfers using blockchain technology</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Transparent fee structure with no hidden charges</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">Secure and decentralized transactions</p>
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Demo Mode</h4>
                <p className="text-sm text-blue-700 mt-1">
                  This is a demonstration application. No real money will be transferred. 
                  All transactions are simulated for educational purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendMoney; 