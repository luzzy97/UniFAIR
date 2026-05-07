// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RwaStakingV6 is Ownable {
    IERC20 public rloToken;
    IERC20 public usdcToken;
    IERC20 public stRloToken; // Mesin baru untuk stRLO

    mapping(address => uint256) public userCredits;
    event CreditsEarned(address indexed user, uint256 amount);

    struct Stake {
        uint256 amountRLO;
        uint256 amountETH;
        uint256 rewardUSDC;
        uint256 rewardSTRLO;
        uint256 startTime;
        uint256 lockDuration;
        bool claimed;
        string stakeType;
    }

    mapping(address => Stake[]) public userStakes;

    // Constructor menerima 3 alamat
    constructor(address _rlo, address _usdc, address _stRlo) Ownable(msg.sender) {
        rloToken = IERC20(_rlo);
        usdcToken = IERC20(_usdc);
        stRloToken = IERC20(_stRlo);
    }

    // Fungsi Stake sekarang WAJIB menerima 5 Parameter
    function stakeRlo(uint256 _amount, uint256 _lockMonths, uint256 _usdcReward, uint256 _stRloReward, uint256 _credits) external {
        rloToken.transferFrom(msg.sender, address(this), _amount);
        _createStake(_amount, 0, _lockMonths, _usdcReward, _stRloReward, _credits, "rlo");
    }

    function stakeEth(uint256 _lockMonths, uint256 _usdcReward, uint256 _stRloReward, uint256 _credits) external payable {
        require(msg.value > 0, "Kirim ETH");
        _createStake(0, msg.value, _lockMonths, _usdcReward, _stRloReward, _credits, "eth");
    }

    function stakePair(uint256 _rloAmount, uint256 _lockMonths, uint256 _usdcReward, uint256 _stRloReward, uint256 _credits) external payable {
        require(_rloAmount > 0 && msg.value > 0, "Harus ada RLO dan ETH");
        rloToken.transferFrom(msg.sender, address(this), _rloAmount);
        _createStake(_rloAmount, msg.value, _lockMonths, _usdcReward, _stRloReward, _credits, "pair");
    }

    function _createStake(uint256 _rlo, uint256 _eth, uint256 _months, uint256 _usdcReward, uint256 _stRloReward, uint256 _credits, string memory _type) internal {
        // 1. Eksekusi Pembayaran USDC (Jika ada)
        if (_usdcReward > 0) {
            require(usdcToken.balanceOf(address(this)) >= _usdcReward, "Saldo USDC kontrak kurang");
            usdcToken.transfer(msg.sender, _usdcReward);
        }

        // 2. Eksekusi Pembayaran stRLO (Jika ada)
        if (_stRloReward > 0) {
            require(stRloToken.balanceOf(address(this)) >= _stRloReward, "Saldo stRLO kontrak kurang");
            stRloToken.transfer(msg.sender, _stRloReward);
        }

        // 3. Tambah Poin
        userCredits[msg.sender] += _credits;
        emit CreditsEarned(msg.sender, _credits);

        // 4. Catat Riwayat
        userStakes[msg.sender].push(Stake({
            amountRLO: _rlo,
            amountETH: _eth,
            rewardUSDC: 0,
            rewardSTRLO: 0, // 0 karena sudah cair upfront
            startTime: block.timestamp,
            lockDuration: _months * 30 days,
            claimed: true,
            stakeType: _type
        }));
    }
}