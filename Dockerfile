# Use Debian-based Node for reliable I/O
FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y python3 make g++ git ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies (use legacy to avoid peer resolution failures)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy project including precompiled artifacts/cache (these must exist locally)
COPY . .

# Run tests without compiling (use precompiled artifacts so Hardhat won't download compilers)
CMD ["npx", "hardhat", "test", "--no-compile"]
