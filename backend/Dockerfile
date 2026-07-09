# Stage 1: Build & test dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Stage 2: Production runner stage
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy dependency definitions
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY --from=builder /app ./

# Create folders for uploads, logs, and backups with correct ownership
RUN mkdir -p uploads backups && \
    touch error.log app.log && \
    chown -R node:node /usr/src/app

# Run application under secure non-privileged container user
USER node

EXPOSE 5000

CMD ["node", "server.js"]
