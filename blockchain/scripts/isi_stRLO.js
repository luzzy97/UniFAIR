const hre = require("hardhat");

async function main() {
    // Alamat Mesin & stRLO
    const swapAddress = "0x025A7d1dc37FB997BDDfC344B44ccE7E46849bDa";
    const strloAddress = "0x53e75774df5f13f559900d2f5978988a787e7b4c";

    const [deployer] = await hre.ethers.getSigners();
    const swap = await hre.ethers.getContractAt("UniFairSwap", swapAddress);

    // ABI khusus untuk cek saldo dan cetak
    const mintableAbi = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function mint(address to, uint256 amount) public",
        "function balanceOf(address account) public view returns (uint256)"
    ];
    const strlo = await hre.ethers.getContractAt(mintableAbi, strloAddress);

    const ethPerPool = hre.ethers.parseEther("0.05");
    const strloAmount = hre.ethers.parseEther("1000");

    console.log("─────────────────────────────────────────────────────");
    console.log("🔍 INVESTIGASI DAN SUNTIK MODAL KHUSUS stRLO");
    console.log("─────────────────────────────────────────────────────");

    // 1. Cek Saldo Asli
    const saldoAwal = await strlo.balanceOf(deployer.address);
    console.log(`Saldo stRLO Abang sekarang: ${hre.ethers.formatEther(saldoAwal)} stRLO`);

    // 2. Cetak Paksa jika Kurang
    if (saldoAwal < strloAmount) {
        console.log("⚠️ Saldo kurang! Mencetak 5000 stRLO sekarang...");
        const txMint = await strlo.mint(deployer.address, hre.ethers.parseEther("5000"));
        await txMint.wait();
        console.log("✅ Berhasil mencetak stRLO!");
    } else {
        console.log("✅ Saldo cukup, tidak perlu mencetak.");
    }

    // 3. Eksekusi
    console.log("⏳ Memberikan Izin (Approve)...");
    const txApprove = await strlo.approve(swapAddress, strloAmount);
    await txApprove.wait();

    console.log("⏳ Mengisi Laci 1 (stRLO)...");
    const txAdd = await swap.addLiquidity(1, strloAmount, { value: ethPerPool });
    await txAdd.wait();

    console.log("🎉 SUNTIK MODAL stRLO BERHASIL!");
}

main().catch((error) => {
    console.error("\n❌ GAGAL! Ini detail errornya:");
    console.error(error.message);
});