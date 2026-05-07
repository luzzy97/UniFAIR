// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interface agar mesin bisa interaksi dengan token RLO
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// Interface agar mesin bisa menyuruh token stRLO mencetak koin
interface IstRLOToken {
    function mint(address to, uint256 amount) external;
}

contract UniFAIRStakingV3 {
    IERC20 public rloToken;
    IstRLOToken public stRloToken;

    struct StakeInfo {
        uint256 rloAmount;
        uint256 ethAmount;
        uint256 lockEndTime;
        uint256 stakeType; // 1: RLO, 2: ETH, 3: Pair
    }

    mapping(address => StakeInfo) public stakes;

    // Masukkan alamat token RLO dan stRLO saat deploy
    constructor(address _rloToken, address _stRloToken) {
        rloToken = IERC20(_rloToken);
        stRloToken = IstRLOToken(_stRloToken);
    }

    // ==========================================
    // 1. STAKE SINGLE RLO
    // ==========================================
    function stakeRlo(uint256 amount, uint256 lockMonths, uint256 expectedReward) external {
        require(amount > 0, "Jumlah stake harus > 0");
        rloToken.transferFrom(msg.sender, address(this), amount);
        
        stakes[msg.sender] = StakeInfo(amount, 0, block.timestamp + (lockMonths * 30 days), 1);
        
        // Reward diambil dari hitungan akurat Web UI
        stRloToken.mint(msg.sender, expectedReward);
    }

    // ==========================================
    // 2. STAKE SINGLE ETH
    // ==========================================
    function stakeEth(uint256 lockMonths, uint256 expectedReward) external payable {
        require(msg.value > 0, "Harus kirim ETH Bang!");
        
        stakes[msg.sender] = StakeInfo(0, msg.value, block.timestamp + (lockMonths * 30 days), 2);
        
        // Reward diambil dari hitungan akurat Web UI
        stRloToken.mint(msg.sender, expectedReward);
    }

    // ==========================================
    // 3. STAKE PAIR (RLO + ETH BERSAMAAN)
    // ==========================================
    function stakePair(uint256 amountRlo, uint256 lockMonths, uint256 expectedReward) external payable {
        require(amountRlo > 0 && msg.value > 0, "Harus setor RLO dan ETH sekaligus!");
        
        rloToken.transferFrom(msg.sender, address(this), amountRlo);

        stakes[msg.sender] = StakeInfo(amountRlo, msg.value, block.timestamp + (lockMonths * 30 days), 3);
        
        // Reward diambil dari hitungan akurat Web UI
        stRloToken.mint(msg.sender, expectedReward);
    }
}