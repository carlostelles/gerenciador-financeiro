# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache make gcc g++ python3

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for native modules and curl for healthcheck
RUN apk add --no-cache make gcc g++ python3 curl

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Rebuild native modules for the current architecture
RUN npm rebuild bcrypt --update-binary

# Clean up build dependencies (keep curl)
RUN apk del make gcc g++ python3

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy scripts directory
COPY scripts/ ./scripts/

# Create logs directory and set permissions
RUN mkdir -p /app/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]