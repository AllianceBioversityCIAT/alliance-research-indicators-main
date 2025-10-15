#################### GO BUILD STAGE ####################
FROM golang:1.25-alpine AS go-build

WORKDIR /workspace

COPY src/go/go.mod src/go/go.sum ./
RUN go mod download

COPY src/go/ ./
RUN mkdir -p bin && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/generate_excel .


#################### BASE STAGE ####################
FROM node:22.12.0-alpine AS base

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./


#################### DEVELOPMENT STAGE ####################
FROM base AS development

# Install all dependencies (scripts allowed in dev)
RUN npm install  --ignore-scripts

# Copy source code and config files
COPY src ./src
RUN rm -f ./src/go/bin/generate_excel*
COPY --from=go-build /workspace/bin/generate_excel ./src/go/bin/generate_excel
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY eslint.config.mjs ./
COPY vite.config.ts ./

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
RUN rm -f ./src/go/bin/generate_excel*
COPY --from=go-build /workspace/bin/generate_excel ./src/go/bin/generate_excel
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY package*.json ./
COPY eslint.config.mjs ./
COPY vite.config.ts ./

# Build the app
RUN npm run build


#################### PRODUCTION STAGE ####################
FROM --platform=linux/amd64 node:22.12.0-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build artifacts and dependencies from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/src/go ./src/go

# Ensure Go helper binaries are executable
RUN chmod +x /app/src/go/bin/generate_excel

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Run the app directly (avoid npm for security and signal handling)
CMD ["node", "dist/main.js"]
