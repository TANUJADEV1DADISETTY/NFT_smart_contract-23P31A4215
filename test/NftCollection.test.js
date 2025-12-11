const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NftCollection", function () {
  let nft, owner, alice, bob, operator;
  const NAME = "MyNFT";
  const SYMBOL = "MNFT";
  const BASE = "https://example.com/metadata/";
  const MAX_SUPPLY = 5;

  beforeEach(async () => {
    [owner, alice, bob, operator] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NftCollection");
    nft = await Factory.deploy(NAME, SYMBOL, BASE, MAX_SUPPLY);
    await nft.deployed();
  });

  it("initial configuration correct", async () => {
    expect(await nft.name()).to.equal(NAME);
    expect(await nft.symbol()).to.equal(SYMBOL);
    expect(await nft.maxSupply()).to.equal(MAX_SUPPLY);
    expect(await nft.totalSupply()).to.equal(0);
  });

  it("owner can mint and emits Transfer event", async () => {
    const tx = await nft.safeMint(alice.address);
    const rc = await tx.wait();
    const event = rc.events.find(e => e.event === "Transfer");
    expect(event.args[0]).to.equal(ethers.constants.AddressZero);
    expect(event.args[1]).to.equal(alice.address);
    expect(await nft.totalSupply()).to.equal(1);
  });

  it("cannot mint beyond maxSupply", async () => {
    for (let i = 0; i < MAX_SUPPLY; i++) {
      await nft.safeMint(owner.address);
    }
    await expect(nft.safeMint(owner.address)).to.be.revertedWith("Max supply exceeded");
  });

  it("non-owner cannot mint", async () => {
    await expect(nft.connect(alice).safeMint(alice.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("transfer updates balances and ownership", async () => {
    await nft.safeMint(alice.address);
    await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
    expect(await nft.ownerOf(1)).to.equal(bob.address);
  });

  it("approve + operator transfer works", async () => {
    await nft.safeMint(alice.address);
    await nft.connect(alice).approve(operator.address, 1);
    await nft.connect(operator).transferFrom(alice.address, bob.address, 1);
    expect(await nft.ownerOf(1)).to.equal(bob.address);
  });

  it("burn reduces supply", async () => {
    await nft.safeMint(alice.address);
    expect(await nft.totalSupply()).to.equal(1);
    await nft.connect(alice).burn(1);
    expect(await nft.totalSupply()).to.equal(0);
  });

  it("pause blocks transfer", async () => {
    await nft.safeMint(owner.address);
    await nft.pause();
    await expect(
      nft.transferFrom(owner.address, alice.address, 1)
    ).to.be.revertedWith("Token transfer while paused");
  });

  it("gas usage below threshold", async () => {
    const mintTx = await nft.safeMint(alice.address);
    const mintGas = (await mintTx.wait()).gasUsed;

    const transferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
    const transferGas = (await transferTx.wait()).gasUsed;

    const totalGas = mintGas.add(transferGas);

    expect(totalGas.lt("400000")).to.be.true;
  });
});
