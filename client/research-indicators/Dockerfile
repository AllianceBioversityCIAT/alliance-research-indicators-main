#################### DEVELOPMENT STAGE ####################
# Base image
FROM --platform=linux/amd64 node:20-alpine AS build

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build --prod

#################### PRODUCTION STAGE ####################
# Serve the Angular application with Nginx
FROM --platform=linux/amd64 nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the built Angular app from the build stage
COPY --from=build /usr/src/app/dist/research-indicators/browser /usr/share/nginx/html

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
