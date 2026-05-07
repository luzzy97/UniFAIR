const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();

    console.log("✅ MockUSDC deployed to:", usdcAddress);

    // Otomatis update deployedContracts.json
    const filePath = path.join(__dirname, "../frontend/lib/contracts/deployedContracts.json");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    data.address.USDC = usdcAddress;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("📄 deployedContracts.json updated!");
}

main().catch((error) => { console.error(error); process.exit(1); });