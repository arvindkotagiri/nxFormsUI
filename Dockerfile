# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Declare all variables used in the build
ARG VITE_FLASK_API
ARG VITE_NODE_API
ARG VITE_DEV_EMAIL
ARG VITE_DEV_PASSWORD

# Map them to the environment
ENV VITE_FLASK_API=$VITE_FLASK_API
ENV VITE_NODE_API=$VITE_NODE_API
ENV VITE_DEV_EMAIL=$VITE_DEV_EMAIL
ENV VITE_DEV_PASSWORD=$VITE_DEV_PASSWORD

RUN npm run build

# Stage 2: Serve static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Add the SPA routing fix for Nginx
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]