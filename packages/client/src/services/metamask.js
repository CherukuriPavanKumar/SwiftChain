import { ethers } from 'ethers';

// Sepolia testnet configuration
const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const USDT_CONTRACT_ADDRESS = '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'; // Sepolia USDT contract

// USDT ABI
const USDT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

class MetaMaskService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.chainId = null;
    this.isConnected = false;
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled() {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      account: this.account,
      isSepolia: this.chainId === '0xaa36a7', // Sepolia chain ID
      chainId: this.chainId
    };
  }

  // Connect to MetaMask
  async connect() {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask and try again.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      this.account = accounts[0];
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.isConnected = true;

      // Get current chain ID
      const network = await this.provider.getNetwork();
      this.chainId = '0x' + network.chainId.toString(16);

      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));

      return {
        account: this.account,
        chainId: this.chainId
      };
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      throw error;
    }
  }

  // Switch to Sepolia network
  async switchToSepolia() {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
      });
      
      const network = await this.provider.getNetwork();
      this.chainId = '0x' + network.chainId.toString(16);
      
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, add it
        await this.addSepoliaNetwork();
      } else {
        throw error;
      }
    }
  }

  // Add Sepolia network to MetaMask
  async addSepoliaNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xaa36a7',
          chainName: 'Sepolia Testnet',
          nativeCurrency: {
            name: 'Sepolia Ether',
            symbol: 'SEP',
            decimals: 18
          },
          rpcUrls: ['https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
          blockExplorerUrls: ['https://sepolia.etherscan.io']
        }]
      });
    } catch (error) {
      console.error('Error adding Sepolia network:', error);
      throw error;
    }
  }

  // Get USDT balance
  async getUSDTBalance(address) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, this.provider);
      const balance = await usdtContract.balanceOf(address);
      const decimals = await usdtContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting USDT balance:', error);
      throw error;
    }
  }

  // Send crypto transaction (USDT or ETH)
  async sendCryptoTransaction(toAddress, amount, currency = 'USDT') {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (this.chainId !== '0xaa36a7') {
      throw new Error('Please switch to Sepolia network');
    }

    try {
      if (currency === 'USDT') {
        // Send USDT transaction
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, this.signer);
        const amountInWei = ethers.parseUnits(amount.toString(), 6);
        const tx = await usdtContract.transfer(toAddress, amountInWei);
        const receipt = await tx.wait();
        
        return {
          hash: tx.hash,
          receipt: receipt,
          status: 'confirmed',
          currency: 'USDT'
        };
      } else if (currency === 'ETH') {
        // Send ETH transaction
        const amountInWei = ethers.parseEther(amount.toString());
        const tx = await this.signer.sendTransaction({
          to: toAddress,
          value: amountInWei
        });
        const receipt = await tx.wait();
        
        return {
          hash: tx.hash,
          receipt: receipt,
          status: 'confirmed',
          currency: 'ETH'
        };
      } else {
        throw new Error('Unsupported currency. Use USDT or ETH.');
      }
    } catch (error) {
      console.error(`Error sending ${currency} transaction:`, error);
      throw error;
    }
  }

  // Get ETH balance
  async getETHBalance(address) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      throw error;
    }
  }

  // Handle account changes
  handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User disconnected
      this.account = null;
      this.isConnected = false;
    } else {
      this.account = accounts[0];
    }
  }

  // Handle chain changes
  handleChainChanged(chainId) {
    this.chainId = chainId;
    window.location.reload();
  }

  // Disconnect
  disconnect() {
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.chainId = null;
    this.isConnected = false;
  }
}

export default new MetaMaskService(); 