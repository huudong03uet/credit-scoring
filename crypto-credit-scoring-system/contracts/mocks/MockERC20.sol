// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**decimals_);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**_decimals, "Amount too large");
        _mint(msg.sender, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}