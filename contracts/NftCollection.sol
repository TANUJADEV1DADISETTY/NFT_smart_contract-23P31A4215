// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NftCollection is ERC721, ERC721Burnable, Pausable, Ownable {
    using Counters for Counters.Counter;

    uint256 public immutable maxSupply;
    string private baseTokenURI;

    Counters.Counter private _tokenIdCounter;
    uint256 private _totalMinted;
    uint256 private _totalBurned;

    event BaseURIChanged(string newBaseURI);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_
    ) ERC721(name_, symbol_) {
        require(maxSupply_ > 0, "Max supply must be > 0");
        baseTokenURI = baseURI_;
        maxSupply = maxSupply_;
    }

    function totalSupply() public view returns (uint256) {
        return _totalMinted - _totalBurned;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721: token does not exist");
        string memory base = _baseURI();
        require(bytes(base).length != 0, "Base URI not set");
        return string(abi.encodePacked(base, _toString(tokenId)));
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function safeMint(address to) external onlyOwner whenNotPaused returns (uint256) {
        require(to != address(0), "Mint to zero address");
        uint256 nextId = _tokenIdCounter.current() + 1;
        require(nextId <= maxSupply, "Max supply exceeded");

        _tokenIdCounter.increment();
        uint256 newId = _tokenIdCounter.current();

        _safeMint(to, newId);
        _totalMinted += 1;
        return newId;
    }

    function safeMintWithId(address to, uint256 tokenId) external onlyOwner whenNotPaused {
        require(to != address(0), "Mint to zero address");
        require(tokenId > 0 && tokenId <= maxSupply, "tokenId out of range");
        require(!_exists(tokenId), "tokenId already minted");

        _safeMint(to, tokenId);
        _totalMinted += 1;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        require(!paused(), "Token transfer while paused");
    }

    function burn(uint256 tokenId) public override {
        super.burn(tokenId);
        _totalBurned += 1;
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
