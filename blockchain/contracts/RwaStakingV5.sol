// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RwaStakingV5 is Ownable {
    IERC20 public rloToken;
    IERC20 public usdcToken;

    // --- FITUR BARU: INTERNAL ACCOUNTING ---
    // Mapping untuk mencatat saldo Credits tiap user (On-chain)
    mapping(address => uint256) public userCredits;
    
    // Event agar UI bisa mendeteksi penambahan poin secara real-time
    event CreditsEarned(address indexed user, uint256 amount);

    struct Stake {
        uint256 amountRLO;
        uint256 amountETH;
        uint256 rewardUSDC;
        uint256 startTime;
        uint256 lockDuration;
        bool claimed;
        string stakeType; 
    }

    mapping(address => Stake[]) public userStakes;

    constructor(address _rlo, address _usdc) Ownable(msg.sender) {
        rloToken = IERC20(_rlo);
        usdcToken = IERC20(_usdc);
    }

    // 1. Stake Single RLO (Menambahkan parameter _credits)
    function stakeRlo(uint256 _amount, uint256 _lockMonths, uint256 _expectedReward, uint256 _credits) external {
        rloToken.transferFrom(msg.sender, address(this), _amount);
        _createStake(_amount, 0, _lockMonths, _expectedReward, _credits, "rlo");
    }

    // 2. Stake Single ETH (Menambahkan parameter _credits)
    function stakeEth(uint256 _lockMonths, uint256 _expectedReward, uint256 _credits) external payable {
        require(msg.value > 0, "Kirim ETH-nya dong Bang");
        _createStake(0, msg.value, _lockMonths, _expectedReward, _credits, "eth");
    }

    // 3. Stake Pair (RLO + ETH) (Menambahkan parameter _credits)
    function stakePair(uint256 _rloAmount, uint256 _lockMonths, uint256 _expectedReward, uint256 _credits) external payable {
        require(_rloAmount > 0 && msg.value > 0, "Harus ada RLO dan ETH");
        rloToken.transferFrom(msg.sender, address(this), _rloAmount);
        _createStake(_rloAmount, msg.value, _lockMonths, _expectedReward, _credits, "pair");
    }

    // --- MODIFIKASI INTERNAL HELPER ---
    function _createStake(uint256 _rlo, uint256 _eth, uint256 _months, uint256 _reward, uint256 _credits, string memory _type) internal {
        // 1. Pastikan saldo USDC di kontrak cukup buat bayar reward di depan
        require(usdcToken.balanceOf(address(this)) >= _reward, "Saldo USDC kontrak tidak cukup");

        // 2. Kirim USDC INSTAN ke dompet user (Upfront)
        if (_reward > 0) {
            usdcToken.transfer(msg.sender, _reward);
        }

        // 3. UPDATE CREDITS (Real-time On-chain)
        userCredits[msg.sender] += _credits;
        emit CreditsEarned(msg.sender, _credits);

        // 4. Catat data stake
        userStakes[msg.sender].push(Stake({
            amountRLO: _rlo,
            amountETH: _eth,
            rewardUSDC: 0, 
            startTime: block.timestamp,
            lockDuration: _months * 30 days,
            claimed: true, 
            stakeType: _type
        }));
    }

    function claimReward(uint256 _index) external {
        Stake storage s = userStakes[msg.sender][_index];
        require(!s.claimed, "Sudah diklaim");
        require(block.timestamp >= s.startTime + s.lockDuration, "Belum matang");
        require(usdcToken.balanceOf(address(this)) >= s.rewardUSDC, "Saldo USDC kontrak habis");

        s.claimed = true;
        usdcToken.transfer(msg.sender, s.rewardUSDC);
    }

    function depositRewardTokens(uint256 _amount) external onlyOwner {
        usdcToken.transferFrom(msg.sender, address(this), _amount);
    }
}