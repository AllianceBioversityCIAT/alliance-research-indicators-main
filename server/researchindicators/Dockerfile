#################### BASE STAGE ####################
# Base image
FROM node:20-alpine as base

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################

# Development stage
FROM base AS development

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

# Expose the port on which the app will run
EXPOSE 3000

# Start the server using the production build
CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################

FROM base AS build
RUN npm ci --only=production
COPY . .
RUN npm run build

#################### PRODUCTION STAGE ####################

# Base image
FROM --platform=linux/amd64 node:latest as production

# Create app directory
WORKDIR /app

# Copy the "dist" folder from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Expose the port on which the app will run
EXPOSE 3000

# Start the server using the production build
CMD ["node", "dist/main.js"]