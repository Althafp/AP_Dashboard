# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies for server
RUN npm ci --only=production && \
    npm install express http-proxy-middleware

# Copy server file
COPY server.js ./

# Copy built dist folder from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]

