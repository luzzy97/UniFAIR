const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Alamat USDC Sepolia Abang (Sudah Lowercase)
    const usdcAddress = "0x14064d2b438ed62d00c62f57f9fa77ddd0f770bb";

    console.log("Deploying MockXAUt...");
    const MockXAUt = await hre.ethers.getContractFactory("MockXAUt");

    // Deploy dengan memasukkan alamat USDC sebagai parameter
    const xaut = await MockXAUt.deploy(usdcAddress);
    await xaut.waitForDeployment();

    const xautAddress = await xaut.getAddress();
    console.log("====================================");
    console.log("✅ MockXAUt sukses di-deploy ke:", xautAddress);
    console.log("====================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});