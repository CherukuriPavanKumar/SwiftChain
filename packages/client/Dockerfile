FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/client/package*.json ./packages/client/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build client
WORKDIR /app/packages/client
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/packages/client/build /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]