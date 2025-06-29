# SwiftChain Backend

Backend API for SwiftChain - International money transfer using cryptocurrency.

## Features

- 💱 INR to USDT conversion using CoinGecko API
- 🔗 Blockchain transactions on Sepolia testnet
- 💰 Fee comparison between traditional banks and crypto
- 🏦 Simulated bank withdrawal functionality
- 📊 Real-time exchange rates

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the server directory:
```env
PORT=5000
NODE_ENV=development
COINGECKO_API_URL=https://api.coingecko.com/api/v3
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-infura-key
PRIVATE_KEY=your-private-key-here
USDT_CONTRACT_ADDRESS=0x7169D38820dfd117C3FA1f22a697dBA58d90BA06
```

3. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Currency Conversion

#### POST /api/convert/inr-to-usdt
Convert INR to USDT with real-time rates.

**Request Body:**
```json
{
  "amount": 10000
}
```

**Response:**
```json
{
  "originalAmount": 10000,
  "originalCurrency": "INR",
  "convertedAmount": "120.48",
  "convertedCurrency": "USDT",
  "exchangeRate": 83.0,
  "fees": {
    "swiftChainFee": "100.00",
    "networkFee": "0.500000",
    "totalFee": "141.50"
  },
  "netAmount": "9858.50",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /api/convert/rates
Get current exchange rates for major cryptocurrencies.

#### GET /api/convert/fees?amount=10000
Get fee comparison between traditional banks and SwiftChain.

### Crypto Transactions

#### POST /api/crypto/send
Send crypto transaction (simulated).

**Request Body:**
```json
{
  "toAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "amount": "100",
  "fromAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
}
```

#### GET /api/crypto/transaction/:txHash
Get transaction status by hash.

#### GET /api/crypto/balance/:address
Get wallet balance for ETH and USDT.

#### POST /api/crypto/withdraw
Simulate withdrawal to bank account.

**Request Body:**
```json
{
  "amount": 5000,
  "bankDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "accountHolder": "John Doe"
  }
}
```

## Environment Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `COINGECKO_API_URL`: CoinGecko API base URL
- `SEPOLIA_RPC_URL`: Sepolia testnet RPC URL
- `PRIVATE_KEY`: Ethereum private key for transactions
- `USDT_CONTRACT_ADDRESS`: USDT contract address on Sepolia

## Technologies Used

- **Express.js**: Web framework
- **Ethers.js**: Ethereum library for blockchain interactions
- **Axios**: HTTP client for API calls
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security middleware
- **Morgan**: HTTP request logger

## Development

The backend uses a modular structure:

```
src/
├── controllers/     # Request handlers
├── routes/         # API route definitions
├── services/       # Business logic
├── config/         # Configuration files
└── index.js        # Main server file
```

## Security Notes

- This is a demo implementation with simulated transactions
- In production, implement proper authentication and authorization
- Use environment variables for sensitive data
- Implement rate limiting and input validation
- Use HTTPS in production 