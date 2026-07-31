# ---------- 1. Build frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /app/booking/frontend
COPY booking/frontend/package*.json ./
RUN npm ci
COPY booking/frontend/ .
RUN npm run build

# ---------- 2. Build backend ----------
FROM node:20-alpine AS backend
WORKDIR /app/booking

# Install production dependencies (backend only)
COPY booking/package*.json ./
RUN npm ci --only=production

# Generate Prisma client
COPY booking/prisma ./prisma
RUN npx prisma generate

# Copy backend source
COPY booking/src ./src
COPY booking/.env .

# Copy built frontend from frontend stage
COPY --from=frontend /app/booking/frontend/dist ./frontend/dist/

# Expose port (matching Dockerfile.local and start_server.bat)
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "src/server.js"]