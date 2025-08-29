FROM node:22.18.0-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY packages/share/package.json ./packages/share/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build packages
RUN pnpm build:share
RUN pnpm build:api

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "api:start:prod"] 