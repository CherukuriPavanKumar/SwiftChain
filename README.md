# 🚀 SwiftChain - Unified Platform

A comprehensive international money transfer platform using cryptocurrency to reduce fees and increase speed. Built with React, Node.js, TypeScript, and blockchain technology.

## 🏗️ Architecture

SwiftChain is built as a monorepo with the following structure:

```
SwiftChain/
├── packages/
│   ├── client/          # React frontend application
│   ├── server/          # Node.js backend API
│   └── shared/          # Shared types, utilities, and constants
├── scripts/             # Deployment and setup scripts
├── docker-compose.yml   # Docker configuration
└── package.json         # Root package configuration
```

## ✨ Features

- **💰 Multi-Currency Support**: Convert INR to USDT or ETH with real-time rates
- **🌐 Real Blockchain Transactions**: Actual cryptocurrency transfers on Sepolia testnet
- **🔗 MetaMask Integration**: Seamless wallet connection and transaction signing
- **📊 Live Exchange Rates**: Real-time conversion rates from CoinGecko API
- **💸 Fee Comparison**: Compare costs between traditional banks and crypto transfers
- **📱 Responsive Design**: Modern UI built with Tailwind CSS
- **🔒 Enterprise Security**: Rate limiting, CORS, helmet, and comprehensive logging
- **🐳 Docker Support**: Containerized deployment ready
- **📈 Monitoring**: Comprehensive logging and health checks

## 🛠️ Tech Stack

### Frontend (`packages/client`)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Ethers.js** for blockchain interaction
- **React Router** for navigation
- **React Hot Toast** for notifications

### Backend (`packages/server`)
- **Node.js** with Express and TypeScript
- **Winston** for logging
- **Helmet** for security
- **Rate limiting** and **CORS** protection
- **Ethers.js** for blockchain operations

### Shared (`packages/shared`)
- **TypeScript** types and interfaces
- **Validation utilities**
- **Constants** and configuration
- **Shared business logic**

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- MetaMask browser extension
- Sepolia testnet ETH and USDT (for testing)

### Installation

1. **Clone and setup**
   ```bash
   git clone https://github.com/yourusername/SwiftChain.git
   cd SwiftChain
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

2. **Configure environment**
   ```bash
   # Update .env file with your configuration
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start development servers**
   ```bash
   # Start both client and server
   npm run dev
   
   # Or start individually
   npm run dev:server  # Backend on :5000
   npm run dev:client  # Frontend on :3000
   ```

## 📖 Available Scripts

### Root Level Commands
```bash
npm run dev          # Start both client and server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run all tests
npm run lint         # Lint all packages
npm run clean        # Clean all build artifacts
npm run deploy       # Deploy application
```

### Package-Specific Commands
```bash
npm run dev:server   # Start server only
npm run dev:client   # Start client only
npm run build:shared # Build shared package
```

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Containers
```bash
# Build server
docker build -f packages/server/Dockerfile -t swiftchain-server .

# Build client
docker build -f packages/client/Dockerfile -t swiftchain-client .

# Run server
docker run -p 5000:5000 --env-file .env swiftchain-server

# Run client
docker run -p 3000:3000 swiftchain-client
```

## 🌍 Production Deployment

### Environment Setup
1. **Server Environment Variables**
   ```env
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://your-domain.com
   SEPOLIA_RPC_URL=your-infura-url
   LOG_LEVEL=info
   ```

2. **Client Environment Variables**
   ```env
   REACT_APP_API_URL=https://api.your-domain.com
   REACT_APP_ENVIRONMENT=production
   ```

### Deployment Options

#### Option 1: Vercel + Railway
```bash
# Deploy client to Vercel
cd packages/client
vercel --prod

# Deploy server to Railway
# Push to GitHub and connect Railway to your repo
```

#### Option 2: Docker + Cloud Provider
```bash
# Build and push to container registry
docker build -t your-registry/swiftchain-server -f packages/server/Dockerfile .
docker build -t your-registry/swiftchain-client -f packages/client/Dockerfile .
docker push your-registry/swiftchain-server
docker push your-registry/swiftchain-client
```

## 🔧 Configuration

### Shared Configuration
The `packages/shared` package contains:
- **Types**: TypeScript interfaces for API responses
- **Constants**: Network configurations, contract addresses
- **Utilities**: Validation functions, formatters
- **Validation**: Address and amount validation

### Server Configuration
Located in `packages/server/src/config/index.ts`:
- API endpoints and timeouts
- CORS origins
- Rate limiting settings
- Blockchain network settings
- Logging configuration

### Client Configuration
Environment variables for the React app:
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_ENVIRONMENT`: Environment name

## 📊 Monitoring and Logging

### Server Logging
- **Winston** logger with configurable levels
- **Morgan** for HTTP request logging
- **Structured logging** in production (JSON format)
- **File logging** in production environment

### Health Checks
- **Server**: `GET /api/health`
- **Docker**: Built-in health checks
- **Monitoring**: Ready for external monitoring tools

### Error Handling
- **Global error handler** with proper logging
- **Graceful shutdown** handling
- **Rate limiting** to prevent abuse
- **CORS protection** for security

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test --workspace=packages/server
npm run test --workspace=packages/client

# Run tests in watch mode
npm run test:watch
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses
- **Environment Variables**: Sensitive data protection

## 📈 Performance Optimizations

- **Compression**: Gzip compression for responses
- **Caching**: Appropriate cache headers
- **Bundle Optimization**: Code splitting and lazy loading
- **Docker**: Multi-stage builds for smaller images
- **CDN Ready**: Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes in the appropriate package
4. Run tests and linting (`npm run test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use the shared package for common utilities

## 📞 Support

- **Documentation**: Check the README files in each package
- **Issues**: Open GitHub issues for bugs or feature requests
- **Health Check**: Visit `/api/health` to verify server status
- **Logs**: Check server logs for debugging information

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Web3 community**