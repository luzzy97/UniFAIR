// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AdvancedStaking is ReentrancyGuard {
    IERC20 public rloToken;
    address public treasuryWallet;

    enum AssetType { SoloRLO, PairRLOETH, SoloETH }

    struct StakePosition {
        uint256 id;
        AssetType assetType;
        uint256 amountRLO;
        uint256 amountETH;
        uint256 lockMonths;
        uint256 lockEndTimestamp;
        uint256 apyBPS;           // APY dalam Basis Points (100 = 1%)
        bool isUpfrontPaid;       
        uint256 lastUpdate;       
        bool isRWA;               
        uint256 sfsFraction;      // Potongan Credits (10000 = 100%)
        bool active;
    }

    mapping(address => StakePosition[]) public userStakes;
    uint256 public nextStakeId = 1;

    event Staked(address indexed user, uint256 indexed stakeId, uint256 amountRLO, uint256 amountETH, uint256 lockMonths);
    event UpfrontYieldPaid(address indexed user, uint256 indexed stakeId, uint256 amountToUser);
    event Withdrawn(address indexed user, uint256 indexed stakeId);

    constructor(address _rloToken, address _treasuryWallet) {
        require(_rloToken != address(0), "Invalid RLO Token Address");
        require(_treasuryWallet != address(0), "Invalid Treasury Address");
        rloToken = IERC20(_rloToken);
        treasuryWallet = _treasuryWallet;
    }

    // ─── 1. RUMUS APY FIX (SINKRON 100% DENGAN UI WEB) ───
// ─── 1. RUMUS APY FIX (SINKRON 100% DENGAN UI WEB) ───
    function calculateAPY(uint256 lockMonths, AssetType assetType, bool isRWA) public pure returns (uint256) {
        uint256 baseApyBPS = isRWA ? 800 : 1200; // 8% RWA, 12% RLO
        uint256 flexibleApyBPS = 300; // 3% Flexible

        uint256 networkApyBPS;

        // Hitung Base APY berdasarkan durasi Lock
        if (lockMonths == 0) {
            networkApyBPS = flexibleApyBPS;
        } else if (lockMonths >= 48) {
            networkApyBPS = baseApyBPS + 1000; // Tambah 10% di bulan ke-48 (Mentok 22%)
        } else {
            // Rumus sinkron web: baseApy + ((lockDuration - 1) / 47) * 10%
            networkApyBPS = baseApyBPS + (((lockMonths - 1) * 1000) / 47);
        }

        // Terapkan Asset Multiplier
        if (assetType == AssetType.SoloRLO) {
            return networkApyBPS; // 100% dari Base
        } else if (assetType == AssetType.PairRLOETH) {
            return (networkApyBPS * 75) / 100; // 75% dari Base
        } else {
            return (networkApyBPS * 30) / 100; // 30% dari Base
        }
    }

    // ─── 2. FUNGSI STAKE UTAMA ───
    function stake(
        AssetType assetType, 
        uint256 rloAmount, 
        uint256 lockMonths, 
        bool isRWA,
        uint256 sfsFraction 
    ) external payable nonReentrant {
        require(lockMonths <= 48, "Max lock is 48 months");
        require(sfsFraction <= 10000, "SFS Fraction cannot exceed 100%");
        
        // Pindahkan RLO Pokok dari User ke Kontrak
        if (assetType == AssetType.SoloRLO || assetType == AssetType.PairRLOETH) {
            require(rloAmount >= 10 ether, "Minimum stake is 10 RLO"); 
            require(rloToken.transferFrom(msg.sender, address(this), rloAmount), "RLO Transfer failed");
        }
        
        if (assetType == AssetType.SoloETH || assetType == AssetType.PairRLOETH) {
            require(msg.value > 0, "ETH amount must be > 0");
        }

        uint256 calculatedAPY = calculateAPY(lockMonths, assetType, isRWA);
        
        StakePosition memory newStake = StakePosition({
            id: nextStakeId++,
            assetType: assetType,
            amountRLO: rloAmount,
            amountETH: msg.value,
            lockMonths: lockMonths,
            lockEndTimestamp: lockMonths > 0 ? block.timestamp + (lockMonths * 30 days) : 0,
            apyBPS: calculatedAPY,
            isUpfrontPaid: false,
            lastUpdate: block.timestamp,
            isRWA: isRWA,
            sfsFraction: sfsFraction, 
            active: true
        });

        // ─── 3. LOGIKA UPFRONT YIELD (BUNGA CAIR DI DEPAN) ───
        if (lockMonths > 0) {
            // Hitung Multiplier Credits berdasarkan tipe aset
            uint256 creditsMultiplierBPS = 10000; // Default 100%
            if (assetType == AssetType.PairRLOETH) {
                creditsMultiplierBPS = 6000; // 60%
            } else if (assetType == AssetType.SoloETH) {
                creditsMultiplierBPS = 2000; // 20%
            }

            // Hitung Total Yield yang dibayarkan di muka (Asumsi harga 1 ETH = 3000 RLO untuk On-Chain estimation)
            uint256 effectivePrincipal = rloAmount;
            if (assetType == AssetType.SoloETH) {
                effectivePrincipal = msg.value * 3000;
            } else if (assetType == AssetType.PairRLOETH) {
                effectivePrincipal = rloAmount + (msg.value * 3000);
            }

            // Rumus Total Bunga: (Principal * APY * Months) / (12 * 10000)
            uint256 totalReward = (effectivePrincipal * calculatedAPY * lockMonths) / (12 * 10000);
            
            // Hitung Jatah SFS / Credits untuk Treasury
            uint256 sfsAllocatedReward = (totalReward * sfsFraction * creditsMultiplierBPS) / (10000 * 10000);
            
            // Hitung Jatah Yield to Wallet untuk User
            uint256 userShare = totalReward - sfsAllocatedReward;
            
            require(rloToken.balanceOf(address(this)) >= totalReward, "Not enough RLO in contract for Upfront Yield");
            
            // Eksekusi Transfer
            if (userShare > 0) {
                require(rloToken.transfer(msg.sender, userShare), "Failed to transfer Yield to User");
            }
            if (sfsAllocatedReward > 0) {
                require(rloToken.transfer(treasuryWallet, sfsAllocatedReward), "Failed to transfer SFS to Treasury");
            }
            
            newStake.isUpfrontPaid = true;
            emit UpfrontYieldPaid(msg.sender, newStake.id, userShare);
        }

        userStakes[msg.sender].push(newStake);
        emit Staked(msg.sender, newStake.id, rloAmount, msg.value, lockMonths);
    }

    // ─── 4. FUNGSI WITHDRAW (UNSTAKE) ───
