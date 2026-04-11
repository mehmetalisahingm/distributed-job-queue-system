FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.base.json .prettierrc.json eslint.config.js ./
COPY services/backend/package.json ./services/backend/package.json
COPY services/web/package.json ./services/web/package.json

RUN npm install

COPY . .

RUN npm run prisma:generate --workspace @distributed-job-queue/backend

EXPOSE 4000
