FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY tsconfig.json ./tsconfig.json

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
