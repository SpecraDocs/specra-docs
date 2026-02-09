# Multi-stage build for Specra Docs

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache libc6-compat openssl

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy application source
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]
