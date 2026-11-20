# Multi-stage production container for StockLine MERN Stack
# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server source
COPY server/ ./

# Copy built frontend assets to server public directory (if serving static) or maintain root dist
WORKDIR /app
COPY --from=frontend-builder /app/dist ./dist

# Non-root user security policy (CIS Docker Benchmark)
USER node

EXPOSE 5000

CMD ["node", "server/server.js"]
