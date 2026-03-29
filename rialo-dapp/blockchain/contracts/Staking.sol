// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Staking is Ownable, ReentrancyGuard {
    IERC20 public stakingToken;
    uint256 public rewardRate = 184; // 18.4% APY represented as (rewardRate / 1000)

    struct Stake {
        uint256 amount;
        uint256 lastUpdate;
        uint256 rewardsAccumulated;
        uint256 sfsFraction; // Basis points (e.g. 5000 = 50%)
    }

    struct SponsorshipPath {
        address destination;
        uint256 amount;
    }

    mapping(address => Stake) public stakes;
    mapping(address => SponsorshipPath[]) public userSponsorshipPaths;
    uint256 public totalStaked;
    address public servicePaymaster;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount, uint256 sfsAmount);
    event SfsFractionUpdated(address indexed user, uint256 newFraction);
    event SponsorshipPathAdded(address indexed user, address indexed destination, uint256 amount);

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        servicePaymaster = msg.sender; // Default to owner
    }

    function setServicePaymaster(address _paymaster) external onlyOwner {
        servicePaymaster = _paymaster;
    }

    function calculateRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.amount == 0) return userStake.rewardsAccumulated;

        uint256 timeElapsed = block.timestamp - userStake.lastUpdate;
        uint256 pending = (userStake.amount * rewardRate * timeElapsed) / (365 days * 1000);
        return userStake.rewardsAccumulated + pending;
    }

    function setSfsFraction(uint256 fraction) external {
        require(fraction <= 10000, "Invalid fraction");
        stakes[msg.sender].rewardsAccumulated = calculateRewards(msg.sender);
        stakes[msg.sender].lastUpdate = block.timestamp;
        stakes[msg.sender].sfsFraction = fraction;
        emit SfsFractionUpdated(msg.sender, fraction);
    }

    function addSponsorshipPath(address destination, uint256 amount) external {
        userSponsorshipPaths[msg.sender].push(SponsorshipPath(destination, amount));
        emit SponsorshipPathAdded(msg.sender, destination, amount);
    }

    function clearSponsorshipPaths() external {
        delete userSponsorshipPaths[msg.sender];
    }

    function getSponsorshipPaths(address user) external view returns (SponsorshipPath[] memory) {
        return userSponsorshipPaths[user];
    }

    uint256 public minStake = 10 * 1e18; // 10 RLO minimum

    function stake(uint256 amount) external nonReentrant {
        require(amount >= minStake, "Below minimum stake");
        
        stakes[msg.sender].rewardsAccumulated = calculateRewards(msg.sender);
        stakes[msg.sender].lastUpdate = block.timestamp;
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].amount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");

        stakes[msg.sender].rewardsAccumulated = calculateRewards(msg.sender);
        stakes[msg.sender].lastUpdate = block.timestamp;

        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        stakingToken.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        uint256 reward = calculateRewards(msg.sender);
        require(reward > 0, "No rewards to claim");

        stakes[msg.sender].rewardsAccumulated = 0;
        stakes[msg.sender].lastUpdate = block.timestamp;

        uint256 sfsAmount = (reward * stakes[msg.sender].sfsFraction) / 10000;
        uint256 walletAmount = reward - sfsAmount;

        if (sfsAmount > 0) {
            stakingToken.transfer(servicePaymaster, sfsAmount);
        }
        if (walletAmount > 0) {
            stakingToken.transfer(msg.sender, walletAmount);
        }

        emit RewardClaimed(msg.sender, walletAmount, sfsAmount);
    }
}
