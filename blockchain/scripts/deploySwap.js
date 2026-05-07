const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Mendeploy Mesin Swap V2 (Omnichain)...");

  // Ambil alamat dari .env
  const rloAddress = process.env.RLO_ADDRESS;
  const strloAddress = process.env.STRLO_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;
  const usdtAddress = process.env.USDT_ADDRESS;

  // KOREKSI DI SINI: Kurung siku dihapus agar terbaca 4 argumen!
  const UniFairSwap = await hre.ethers.getContractFactory("UniFairSwap");
  const swap = await UniFairSwap.deploy(rloAddress, strloAddress, usdcAddress, usdtAddress);
  await swap.waitForDeployment();

  const swapAddress = await swap.getAddress();
  console.log("✅ MESIN SWAP V2 BERHASIL DI-DEPLOY KE:", swapAddress);

  // Update frontend JSON otomatis
  const filePath = path.join(__dirname, "../frontend/lib/contracts/deployedContracts.json");
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    data.address.UniFairSwap = swapAddress;
    data.address.USDT = usdtAddress;
    data.address.stRLO = strloAddress;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("📄 Frontend JSON updated!");
  } catch (e) {
    console.log("⚠️ Gagal update JSON otomatis, silakan update manual.");
  }
}

main().catch(console.error);