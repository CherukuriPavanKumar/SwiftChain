import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Currency conversion API
export const convertAPI = {
  // Convert INR to USDT or ETH
  convertINRToCrypto: async (amount, currency = 'USDT') => {
    const response = await api.post('/convert/inr-to-crypto', { amount, currency });
    return response.data;
  },

  // Get exchange rates
  getExchangeRates: async () => {
    const response = await api.get('/convert/rates');
    return response.data;
  },

  // Get fee comparison
  getFeeComparison: async (amount) => {
    const response = await api.get(`/convert/fee-comparison?amount=${amount}`);
    return response.data;
  },
};

// Crypto API
export const cryptoAPI = {
  // Send crypto transaction
  sendCrypto: async (transactionData) => {
    const response = await api.post('/crypto/send', transactionData);
    return response.data;
  },

  // Get transaction status
  getTransactionStatus: async (txHash) => {
    const response = await api.get(`/crypto/transaction/${txHash}`);
    return response.data;
  },

  // Get wallet balance
  getWalletBalance: async (address) => {
    const response = await api.get(`/crypto/balance/${address}`);
    return response.data;
  },

  // Simulate withdrawal
  simulateWithdrawal: async (withdrawalData) => {
    const response = await api.post('/crypto/withdraw', withdrawalData);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api; 