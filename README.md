# NFT Smart Contract Project

This project contains an ERC-721 NFT smart contract with:

- Minting (owner-only)
- Max supply
- Pausable transfers
- tokenURI metadata
- Burn support
- Full automated test suite
- Fully Dockerized test runner

## Run Locally

- npm install
- npx hardhat compile
- npm test

## Run in Docker

- docker build -t nft-contract .
- docker run nft-contract
