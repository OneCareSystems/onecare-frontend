# =========================
# Development Environment
# =========================
FROM node:20-alpine

WORKDIR /app

# Copy dependency files first
# This allows Docker to cache npm dependencies
COPY package*.json ./

# Install exact dependencies from package-lock.json
RUN npm ci

# Copy application source
COPY . .

# Vite development server
EXPOSE 3000

# Enable reliable file watching inside Docker
ENV CHOKIDAR_USEPOLLING=true

# Start Vite and expose it outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]