FROM mcr.microsoft.com/playwright:v1.48.0-jammy

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
