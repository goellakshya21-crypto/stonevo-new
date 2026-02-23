# 1. Base Image
FROM node:20-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files first (for efficient caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application code
COPY . .

# 6. Expose the port Vite runs on (default 5173)
EXPOSE 5173

# 7. Start the application
# We use --host to make sure Vite is accessible from outside the container
CMD ["npm", "run", "dev", "--", "--host"]
