const { ethers } = require('ethers');
const fs = require('fs');

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/0Q1w8cnNB5iA7R46P9zKH";
const ADDRESS = "0x8e2Db7fDD2AE672eAeB7a6085741CFba2547e73d";

const contracts = JSON.parse(fs.readFileSync('c:/Users/User/Downloads/RIALO HQ/frontend/lib/contracts/deployedContracts.json', 'utf8'));

async function debug() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const stakingAddr = contracts.address.Staking;
    const stakingAbi = contracts.abi.Staking;
    const rloAddr = contracts.address.RLO;
    const rloAbi = contracts.abi.RLO;

    const staking = new ethers.Contract(stakingAddr, stakingAbi, provider);
    const rlo = new ethers.Contract(rloAddr, rloAbi, provider);

    console.log("Checking Address:", ADDRESS);
    
    try {
        const rloBal = await rlo.balanceOf(ADDRESS);
        console.log("RLO Wallet Balance:", ethers.formatEther(rloBal));

        const stake = await staking.stakes(ADDRESS);
        console.log("Staking Struct:", {
            amount: ethers.formatEther(stake.amount || stake[0]),
            lastUpdate: Number(stake.lastUpdate || stake[1]),
            rewards: ethers.formatEther(stake.rewardsAccumulated || stake[2]),
            sfsFraction: Number(stake.sfsFraction || stake[3])
        });

        const totalStaked = await staking.totalStaked ? await staking.totalStaked() : "N/A";
        console.log("Total Staked (Protocol):", totalStaked !== "N/A" ? ethers.formatEther(totalStaked) : "N/A");

        // Try to estimate gas for setSfsFraction
        // Note: This won't work with JsonRpcProvider for a transaction without a signer's private key 
        // to actually 'from' correctly, but we can try a call or staticCall
        console.log("Simulating setSfsFraction(10000)...");
        try {
            await staking.setSfsFraction.staticCall(10000, { from: ADDRESS });
            console.log("setSfsFraction(10000) staticCall: SUCCESS");
        } catch (e) {
            console.log("setSfsFraction(10000) staticCall: FAILED");
            console.log("Error Reason:", e.reason || e.message);
        }

    } catch (err) {
        console.error("Debug failed:", err);
    }
}

debug();
