import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from './useWallet';

// 🔥 ALAMAT KONTRAK V5 TERBARU 🔥
const STAKING_ADDRESS_BARU = "0x72c6abd9c48c9511e8c0d660091a974f6422d782";
const RLO_ADDRESS = "0xDdDD7F68b3b7916AF9bFafB2B2ecA8e0cB390cc2";

export function useStaking() {
  // 👇 INI DIA: Kita panggil showToast dari useWallet
  const { address, provider, showToast } = useWallet();

  const [pendingRewards, setPendingRewards] = useState("0.00");
  const [currentTotalStakedVal, setCurrentTotalStakedVal] = useState(0);
  const [unlockTime, setUnlockTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tickingCredits, setTickingCredits] = useState(0);

  const fetchStakingData = useCallback(async () => {
    if (!address || !provider) return;
    try {
      const contract = new ethers.Contract(
        STAKING_ADDRESS_BARU,
        [
          "function calculateRewards(address user) view returns (uint256)",
          "function totalStakedRlo() view returns (uint256)",
          "function getUnlockTime(address user) view returns (uint256)",
          "function userCredits(address user) view returns (uint256)"
        ],
        provider
      );
      const userAddress = ethers.getAddress(address);

      const rewards = await contract.calculateRewards(userAddress);
      setPendingRewards(ethers.formatEther(rewards));

      const totalRlo = await contract.totalStakedRlo();
      setCurrentTotalStakedVal(parseFloat(ethers.formatEther(totalRlo)));

      const time = await contract.getUnlockTime(userAddress);
      setUnlockTime(Number(time) * 1000);

      try {
        const credits = await contract.userCredits(userAddress);
        setTickingCredits(Number(credits));
      } catch (err) {
        console.warn("Belum ada credits atau error fetch:", err.message);
      }
    } catch (error) {
      console.error('Error fetching staking data:', error);
    }
  }, [address, provider]);

  useEffect(() => {
    fetchStakingData();
    const interval = setInterval(fetchStakingData, 10000);
    return () => clearInterval(interval);
  }, [fetchStakingData]);

  // ==========================================
  // 💧 FUNGSI STAKE SINGLE RLO
  // ==========================================
  const stakeRlo = async (amount, lockDuration, usdcReward, stRloReward, credits) => {
    if (!provider) return;
    const ALAMAT_RLO = ethers.getAddress("0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015");
    const ALAMAT_V3 = ethers.getAddress("0x72c6abd9c48c9511e8c0d660091a974f6422d782");

    try {
      setLoading(true);
      showToast({ message: 'Requesting Approval...', type: 'loading' });
      const signer = await provider.getSigner();
      const amountWei = ethers.parseEther(Number(amount).toFixed(18));
      const safeLock = parseInt(lockDuration);

      try {
        const rloAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
        const rloContract = new ethers.Contract(ALAMAT_RLO, rloAbi, signer);
        const approveTx = await rloContract.approve(ALAMAT_V3, amountWei);
        await approveTx.wait();
      } catch (err) {
        setLoading(false);
        if (showToast) showToast({ message: "Approve Failed", detail: err.reason || err.message, type: "error" });
        return;
      }

      try {
        showToast({ message: 'Confirming Stake in MetaMask...', type: 'loading' });
        const abi = ["function stakeRlo(uint256 amount, uint256 lockMonths, uint256 usdcReward, uint256 stRloReward, uint256 credits) external"];
        const contract = new ethers.Contract(ALAMAT_V3, abi, signer);

        const usdcWei = ethers.parseUnits(Number(usdcReward || 0).toFixed(6), 6);
        const stRloWei = ethers.parseEther(Number(stRloReward || 0).toFixed(18));
        const creditsBig = BigInt(Math.floor(Number(credits) || 0));

        const tx = await contract.stakeRlo(amountWei, safeLock, usdcWei, stRloWei, creditsBig);
        await tx.wait();

        await fetchStakingData();
        if (showToast) showToast({ message: "Staking Successful!", detail: `Staked ${amount} RLO`, type: "success", txHash: tx.hash });
      } catch (err) {
        setLoading(false);
        if (showToast) showToast({ message: "Stake Failed", detail: err.reason || err.message, type: "error" });
        return;
      }
    } catch (error) {
      if (showToast) showToast({ message: "Fatal Error", detail: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🔓 3. FUNGSI WITHDRAW (UNSTAKE)
  // ==========================================
  const withdraw = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      showToast({ message: 'Confirming Withdraw...', type: 'loading' });
      const signer = await provider.getSigner();

      const stakingAbi = ["function withdraw() external"];
      const stakingContract = new ethers.Contract(STAKING_ADDRESS_BARU, stakingAbi, signer);

      const tx = await stakingContract.withdraw();
      await tx.wait();

      await fetchStakingData();
      if (showToast) showToast({ message: "Withdraw Successful!", detail: "Modal RLO sudah kembali ke dompet", type: "success", txHash: tx.hash });
    } catch (error) {
      if (showToast) showToast({ message: "Withdraw Failed", detail: "Pastikan waktu lock sudah habis", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🌱 4. FUNGSI UPDATE SFS & RWA
  // ==========================================
  const updateSfsFraction = async (percentage) => {
    if (!provider) return;
    try {
      setLoading(true);
      showToast({ message: 'Updating SFS Fraction...', type: 'loading' });
      const signer = await provider.getSigner();
      const abi = ["function setSfsFraction(uint256 percentage) external"];
      const contract = new ethers.Contract(STAKING_ADDRESS_BARU, abi, signer);
      const tx = await contract.setSfsFraction(percentage);
      await tx.wait();
      if (showToast) showToast({ message: "Update Successful", detail: `SFS diupdate ke ${percentage}%`, type: "success", txHash: tx.hash });
    } catch (e) {
      if (showToast) showToast({ message: "Update Failed", detail: e.message, type: "error" });
    } finally { setLoading(false); }
  };

  const updateRwaAllocation = async (percentage) => {
    if (!provider) return;
    try {
      setLoading(true);
      showToast({ message: 'Updating RWA Allocation...', type: 'loading' });
      const signer = await provider.getSigner();
      const abi = ["function setRwaAllocation(uint256 percentage) external"];
      const contract = new ethers.Contract(STAKING_ADDRESS_BARU, abi, signer);
      const tx = await contract.setRwaAllocation(percentage);
      await tx.wait();
      if (showToast) showToast({ message: "Update Successful", detail: `RWA diupdate ke ${percentage}%`, type: "success", txHash: tx.hash });
    } catch (e) {
      if (showToast) showToast({ message: "Update Failed", detail: e.message, type: "error" });
    } finally { setLoading(false); }
  };

  // ==========================================
  // 🔷 FUNGSI STAKE ETH MURNI
  // ==========================================
  const stakeEth = async (amount, lockDuration, usdcReward, stRloReward, credits) => {
    if (!provider) return;
    const ALAMAT_V3 = "0x72c6abd9c48c9511e8c0d660091a974f6422d782";

    try {
      setLoading(true);
      showToast({ message: 'Confirming Stake in MetaMask...', type: 'loading' });
      const signer = await provider.getSigner();
      const amountWei = ethers.parseEther(Number(amount).toFixed(18));
      const safeLock = parseInt(lockDuration);

      const usdcWei = ethers.parseUnits(Number(usdcReward || 0).toFixed(6), 6);
      const stRloWei = ethers.parseEther(Number(stRloReward || 0).toFixed(18));
      const creditsBig = BigInt(Math.floor(Number(credits) || 0));

      const abi = ["function stakeEth(uint256 lockMonths, uint256 usdcReward, uint256 stRloReward, uint256 credits) external payable"];
      const contract = new ethers.Contract(ALAMAT_V3, abi, signer);

      const tx = await contract.stakeEth(safeLock, usdcWei, stRloWei, creditsBig, { value: amountWei });
      await tx.wait();

      await fetchStakingData();
      if (showToast) showToast({ message: "Staking ETH Successful!", detail: `Staked ${amount} ETH`, type: "success", txHash: tx.hash });
    } catch (error) {
      if (showToast) showToast({ message: "Stake ETH Failed", detail: error.reason || error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ⚖️ FUNGSI STAKE PAIR 
  // ==========================================
  const stakePair = async (amountRlo, amountEth, lockDuration, usdcReward, stRloReward, credits) => {
    if (!provider) return;
    const ALAMAT_RLO = ethers.getAddress("0x4c1982c28ba29cc29bbe5054cd64be5afc8aa015");
    const ALAMAT_V3 = ethers.getAddress("0x72c6abd9c48c9511e8c0d660091a974f6422d782");

    try {
      setLoading(true);
      showToast({ message: 'Requesting RLO Approval...', type: 'loading' });
      const signer = await provider.getSigner();

      const amountRloWei = ethers.parseUnits(Number(amountRlo).toFixed(18), 18);
      const ethAmountWei = ethers.parseEther(Number(amountEth).toFixed(18));
      const safeLock = parseInt(lockDuration);
      const usdcWei = ethers.parseUnits(Number(usdcReward || 0).toFixed(6), 6);
      const stRloWei = ethers.parseEther(Number(stRloReward || 0).toFixed(18));
      const creditsBig = BigInt(Math.floor(Number(credits) || 0));

      try {
        const rloAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
        const rloContract = new ethers.Contract(ALAMAT_RLO, rloAbi, signer);
        const approveTx = await rloContract.approve(ALAMAT_V3, amountRloWei);
        await approveTx.wait();
      } catch (err) {
        setLoading(false);
        if (showToast) showToast({ message: "Approve Failed", detail: err.reason || err.message, type: "error" });
        return;
      }

      try {
        showToast({ message: 'Confirming Pair Stake...', type: 'loading' });
        const abi = ["function stakePair(uint256 amountRlo, uint256 lockMonths, uint256 usdcReward, uint256 stRloReward, uint256 credits) external payable"];
        const contract = new ethers.Contract(ALAMAT_V3, abi, signer);

        const tx = await contract.stakePair(amountRloWei, safeLock, usdcWei, stRloWei, creditsBig, { value: ethAmountWei });
        await tx.wait();

        await fetchStakingData();
        if (showToast) showToast({ message: "Stake Pair Successful!", detail: `Staked ${amountRlo} RLO & ${amountEth} ETH`, type: "success", txHash: tx.hash });
      } catch (err) {
        setLoading(false);
        if (showToast) showToast({ message: "Stake Pair Failed", detail: err.reason || err.message, type: "error" });
        return;
      }
    } catch (error) {
      if (showToast) showToast({ message: "Fatal Error", detail: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🎁 FUNGSI CLAIM REWARDS
  // ==========================================
  const claimRewards = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      showToast({ message: 'Claiming Rewards...', type: 'loading' });
      const signer = await provider.getSigner();

      const abi = ["function claimRewards() external"];
      const contract = new ethers.Contract(STAKING_ADDRESS_BARU, abi, signer);

      const tx = await contract.claimRewards();
      await tx.wait();

      await fetchStakingData();
      if (showToast) showToast({ message: "Claim Successful!", detail: "Berhasil Claim stRLO Rewards", type: "success", txHash: tx.hash });
    } catch (error) {
      if (showToast) showToast({ message: "Claim Failed", detail: "Pastikan Abang punya Stake yang aktif", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingRewards, currentTotalStakedVal, totalStaked: currentTotalStakedVal.toString(),
    unlockTime, loading, fetchStakingData, globalRwaYieldUsd: parseFloat(pendingRewards) * 0.35,
    stakeRlo, stakeEth, stakePair, withdraw, claimRewards, updateSfsFraction, updateRwaAllocation,
    stakedBalance: "0", stakedEthBalance: "0", sfsFraction: 0, rwaAllocation: 0,
    tickingCredits
  };
}