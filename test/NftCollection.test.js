const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NftCollection", function () {
  let nft, owner, alice, bob, operator;
  const NAME = "MyNFT";
  const SYMBOL = "MNFT";
  const BASE = "https://example.com/metadata/";
  const MAX_SUPPLY = 5;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    [owner, alice, bob, operator] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NftCollection");
    nft = await Factory.deploy(NAME, SYMBOL, BASE, MAX_SUPPLY);
  });

  it("initial configuration correct", async () => {
    expect(await nft.name()).to.equal(NAME);
    expect(await nft.symbol()).to.equal(SYMBOL);
    expect(await nft.maxSupply()).to.equal(MAX_SUPPLY);
    expect(await nft.totalSupply()).to.equal(0);
  });

  it("owner can mint and emits Transfer event", async () => {
    await expect(nft.connect(owner).safeMint(alice.address))
      .to.emit(nft, "Transfer")
      .withArgs(ZERO_ADDRESS, alice.address, 1);

    expect(await nft.totalSupply()).to.equal(1);
    expect(await nft.balanceOf(alice.address)).to.equal(1);
    expect(await nft.ownerOf(1)).to.equal(alice.address);
    expect(await nft.tokenURI(1)).to.equal(BASE + "1");
  });

  it("cannot mint beyond maxSupply", async () => {
    for (let i = 0; i < MAX_SUPPLY; i++) {
      await nft.connect(owner).safeMint(owner.address);
    }
    await expect(nft.connect(owner).safeMint(owner.address)).to.be.revertedWith("Max supply exceeded");
  });

  it("non-owner cannot mint", async () => {
    await expect(
      nft.connect(alice).safeMint(alice.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("transfer updates balances and ownership", async () => {
    await nft.connect(owner).safeMint(alice.address);
    await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
    expect(await nft.ownerOf(1)).to.equal(bob.address);
    expect(await nft.balanceOf(alice.address)).to.equal(0);
    expect(await nft.balanceOf(bob.address)).to.equal(1);
  });

  it("approve + operator transfer works", async () => {
    await nft.connect(owner).safeMint(alice.address);
    await nft.connect(alice).approve(operator.address, 1);
    await expect(nft.connect(operator).transferFrom(alice.address, bob.address, 1))
      .to.emit(nft, "Transfer")
      .withArgs(alice.address, bob.address, 1);
    expect(await nft.ownerOf(1)).to.equal(bob.address);
  });

  it("burn reduces supply", async () => {
    await nft.connect(owner).safeMint(alice.address);
    expect(await nft.totalSupply()).to.equal(1);
    await nft.connect(alice).burn(1);
    expect(await nft.totalSupply()).to.equal(0);
    await expect(nft.ownerOf(1)).to.be.reverted;
  });

  it("pause blocks transfer and mint", async () => {
    await nft.connect(owner).safeMint(owner.address);
    await nft.connect(owner).pause();
    await expect(nft.connect(owner).transferFrom(owner.address, alice.address, 1)).to.be.revertedWith("Token transfer while paused");
    await expect(nft.connect(owner).safeMint(owner.address)).to.be.revertedWith("Pausable: paused");
    await nft.connect(owner).unpause();
  });

  it("repeated approvals and revocations behave correctly", async () => {
    await nft.connect(owner).safeMint(alice.address);
    await nft.connect(alice).approve(bob.address, 1);
    expect(await nft.getApproved(1)).to.equal(bob.address);
    await nft.connect(alice).approve(ZERO_ADDRESS, 1); // revoke
    expect(await nft.getApproved(1)).to.equal(ZERO_ADDRESS);
  });

  it("gas usage below threshold", async () => {
    // mint
    const mintTx = await nft.connect(owner).safeMint(alice.address);
    const mintRc = await mintTx.wait();
    // robust conversion: coerce to string then Number
    const mintGas = Number(mintRc.gasUsed.toString());

    // transfer
    const transferTx = await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
    const transferRc = await transferTx.wait();
    const transferGas = Number(transferRc.gasUsed.toString());

    const totalGas = mintGas + transferGas;

    // threshold: 400k
    expect(totalGas).to.be.lessThan(400000);
  });
});
