const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying V5 with account:", deployer.address);

    // --- ALAMAT TOKEN (Pastikan ini benar) ---
    const USDC_ADDRESS = "0x14064d2b438ed62d00c62f57f9fa77ddd0f770bb";
    const RLO_ADDRESS = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";

    console.log("Deploying RwaStakingV5...");
    const RwaStakingV5 = await hre.ethers.getContractFactory("RwaStakingV5");

    // Deploy dengan parameter constructor (_rlo, _usdc)
    const stakingV5 = await RwaStakingV5.deploy(RLO_ADDRESS, USDC_ADDRESS);
    await stakingV5.waitForDeployment();

    const contractAddress = await stakingV5.getAddress();
    console.log("====================================");
    console.log("✅ RwaStakingV5 SUKSES di-deploy!");
    console.log("Alamat Kontrak Baru:", contractAddress);
    console.log("====================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});