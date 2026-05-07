// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// HAPUS Ownable agar skrip leluasa mencetak koin untuk testing
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        // Cetak banyak koin ke dompet Abang saat pertama kali deploy
        _mint(msg.sender, 100000000 * 10 ** decimals()); 
    }

    // Fungsi terbuka untuk keperluan testing di Sepolia
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // USDT wajib menggunakan 6 angka desimal (standar global)
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}