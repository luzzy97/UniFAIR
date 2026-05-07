require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      // Masukkan URL Alchemy kamu langsung di sini untuk tes
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      // Masukkan Private Key kamu langsung di sini untuk tes
      accounts: ["0x34bb47b0c6b2f8d112681a36a096053402cb432c1b7d97289ff1e4f816367783"],
    },
  },
  etherscan: {
    apiKey: "N2KW5FY4WYPM2GAHQRYMW72BTR5VNK5QBW",
  },
};