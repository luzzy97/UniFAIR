// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockXAUt is ERC20 {
    IERC20 public usdcToken;

    // Masukkan alamat Mock USDC Sepolia Abang saat deploy
    constructor(address _usdcAddress) ERC20("Tokenized Gold", "XAUt") {
        usdcToken = IERC20(_usdcAddress);
    }

    /**
     * @dev Fungsi untuk membeli XAUt. 
     * Harga real-time dihitung oleh Frontend (dApp), lalu dApp mengirimkan 
     * berapa USDC yang ditarik dan berapa XAUt yang harus dicetak.
     */
    function buyXAUt(uint256 usdcAmount, uint256 xautToMint) external {
        require(usdcAmount > 0, "Amount must be greater than 0");
        
        // 1. Tarik USDC dari dompet user (User harus Approve dulu di Frontend)
        require(usdcToken.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        
        // 2. Cetak (Mint) XAUt langsung ke dompet user sesuai harga real-time
        _mint(msg.sender, xautToMint);
    }
}