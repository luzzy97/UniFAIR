const hre = require("hardhat");

async function main() {
    console.log("🚀 Memulai Operasi Fresh Start V4...");

    // 1. Deploy stRLOToken Baru
    console.log("⏳ Men-deploy stRLOToken baru...");
    const StRLO = await hre.ethers.getContractFactory("stRLOToken");
    const stRLO = await StRLO.deploy();
    await stRLO.waitForDeployment();
    const stRLOAddress = await stRLO.getAddress();
    console.log("✅ stRLO Berhasil di-deploy ke:", stRLOAddress);

    // 2. Deploy Mesin Staking V4
    // Alamat RLO lama Abang (Jangan diubah kalau RLO-nya masih yang itu)
    const ALAMAT_RLO_LAMA = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";

    console.log("⏳ Men-deploy Mesin Staking V4...");
    const Staking = await hre.ethers.getContractFactory("UniFAIRStakingV3");
    const staking = await Staking.deploy(ALAMAT_RLO_LAMA, stRLOAddress);
    await staking.waitForDeployment();
    const stakingAddress = await staking.getAddress();
    console.log("✅ Mesin Staking V4 Berhasil di-deploy ke:", stakingAddress);

    // 3. Otomatis Oper Kunci (Transfer Ownership)
    console.log("⏳ Mentransfer Ownership stRLO ke Mesin Staking...");
    const tx = await stRLO.transferOwnership(stakingAddress);
    await tx.wait();
    console.log("✅ SUCCESS: Ownership berhasil dipindahkan!");

    console.log("\n===============================================");
    console.log("ALAMAT BARU UNTUK USESTAKING.JS:");
    console.log("STAKING_ADDRESS:", stakingAddress);
    console.log("STRLO_ADDRESS:", stRLOAddress);
    console.log("===============================================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});