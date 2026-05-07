const hre = require("hardhat");

async function main() {
    const swapAddress = "0x92cf2630a8f8045f9453E8bb252f56811Dde1B9b";

    const rloAddress = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";
    const strloAddress = "0x53e75774df5f13f559900d2f5978988a787e7b4c";
    const usdcAddress = "0x0aa550d7bc405ac1f754665d57a53af3cc585b4a";
    const usdtAddress = "0xc90bf922ce94478e312f3bd28beff7989cc5adaf";

    const [deployer] = await hre.ethers.getSigners();
    const swap = await hre.ethers.getContractAt("UniFairSwap", swapAddress);

    // Pakai IERC20 standar untuk Approve (anti-error BAD_DATA)
    const rlo = await hre.ethers.getContractAt("IERC20", rloAddress);
    const strlo = await hre.ethers.getContractAt("IERC20", strloAddress);
    const usdc = await hre.ethers.getContractAt("IERC20", usdcAddress);
    const usdt = await hre.ethers.getContractAt("IERC20", usdtAddress);

    const ethPerPool = hre.ethers.parseEther("0.05");
    const rloAmount = hre.ethers.parseEther("1000");
    const strloAmount = hre.ethers.parseEther("1000");
    const usdcAmount = 50000000n;
    const usdtAmount = 50000000n;

    console.log("─────────────────────────────────────────────────────");
    console.log("🔥 MEGA-SUNTIK MODAL V4 (JALUR CEPAT) 🔥");
    console.log("─────────────────────────────────────────────────────");

    // 1. MEMBERIKAN IZIN (APPROVE)
    console.log("⏳ 1. Memberikan Izin (Approve) ke Mesin Swap...");
    await (await rlo.approve(swapAddress, rloAmount)).wait();
    await (await strlo.approve(swapAddress, strloAmount)).wait();
    await (await usdc.approve(swapAddress, usdcAmount)).wait();
    await (await usdt.approve(swapAddress, usdtAmount)).wait();
    console.log("✅ Izin lengkap diberikan!");

    // 2. SUNTIK LACI SATU PER SATU
    console.log("\n⏳ 2. Memasukkan modal ke laci (mohon bersabar)...");
    await (await swap.addLiquidity(0, rloAmount, { value: ethPerPool })).wait();
    console.log("   -> Laci 0 (RLO) Terisi!");

    await (await swap.addLiquidity(1, strloAmount, { value: ethPerPool })).wait();
    console.log("   -> Laci 1 (stRLO) Terisi!");

    await (await swap.addLiquidity(2, usdcAmount, { value: ethPerPool })).wait();
    console.log("   -> Laci 2 (USDC) Terisi!");

    await (await swap.addLiquidity(3, usdtAmount, { value: ethPerPool })).wait();
    console.log("   -> Laci 3 (USDT) Terisi!");

    console.log("─────────────────────────────────────────────────────");
    console.log("🎉 SUKSES BESAR! SELURUH LACI SUDAH PENUH!");
    console.log("─────────────────────────────────────────────────────");
}

main().catch(console.error);