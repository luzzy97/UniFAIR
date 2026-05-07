const hre = require("hardhat");

async function main() {
    console.log("─────────────────────────────────────────────────────");
    console.log("🚀 MEMULAI PENCETAKAN USDT DAN stRLO (TAHAP 1)");
    console.log("─────────────────────────────────────────────────────");

    // 1. Deploy USDT
    const USDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = await USDT.deploy();
    await usdt.waitForDeployment();
    console.log("✅ USDT berhasil di-deploy ke :", await usdt.getAddress());

    // 2. Deploy stRLO
    const STRLO = await hre.ethers.getContractFactory("stRLO");
    const strlo = await STRLO.deploy();
    await strlo.waitForDeployment();
    console.log("✅ stRLO berhasil di-deploy ke:", await strlo.getAddress());

    console.log("─────────────────────────────────────────────────────");
    console.log("⚠️ PENTING: Copy dan simpan kedua alamat di atas!");
}

main().catch(console.error);