// ─── 4. FUNGSI WITHDRAW (UNSTAKE HYBRID) ───
    function withdraw(uint256 stakeId) external nonReentrant {
        bool found = false;
        for (uint256 i = 0; i < userStakes[msg.sender].length; i++) {
            if (userStakes[msg.sender][i].id == stakeId && userStakes[msg.sender][i].active) {
                StakePosition storage pos = userStakes[msg.sender][i];
                require(block.timestamp >= pos.lockEndTimestamp, "Stake is still locked");
                
                pos.active = false;
                found = true;

                // ─── LOGIKA BUNGA BERJALAN UNTUK FLEXIBLE (0 BULAN) ───
                if (pos.lockMonths == 0) {
                    uint256 creditsMultiplierBPS = 10000; // Default 100%
                    if (pos.assetType == AssetType.PairRLOETH) {
                        creditsMultiplierBPS = 6000; // 60%
                    } else if (pos.assetType == AssetType.SoloETH) {
                        creditsMultiplierBPS = 2000; // 20%
                    }

                    uint256 effectivePrincipal = pos.amountRLO;
                    if (pos.assetType == AssetType.SoloETH) {
                        effectivePrincipal = pos.amountETH * 3000;
                    } else if (pos.assetType == AssetType.PairRLOETH) {
                        effectivePrincipal = pos.amountRLO + (pos.amountETH * 3000);
                    }

                    // Hitung durasi dalam hitungan detik (Argo Bunga)
                    uint256 elapsedTime = block.timestamp - pos.lastUpdate;
                    
                    // Rumus: (Pokok * APY * Waktu) / (10000 * 1 Tahun dalam detik)
                    uint256 totalReward = (effectivePrincipal * pos.apyBPS * elapsedTime) / (10000 * 365 days);

                    if (totalReward > 0) {
                        uint256 sfsAllocatedReward = (totalReward * pos.sfsFraction * creditsMultiplierBPS) / (10000 * 10000);
                        uint256 userShare = totalReward - sfsAllocatedReward;

                        require(rloToken.balanceOf(address(this)) >= totalReward, "Not enough RLO for Flexible Yield");

                        // Cairkan Bunga Berjalan
                        if (userShare > 0) {
                            require(rloToken.transfer(msg.sender, userShare), "Flexible Yield to User failed");
                        }
                        if (sfsAllocatedReward > 0) {
                            require(rloToken.transfer(treasuryWallet, sfsAllocatedReward), "Flexible SFS to Treasury failed");
                        }
                    }
                }
                // ────────────────────────────────────────────────────────

                // Kembalikan Modal (Principal)
                if (pos.amountRLO > 0) {
                    require(rloToken.transfer(msg.sender, pos.amountRLO), "RLO principal return failed");
                }
                if (pos.amountETH > 0) {
                    (bool success, ) = msg.sender.call{value: pos.amountETH}("");
                    require(success, "ETH principal return failed");
                }
                
                emit Withdrawn(msg.sender, pos.id);
                break;
            }
        }
        require(found, "Active stake not found");
    }

    // ─── 5. FUNGSI VIEW (UNTUK UI HISTORY) ───
    function getUserStakes(address user) external view returns (StakePosition[] memory) {
        return userStakes[user];
    }
}