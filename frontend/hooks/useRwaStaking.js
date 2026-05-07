import { useState } from 'react';
import { ethers } from 'ethers';

// 📊 SKEMA APY RWA HUB (Disesuaikan agar stabil)
const RWA_APY_RATES = {
    1: 4,   // 1 Bulan = 4% APY
    6: 8,   // 6 Bulan = 8% APY
    12: 12, // 12 Bulan = 12% APY
    48: 15  // 48 Bulan = 15% APY
};

const useRwaStaking = (provider) => {
    const [loading, setLoading] = useState(false);

    // 📍 ALAMAT KONTRAK V5 -> V6
    const RWA_STAKING_ADDRESS = "0x72c6abd9c48c9511e8c0d660091a974f6422d782";
    const RLO_ADDRESS = "0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015";

    // Rumus hitung hadiah USDC: (Nilai USD Aset * APY% * (Bulan/12))
    // Fungsi pembantu untuk menentukan Tier APY berdasarkan rentang bulan
    // Rumus APY Dinamis: Tumbuh perlahan di antara titik target
    const getApyForDuration = (months) => {
        if (months >= 48) return 15.00;

        // Antara 12 - 48 Bulan (Target: 12% ke 15%)
        if (months >= 12) {
            return 12 + ((months - 12) * (15 - 12) / (48 - 12));
        }
        // Antara 6 - 12 Bulan (Target: 8% ke 12%)
        if (months >= 6) {
            return 8 + ((months - 6) * (12 - 8) / (12 - 6));
        }
        // Antara 1 - 6 Bulan (Target: 4% ke 8%)
        if (months >= 1) {
            return 4 + ((months - 1) * (8 - 4) / (6 - 1));
        }
        return 0;
    };

    const calculateRwaYield = (amountUSD, duration) => {
        const apy = getApyForDuration(duration); // Memanggil logika tier di atas
        const yieldAmount = (parseFloat(amountUSD) * apy * (duration / 12)) / 100;
        return yieldAmount.toFixed(6);
    };

    const getContract = async () => {
        const signer = await provider.getSigner();
        const abi = [
            "function stakeRlo(uint256 amount, uint256 lockMonths, uint256 usdcReward, uint256 stRloReward, uint256 credits) external",
            "function stakeEth(uint256 lockMonths, uint256 usdcReward, uint256 stRloReward, uint256 credits) external payable",
            "function stakePair(uint256 rloAmount, uint256 lockMonths, uint256 usdcReward, uint256 stRloReward, uint256 credits) external payable"
        ];
        return new ethers.Contract(RWA_STAKING_ADDRESS, abi, signer);
    };

    const handleApprove = async (signer, amount, tokenAddress) => {
        const abi = ["function approve(address spender, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(tokenAddress, abi, signer);
        const tx = await contract.approve(RWA_STAKING_ADDRESS, ethers.parseUnits(Number(amount).toFixed(18), 18));
        await tx.wait();
    };

    const stakeRloRwa = async (amount, lock, usdcReward, stRloReward, credits) => {
        setLoading(true);
        try {
            const signer = await provider.getSigner();
            await handleApprove(signer, amount, RLO_ADDRESS); // Ijin tarik RLO

            const contract = await getContract();
            // Tembak fungsi stakeRlo (Hadiah USDC akan langsung cair ke dompet)
            const creditsBig = BigInt(Math.floor(Number(credits) || 0));
            const tx = await contract.stakeRlo(
                ethers.parseUnits(Number(amount).toFixed(18), 18),
                lock,
                ethers.parseUnits(Number(usdcReward || 0).toFixed(6), 6),
                ethers.parseEther(Number(stRloReward || 0).toFixed(18)),
                creditsBig
            );
            await tx.wait();
            alert("✅ Gacor! Stake Berhasil & Hadiah USDC Sudah Masuk Dompet!");
        } catch (e) { alert("Gagal: " + (e.reason || e.message)); }
        finally { setLoading(false); }
    };

    // ==========================================
    // 🔷 FUNGSI STAKE ETH -> PAYOUT RWA
    // ==========================================
    const stakeEthRwa = async (amount, lock, usdcReward, stRloReward, credits) => {
        setLoading(true);
        try {
            const contract = await getContract();
            const amountWei = ethers.parseEther(Number(amount).toFixed(18));

            const creditsBig = BigInt(Math.floor(Number(credits) || 0));

            console.log("Mencoba Stake ETH (RWA Payout)...");
            const tx = await contract.stakeEth(
                lock,
                ethers.parseUnits(Number(usdcReward || 0).toFixed(6), 6),
                ethers.parseEther(Number(stRloReward || 0).toFixed(18)),
                creditsBig,
                { value: amountWei }
            );
            await tx.wait();
            alert("✅ Stake ETH Berhasil & Hadiah USDC (RWA) Sudah Masuk Dompet!");
        } catch (e) { alert("Gagal: " + (e.reason || e.message)); }
        finally { setLoading(false); }
    };

    // ==========================================
    // ⚖️ FUNGSI STAKE PAIR (RLO+ETH) -> PAYOUT RWA
    // ==========================================
    const stakePairRwa = async (amountRlo, amountEth, lock, usdcReward, stRloReward, credits) => {
        setLoading(true);
        try {
            const signer = await provider.getSigner();
            // Tahap 1: Approve RLO
            await handleApprove(signer, amountRlo, RLO_ADDRESS);

            // Tahap 2: Stake Pair
            const contract = await getContract();
            const amountRloWei = ethers.parseUnits(Number(amountRlo).toFixed(18), 18);
            const ethAmountWei = ethers.parseEther(Number(amountEth).toFixed(18));

            const creditsBig = BigInt(Math.floor(Number(credits) || 0));

            console.log("Mencoba Stake Pair (RWA Payout)...");
            const tx = await contract.stakePair(
                amountRloWei,
                lock,
                ethers.parseUnits(Number(usdcReward || 0).toFixed(6), 6),
                ethers.parseEther(Number(stRloReward || 0).toFixed(18)),
                creditsBig,
                { value: ethAmountWei }
            );
            await tx.wait();
            alert(`✅ Stake Pair Berhasil! ${amountRlo} RLO & ${amountEth} ETH. Hadiah USDC (RWA) Sudah Masuk!`);
        } catch (e) { alert("Gagal: " + (e.reason || e.message)); }
        finally { setLoading(false); }
    };

    return { stakeRloRwa, stakeEthRwa, stakePairRwa, calculateRwaYield, getApyForDuration, loading };
};

export default useRwaStaking;