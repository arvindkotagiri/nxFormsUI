FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG VITE_FLASK_API
ARG VITE_NODE_API
ENV VITE_FLASK_API=$VITE_FLASK_API
ENV VITE_NODE_API=$VITE_NODE_API

RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "preview"]