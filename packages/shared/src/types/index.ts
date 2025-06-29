export interface ConversionRequest {
  amount: number;
  currency: 'USDT' | 'ETH';
}

export interface ConversionResponse {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: string;
  convertedCurrency: string;
  exchangeRate: number;
  fees: {
    swiftChainFee: string;
    networkFee: string;
    totalFee: string;
  };
  netAmount: string;
  timestamp: string;
  note?: string;
}

export interface TransactionData {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  amount: string;
  currency: string;
  gasUsed: string;
  gasPrice: string;
  timestamp: string;
  confirmations: number;
  blockNumber?: number;
}

export interface WalletBalance {
  address: string;
  balances: {
    ETH: string;
    USDT: string;
  };
  timestamp: string;
}

export interface ExchangeRates {
  rates: {
    [key: string]: {
      inr: number;
      usd: number;
    };
  };
  timestamp: string;
  note?: string;
}

export interface FeeComparison {
  transferAmount: number;
  traditionalBank: {
    fees: any;
    totalCost: string;
  };
  swiftChain: {
    fees: any;
    totalCost: string;
  };
  savings: string;
  savingsPercentage: string;
  timestamp: string;
}

export interface WithdrawalRequest {
  amount: number;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}