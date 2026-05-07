const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Cara paling aman membaca JSON dari folder tetangga
    const jsonPath = path.join(__dirname, "..", "..", "frontend", "lib", "contracts", "deployedContracts.json");
    const deployedContracts = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    const RLO_ADDR = deployedContracts.address.RLO;
    const TREASURY = deployer.address;

    // Gunakan nama lengkap (Full Qualified Name) untuk menghindari HH701
    const Contract = await hre.ethers.getContractFactory("contracts/AdvancedStaking.sol:AdvancedStaking");

    console.log("Initiating deployment...");
    const staking = await Contract.deploy(RLO_ADDR, TREASURY);

    await staking.waitForDeployment();
    const address = await staking.getAddress();

    console.log("✅ AdvancedStaking deployed to:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});