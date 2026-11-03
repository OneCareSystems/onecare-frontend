# =========================
# Development Environment
# =========================
FROM node:22-alpine

# Create application directory and give ownership to node
WORKDIR /app
RUN chown -R node:node /app

# Copy dependency files first
# This allows Docker to cache npm dependencies
COPY --chown=node:node package*.json ./

# Run npm as the non-root node user
USER node

# Install exact dependencies from package-lock.json
RUN npm ci

# Copy application source
COPY --chown=node:node . .

# Vite development server
EXPOSE 3000

# Enable reliable file watching inside Docker
ENV CHOKIDAR_USEPOLLING=true

# Start Vite and expose it outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]