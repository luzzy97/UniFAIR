const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("─────────────────────────────────────────────────────");
    console.log("🚀 PROTOKOL 'SAPU JAGAT' V3 (MEGA LIKUIDITAS 1:1)");
    console.log("─────────────────────────────────────────────────────");

    const [deployer] = await hre.ethers.getSigners();

    // 1. Ambil harga ETH real-time dari CoinGecko (API)
    console.log("⏳ Mengambil harga ETH terbaru dari pasar...");
    let ethPrice;
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const priceData = await response.json();
        ethPrice = Math.floor(priceData.ethereum.usd);
        console.log(`📈 Harga ETH saat ini: $${ethPrice}`);
    } catch (e) {
        console.log("⚠️ Gagal ambil harga online, pakai harga standar $3500");
        ethPrice = 3500;
    }

    // Alamat RLO yang sudah sukses sebelumnya (Pondasi Utama)
    const rloAddress = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";
    const rlo = await hre.ethers.getContractAt("IERC20", rloAddress);

    // 2. Deploy Koin Baru (stRLO, USDC, USDT)
    console.log("\n⏳ 1. Membuat Koin stRLO, USDC, dan USDT Baru...");
    const STRLO = await hre.ethers.getContractFactory("stRLO");
    const strlo = await STRLO.deploy(); await strlo.waitForDeployment();

    // Pakai Factory MockUSDC agar nama di Etherscan 100% Valid
    const USDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await USDC.deploy(); await usdc.waitForDeployment();

    const USDT = await hre.ethers.getContractFactory("MockUSDT");
    const usdt = await USDT.deploy(); await usdt.waitForDeployment();

    const strloAddress = await strlo.getAddress();
    const usdcAddress = await usdc.getAddress();
    const usdtAddress = await usdt.getAddress();
    console.log("   ✅ Koin baru berhasil dicetak!");

    // 3. Deploy Mesin Swap V4
    console.log("\n⏳ 2. Membangun Mesin Swap V4...");
    const UniFairSwap = await hre.ethers.getContractFactory("UniFairSwap");
    const swap = await UniFairSwap.deploy(rloAddress, strloAddress, usdcAddress, usdtAddress);
    await swap.waitForDeployment();
    const swapAddress = await swap.getAddress();
    console.log("   ✅ Mesin Swap berdiri di:", swapAddress);

    // 4. Hitung Modal (Total 7.8 ETH Deposit + 0.4 ETH Sisa untuk Gas)
    const ethToDeposit = "1.95";

    // Hitung total token (Harga ETH * Jumlah ETH)
    const totalTokensHuman = (ethPrice * parseFloat(ethToDeposit)).toFixed(6);

    const rloAmount = hre.ethers.parseUnits(totalTokensHuman, 18);
    const strloAmount = hre.ethers.parseUnits(totalTokensHuman, 18);
    const usdAmount = hre.ethers.parseUnits(totalTokensHuman, 6); // USDC/USDT pakai 6 desimal
    const ethValue = hre.ethers.parseUnits(ethToDeposit, 18);

    // 5. Berikan Izin (Approve)
    console.log(`\n⏳ 3. Menyiapkan Izin Modal (${totalTokensHuman} Token per laci)...`);
    await (await rlo.approve(swapAddress, rloAmount)).wait();
    await (await strlo.approve(swapAddress, strloAmount)).wait();
    await (await usdc.approve(swapAddress, usdAmount)).wait();
    await (await usdt.approve(swapAddress, usdAmount)).wait();

    // 6. Suntik Modal ke Laci
    console.log(`\n⏳ 4. Menyuntikkan Mega Modal (${ethToDeposit} ETH per laci)...`);
    await (await swap.addLiquidity(0, rloAmount, { value: ethValue })).wait();
    console.log("   -> Laci 0 (RLO) Terisi!");
    await (await swap.addLiquidity(1, strloAmount, { value: ethValue })).wait();
    console.log("   -> Laci 1 (stRLO) Terisi!");
    await (await swap.addLiquidity(2, usdAmount, { value: ethValue })).wait();
    console.log("   -> Laci 2 (USDC) Terisi!");
    await (await swap.addLiquidity(3, usdAmount, { value: ethValue })).wait();
    console.log("   -> Laci 3 (USDT) Terisi!");

    // 7. Update Frontend JSON
    const filePath = path.join(__dirname, "../../frontend/lib/contracts/deployedContracts.json");
    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        data.address.UniFairSwap = swapAddress;
        data.address.stRLO = strloAddress;
        data.address.USDC = usdcAddress;
        data.address.USDT = usdtAddress;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log("\n✅ Website terupdate otomatis!");
    } catch (e) {
        console.log("\n⚠️ Gagal update JSON frontend, lakukan manual jika perlu.");
    }

    console.log("─────────────────────────────────────────────────────");
    console.log("🎉 SELESAI BANG! LIKUIDITAS DALAM, TRANSAKSI AMAN!");
    console.log("─────────────────────────────────────────────────────");
}

main().catch((error) => {
    console.error("❌ ERROR FATAL:", error);
});