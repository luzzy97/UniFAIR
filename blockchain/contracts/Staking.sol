// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Staking is Ownable, ReentrancyGuard {
    IERC20 public stakingToken;
    uint256 public rewardRate = 184; // 18.4% APY

    struct Stake {
        uint256 rloAmount;
        uint256 ethAmount;
        uint256 lastUpdate;
        uint256 lockEnd;
        uint256 rewardsAccumulated; // Di sini tempat menyimpan bunga Upfront
        uint256 sfsFraction;
        uint256 rwaAllocation;
        string rwaTarget;
    }

    mapping(address => Stake) public stakes;
    uint256 public totalStakedRlo;
    uint256 public totalStakedEth;
    address public servicePaymaster;

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        servicePaymaster = msg.sender;
    }

    // FUNGSI BARU: Hitung bunga di depan
    function _calculateUpfront(uint256 rloAmt, uint256 ethAmt, uint256 lockMonths) internal view returns (uint256) {
        uint256 effectivePrincipal = rloAmt + (ethAmt * 2000); // 1 ETH = 2000 RLO
        uint256 lockTime = lockMonths * 30 days;
        return (effectivePrincipal * rewardRate * lockTime) / (365 days * 1000);
    }

    function calculateRewards(address user) public view returns (uint256) {
        return stakes[user].rewardsAccumulated;
    }

    function stake(uint256 amount, uint256 lockMonths) external nonReentrant {
        require(amount >= 10 * 1e18, "Below minimum");
        
        // 1. Hitung bunga lunas di depan
        uint256 upfrontReward = _calculateUpfront(amount, 0, lockMonths);
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        
        stakes[msg.sender].rloAmount += amount;
        stakes[msg.sender].rewardsAccumulated += upfrontReward; // Masukkan ke saldo lunas
        stakes[msg.sender].lockEnd = block.timestamp + (lockMonths * 30 days);
        
        totalStakedRlo += amount;
    }

    function stakeEth(uint256 lockMonths) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        
        uint256 upfrontReward = _calculateUpfront(0, msg.value, lockMonths);
        
        stakes[msg.sender].ethAmount += msg.value;
        stakes[msg.sender].rewardsAccumulated += upfrontReward;
        stakes[msg.sender].lockEnd = block.timestamp + (lockMonths * 30 days);
        
        totalStakedEth += msg.value;
    }

    function stakePair(uint256 rloAmount, uint256 lockMonths) external payable nonReentrant {
        require(rloAmount >= 10 * 1e18 && msg.value > 0, "Invalid amounts");
        
        uint256 upfrontReward = _calculateUpfront(rloAmount, msg.value, lockMonths);
        
        stakingToken.transferFrom(msg.sender, address(this), rloAmount);
        
        stakes[msg.sender].rloAmount += rloAmount;
        stakes[msg.sender].ethAmount += msg.value;
        stakes[msg.sender].rewardsAccumulated += upfrontReward;
        stakes[msg.sender].lockEnd = block.timestamp + (lockMonths * 30 days);
        
        totalStakedRlo += rloAmount;
        totalStakedEth += msg.value;
    }

    // Fungsi Claim tetap sama, dia akan mengambil saldo dari rewardsAccumulated
    function claimRewards() external nonReentrant {
        uint256 reward = stakes[msg.sender].rewardsAccumulated;
        require(reward > 0, "No rewards");

        stakes[msg.sender].rewardsAccumulated = 0;

        uint256 sfsAmount = (reward * stakes[msg.sender].sfsFraction) / 10000;
        uint256 rwaAmount = (reward * stakes[msg.sender].rwaAllocation) / 10000;
        uint256 walletAmount = reward - (sfsAmount + rwaAmount);

        if (sfsAmount > 0) stakingToken.transfer(servicePaymaster, sfsAmount);
        if (rwaAmount > 0) stakingToken.transfer(servicePaymaster, rwaAmount);
        if (walletAmount > 0) stakingToken.transfer(msg.sender, walletAmount);
    }

    receive() external payable {}
}