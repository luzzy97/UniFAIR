// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Staking is Ownable, ReentrancyGuard {
    IERC20 public stakingToken; // RLO Token
    uint256 public rewardRate = 184; // 18.4% base APY represented as (rewardRate / 1000)

    struct Stake {
        uint256 rloAmount;
        uint256 ethAmount;
        uint256 lastUpdate;
        uint256 lockEnd;
        uint256 rewardsAccumulated;
        uint256 sfsFraction; // Basis points (e.g. 5000 = 50%)
        uint256 rwaAllocation; // Basis points (e.g. 2500 = 25%)
        string rwaTarget; // e.g. "treasury", "real-estate", "gold"
    }

    struct SponsorshipPath {
        address destination;
        uint256 amount;
    }

    mapping(address => Stake) public stakes;
    mapping(address => SponsorshipPath[]) public userSponsorshipPaths;
    
    uint256 public totalStakedRlo;
    uint256 public totalStakedEth;
    address public servicePaymaster;

    event StakedRLO(address indexed user, uint256 amount, uint256 lockEnd);
    event StakedETH(address indexed user, uint256 amount, uint256 lockEnd);
    event StakedPair(address indexed user, uint256 rloAmount, uint256 ethAmount, uint256 lockEnd);
    
    event WithdrawnRLO(address indexed user, uint256 amount);
    event WithdrawnETH(address indexed user, uint256 amount);
    event WithdrawnPair(address indexed user, uint256 rloAmount, uint256 ethAmount);

    event RewardClaimed(address indexed user, uint256 walletAmount, uint256 sfsAmount, uint256 rwaAmount);
    event SfsFractionUpdated(address indexed user, uint256 newFraction);
    event RwaAllocationUpdated(address indexed user, uint256 percentage, string target);
    event SponsorshipPathAdded(address indexed user, address indexed destination, uint256 amount);

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        servicePaymaster = msg.sender; // Default to deployer acting as generalized paymaster receiver
    }

    function setServicePaymaster(address _paymaster) external onlyOwner {
        servicePaymaster = _paymaster;
    }

    function calculateRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        if (userStake.rloAmount == 0 && userStake.ethAmount == 0) return userStake.rewardsAccumulated;

        uint256 timeElapsed = block.timestamp - userStake.lastUpdate;
        
        // Effective Principal calculation (Simulated ratio: 1 ETH = 2000 RLO)
        uint256 effectivePrincipal = userStake.rloAmount + (userStake.ethAmount * 2000);
        uint256 pending = (effectivePrincipal * rewardRate * timeElapsed) / (365 days * 1000);
        
        return userStake.rewardsAccumulated + pending;
    }

    function updateStaker(address user) internal {
        stakes[user].rewardsAccumulated = calculateRewards(user);
        stakes[user].lastUpdate = block.timestamp;
    }

    function setSfsFraction(uint256 fraction) external {
        require(fraction <= 10000, "Invalid fraction");
        updateStaker(msg.sender);
        stakes[msg.sender].sfsFraction = fraction;
        emit SfsFractionUpdated(msg.sender, fraction);
    }

    function setRwaAllocation(string calldata target, uint256 percentage) external {
        require(percentage <= 10000, "Invalid percentage");
        updateStaker(msg.sender);
        stakes[msg.sender].rwaAllocation = percentage;
        stakes[msg.sender].rwaTarget = target;
        emit RwaAllocationUpdated(msg.sender, percentage, target);
    }

    function addSponsorshipPath(address destination, uint256 amount) external {
        userSponsorshipPaths[msg.sender].push(SponsorshipPath(destination, amount));
        emit SponsorshipPathAdded(msg.sender, destination, amount);
    }

    function getSponsorshipPaths(address user) external view returns (SponsorshipPath[] memory) {
        return userSponsorshipPaths[user];
    }

    uint256 public minStakeRlo = 10 * 1e18; // 10 RLO minimum

    function stake(uint256 amount, uint256 lockMonths) external nonReentrant {
        require(amount >= minStakeRlo, "Below minimum stake");
        updateStaker(msg.sender);
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].rloAmount += amount;
        totalStakedRlo += amount;
        
        stakes[msg.sender].lockEnd = block.timestamp + (lockMonths * 30 days);
        emit StakedRLO(msg.sender, amount, stakes[msg.sender].lockEnd);
    }

    function stakeEth(uint256 lockMonths) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        updateStaker(msg.sender);
        
        stakes[msg.sender].ethAmount += msg.value;
        totalStakedEth += msg.value;
        
        stakes[msg.sender].lockEnd = block.timestamp + (lockMonths * 30 days);
        emit StakedETH(msg.sender, msg.value, stakes[msg.sender].lockEnd);
    }

    function stakePair(uint256 rloAmount, uint256 lockMonths) external payable nonReentrant {
        require(rloAmount >= minStakeRlo && msg.value > 0, "Invalid amounts");
        updateStaker(msg.sender);
        
        stakingToken.transferFrom(msg.sender, address(this), rloAmount);
        stakes[msg.sender].rloAmount += rloAmount;
        totalStakedRlo += rloAmount;
        
        stakes[msg.sender].ethAmount += msg.value;
        totalStakedEth += msg.value;

        stakes[msg.sender].lockEnd = block.timestamp + (lockMonths * 30 days);
        emit StakedPair(msg.sender, rloAmount, msg.value, stakes[msg.sender].lockEnd);
    }

    function withdraw() external nonReentrant {
        require(block.timestamp >= stakes[msg.sender].lockEnd, "Stake is still locked");
        
        updateStaker(msg.sender);

        uint256 wRlo = stakes[msg.sender].rloAmount;
        uint256 wEth = stakes[msg.sender].ethAmount;
        require(wRlo > 0 || wEth > 0, "Nothing to withdraw");

        stakes[msg.sender].rloAmount = 0;
        stakes[msg.sender].ethAmount = 0;
        
        totalStakedRlo -= wRlo;
        totalStakedEth -= wEth;

        if (wRlo > 0) {
            stakingToken.transfer(msg.sender, wRlo);
        }
        if (wEth > 0) {
            (bool success, ) = payable(msg.sender).call{value: wEth}("");
            require(success, "ETH transfer failed");
        }

        emit WithdrawnPair(msg.sender, wRlo, wEth);
    }

    function withdrawAmount(uint256 rloAmt, uint256 ethAmt) external nonReentrant {
        require(block.timestamp >= stakes[msg.sender].lockEnd, "Stake is still locked");
        require(stakes[msg.sender].rloAmount >= rloAmt, "Insufficient RLO staked");
        require(stakes[msg.sender].ethAmount >= ethAmt, "Insufficient ETH staked");
        
        updateStaker(msg.sender);

        stakes[msg.sender].rloAmount -= rloAmt;
        stakes[msg.sender].ethAmount -= ethAmt;
        
        totalStakedRlo -= rloAmt;
        totalStakedEth -= ethAmt;

        if (rloAmt > 0) {
            stakingToken.transfer(msg.sender, rloAmt);
        }
        if (ethAmt > 0) {
            (bool success, ) = payable(msg.sender).call{value: ethAmt}("");
            require(success, "ETH transfer failed");
        }

        emit WithdrawnPair(msg.sender, rloAmt, ethAmt);
    }

    function claimRewards() external nonReentrant {
        uint256 reward = calculateRewards(msg.sender);
        require(reward > 0, "No rewards to claim");

        stakes[msg.sender].rewardsAccumulated = 0;
        stakes[msg.sender].lastUpdate = block.timestamp;

        uint256 sfsAmount = (reward * stakes[msg.sender].sfsFraction) / 10000;
        uint256 rwaAmount = (reward * stakes[msg.sender].rwaAllocation) / 10000;
        
        // Prevent underflow if percentages exceed 100%
        if (sfsAmount + rwaAmount > reward) {
            rwaAmount = reward - sfsAmount; 
        }

        uint256 walletAmount = reward - (sfsAmount + rwaAmount);

        // Service credits allocation (sent to paymaster node wallet for future relay usage)
        if (sfsAmount > 0) {
            stakingToken.transfer(servicePaymaster, sfsAmount);
        }
        // RWA Hub routing (in production, triggers off-chain oracle conversion, for now held by paymaster)
        if (rwaAmount > 0) {
            stakingToken.transfer(servicePaymaster, rwaAmount);
        }
        
        if (walletAmount > 0) {
            stakingToken.transfer(msg.sender, walletAmount);
        }

        emit RewardClaimed(msg.sender, walletAmount, sfsAmount, rwaAmount);
    }

    // Required to receive ETH for single/pair ETH staking natively
    receive() external payable {}
}
