# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install all deps including devDependencies (needed for tsc)
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
# Install production deps only
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Run as non-root user (required by Choreo security policy)
USER 10014

EXPOSE 3000

CMD ["node", "dist/index.js"]
