#################### BASE STAGE ####################
FROM node:20.13.1-alpine AS base

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################
FROM base AS development

# Install all dependencies (scripts allowed in dev)
RUN npm install

# Copy source code and config files
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Build the app
RUN npm run build

# Expose the app port
EXPOSE 3000

# Start the development server (acceptable to use npm here)
CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################
FROM base AS build

# Install production dependencies securely (no script execution)
RUN npm ci --only=production --ignore-scripts

# Copy source code and config files
COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY package*.json ./

# Build the app
RUN npm run build

#################### PRODUCTION STAGE ####################
FROM --platform=linux/amd64 node:20.13.1-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build artifacts and dependencies from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Run the app directly (avoid npm for security and signal handling)
CMD ["node", "dist/main.js"]