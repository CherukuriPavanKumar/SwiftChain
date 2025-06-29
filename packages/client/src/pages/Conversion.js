import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { convertAPI } from '../services/api';

const Conversion = () => {
  const navigate = useNavigate();
  const [transferData, setTransferData] = useState(null);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get transfer data from session storage
    const storedData = sessionStorage.getItem('transferData');
    if (!storedData) {
      toast.error('No transfer data found. Please start over.');
      navigate('/');
      return;
    }

    setTransferData(JSON.parse(storedData));
    loadExchangeRates();
  }, [navigate]);

  const loadExchangeRates = async () => {
    try {
      const rates = await convertAPI.getExchangeRates();
      setExchangeRates(rates);
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const handleContinue = () => {
    if (!transferData) {
      toast.error('Transfer data not found');
      return;
    }
    navigate('/confirm');
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!transferData) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p>Loading conversion details...</p>
      </div>
    );
  }

  const { amount, receiverAddress, conversion } = transferData;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conversion Details</h1>
        <p className="text-gray-600">Review your INR to USDT conversion before proceeding</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Conversion Summary */}
        <div className="space-y-6">
          {/* Main Conversion Card */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-6 h-6 text-primary-600" />
              <h2 className="text-xl font-semibold">Conversion Summary</h2>
            </div>

            <div className="space-y-4">
              {/* Amount Conversion */}
              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">You Send</span>
                  <span className="text-sm font-medium text-gray-600">They Receive</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">₹{parseFloat(amount).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Indian Rupees</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-primary-600" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{conversion.convertedAmount}</p>
                    <p className="text-sm text-gray-500">USDT</p>
                  </div>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Exchange Rate</span>
                  <span className="font-medium">1 USDT = ₹{conversion.exchangeRate}</span>
                </div>
              </div>

              {/* Fees Breakdown */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Fee Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SwiftChain Fee (1%)</span>
                    <span>₹{conversion.fees.swiftChainFee}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Network Fee</span>
                    <span>{conversion.fees.networkFee} USDT</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total Fees</span>
                    <span>₹{conversion.fees.totalFee}</span>
                  </div>
                </div>
              </div>

              {/* Net Amount */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-800">Net Amount After Fees</span>
                  <span className="text-lg font-bold text-green-800">₹{conversion.netAmount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Receiver Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Receiver Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address
                </label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-mono text-sm break-all">{receiverAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Rates & Actions */}
        <div className="space-y-6">
          {/* Exchange Rates */}
          {exchangeRates && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Current Exchange Rates</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">USDT</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{exchangeRates.rates?.tether?.inr || 'N/A'}</p>
                    <p className="text-xs text-gray-500">per USDT</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Bitcoin</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{exchangeRates.rates?.bitcoin?.inr || 'N/A'}</p>
                    <p className="text-xs text-gray-500">per BTC</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                    <span className="font-medium">Ethereum</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{exchangeRates.rates?.ethereum?.inr || 'N/A'}</p>
                    <p className="text-xs text-gray-500">per ETH</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Rates updated at: {new Date(exchangeRates.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          {/* Benefits */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Why USDT?</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Stable Value</p>
                  <p className="text-xs text-gray-600">1 USDT = 1 USD, maintaining stable value</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Global Acceptance</p>
                  <p className="text-xs text-gray-600">Widely accepted across exchanges and platforms</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Fast Transfers</p>
                  <p className="text-xs text-gray-600">Blockchain transfers complete in minutes</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Low Fees</p>
                  <p className="text-xs text-gray-600">Minimal network fees compared to traditional banking</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinue}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <span>Continue to Transfer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleBack}
              className="btn-secondary w-full flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Send Money</span>
            </button>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Please ensure the receiver address is correct. Crypto transactions cannot be reversed once confirmed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversion; 