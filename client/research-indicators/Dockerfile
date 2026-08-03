#################### DEVELOPMENT STAGE ####################
# Use an official Node.js runtime AS a parent image
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Angular application
RUN npm run build --prod

#################### TESTING STAGE ####################
# Use the same Node.js runtime AS a parent image
FROM node:20-alpine AS test

# Set the working directory
WORKDIR /usr/src/app

# Copy the built Angular application from the build stage
COPY --from=build /usr/src/app /usr/src/app

#################### PRODUCTION STAGE ####################
# Use an official Nginx runtime AS a parent image
FROM nginx:alpine

# Remove the default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the built Angular application from the build stage
COPY --from=build /usr/src/app/dist/research-indicators/browser /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Ensure the correct permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
