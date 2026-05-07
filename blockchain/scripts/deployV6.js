const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying V6 dengan wallet:", deployer.address);

    // GANTI DENGAN ALAMAT TOKEN MOCK ABANG (Huruf Kecil Semua!)
    const RLO_ADDRESS = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";
    const USDC_ADDRESS = "0x14064d2b438ed62d00c62f57f9fa77ddd0f770bb";
    const STRLO_ADDRESS = "0x8800efA432fc1C44BbeBcDa0915a34B76475780d";

    const RwaStakingV6 = await hre.ethers.getContractFactory("RwaStakingV6");
    const stakingV6 = await RwaStakingV6.deploy(RLO_ADDRESS, USDC_ADDRESS, STRLO_ADDRESS);
    await stakingV6.waitForDeployment();

    console.log("✅ V6 BERHASIL DI-DEPLOY!");
    console.log("Alamat Kontrak V6 Baru:", await stakingV6.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});