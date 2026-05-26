# # Stage 1: Build
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .

# # Declare all variables used in the build
# ARG VITE_FLASK_API
# ARG VITE_NODE_API
# ARG VITE_DEV_EMAIL
# ARG VITE_DEV_PASSWORD

# # Map them to the environment
# ENV VITE_FLASK_API=$VITE_FLASK_API
# ENV VITE_NODE_API=$VITE_NODE_API
# ENV VITE_DEV_EMAIL=$VITE_DEV_EMAIL
# ENV VITE_DEV_PASSWORD=$VITE_DEV_PASSWORD

# RUN npm run build

# # Stage 2: Serve static files
# FROM nginx:alpine
# COPY --from=builder /app/dist /usr/share/nginx/html

# # Add the SPA routing fix for Nginx
# RUN echo 'server { \
#     listen 80; \
#     location / { \
#         root /usr/share/nginx/html; \
#         index index.html index.htm; \
#         try_files $uri $uri/ /index.html; \
#     } \
# }' > /etc/nginx/conf.d/default.conf

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_FLASK_API
ARG VITE_NODE_API
ARG VITE_DEV_EMAIL
ARG VITE_DEV_PASSWORD

ENV VITE_FLASK_API=$VITE_FLASK_API
ENV VITE_NODE_API=$VITE_NODE_API
ENV VITE_DEV_EMAIL=$VITE_DEV_EMAIL
ENV VITE_DEV_PASSWORD=$VITE_DEV_PASSWORD

RUN npm run build


# Stage 2: Nginx (CF-friendly)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Install envsubst
RUN apk add --no-cache gettext

# Create templates directory
RUN mkdir -p /etc/nginx/templates

# Create nginx template
RUN printf 'server {\n\
    listen ${PORT};\n\
    server_name localhost;\n\
\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template

# Create startup script
RUN printf '#!/bin/sh\n\
envsubst '\''${PORT}'\'' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf\n\
echo "Generated nginx config:"\n\
cat /etc/nginx/conf.d/default.conf\n\
nginx -g "daemon off;"\n' > /entrypoint.sh \
&& chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]