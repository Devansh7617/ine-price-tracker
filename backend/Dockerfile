FROM mcr.microsoft.com/playwright:v1.63.0-jammy

# Upgrade Node.js to v22 to satisfy Supabase native WebSocket requirements
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
