import { ethers } from 'ethers';

export const validateEthereumAddress = (address: string): boolean => {
  return ethers.isAddress(address);
};

export const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount >= 0.01;
};

export const validateCurrency = (currency: string): currency is 'USDT' | 'ETH' => {
  return ['USDT', 'ETH'].includes(currency);
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatAmount = (amount: string | number, decimals: number = 6): string => {
  return parseFloat(amount.toString()).toFixed(decimals);
};

export const generateTransactionHash = (): string => {
  return '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
};