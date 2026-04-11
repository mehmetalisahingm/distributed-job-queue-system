FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json .prettierrc.json eslint.config.js ./
COPY services/backend/package.json ./services/backend/package.json
COPY services/web/package.json ./services/web/package.json

RUN npm install

COPY . .

EXPOSE 3000
