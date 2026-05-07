const hre = require("hardhat");

async function main() {
    console.log("🚀 Memulai proses deploy RwaStakingV5...");

    // 1. Alamat Token yang dibutuhkan
    const RLO_ADDRESS = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";
    const USDC_SEPOLIA = "0x14064d2b438ed62d00c62f57f9fa77ddd0f770bb";

    // 2. Ambil kontraknya
    const RwaStaking = await hre.ethers.getContractFactory("RwaStakingV5");

    // 3. Deploy dengan parameter constructor (_rlo, _usdc)
    const rwaStaking = await RwaStaking.deploy(RLO_ADDRESS, USDC_SEPOLIA);

    await rwaStaking.waitForDeployment();

    const address = await rwaStaking.getAddress();

    console.log("----------------------------------------------");
    console.log(`✅ Kontrak V5 BERHASIL di-deploy!`);
    console.log(`📍 Alamat Kontrak: ${address}`);
    console.log("----------------------------------------------");
    console.log("Langkah selanjutnya:");
    console.log("1. Copy alamat di atas ke useRwaStaking.js");
    console.log("2. Jangan lupa kirim saldo USDC Sepolia ke alamat ini buat reward.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});