// require('@nomiclabs/hardhat-waffle');
require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: '0.8.20',
  networks: { localhost: { url: 'http://127.0.0.1:8545' } }
};