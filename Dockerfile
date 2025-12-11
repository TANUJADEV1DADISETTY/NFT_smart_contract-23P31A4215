FROM node:18-alpine

RUN apk add --no-cache python3 make g++ bash git

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

COPY . .

RUN npx hardhat compile

CMD ["npm", "test"]
