FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build server
WORKDIR /app/packages/server
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 5000

CMD ["npm", "start"]