// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// HAPUS Ownable agar skrip leluasa mencetak koin untuk testing
contract stRLO is ERC20 {
    constructor() ERC20("Staked RIALO", "stRLO") {
        // Langsung cetak banyak koin ke dompet Abang saat deploy
        _mint(msg.sender, 100000000 * 10 ** 18); 
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}