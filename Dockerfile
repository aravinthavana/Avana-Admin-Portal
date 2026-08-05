# ---------- 1. Build frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---------- 2. Build backend ----------
FROM node:20-alpine AS backend
RUN apk add --no-cache openssl
WORKDIR /app

# Install production dependencies (backend only)
COPY package*.json ./
RUN npm install --omit=dev

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy backend source
COPY src ./src

# Copy built frontend from frontend stage
COPY --from=frontend /app/frontend/dist ./frontend/dist/

# Expose port (matching Dockerfile.local and start_server.bat)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "src/server.js"]