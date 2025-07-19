# Use Node.js LTS version
FROM node:20-alpine

# Install dependencies for sqlite3
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3700

# Run as non-root user
USER node

# Start the application
CMD ["node", "src/server.js"]