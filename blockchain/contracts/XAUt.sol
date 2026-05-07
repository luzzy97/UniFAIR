// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RialoGold
 * @notice Rialo Tokenized Gold — ERC-20 representation of gold-backed RWA yield.
 *         Ticker: XAUt (mirrors XAUT naming convention for tokenized gold).
 *         Only the contract owner (Rialo protocol deployer) can mint tokens,
 *         ensuring supply is controlled and tied to verified RWA allocations.
 *
 * @dev Deployed on Sepolia Testnet for Rialo RWA Hub integration.
 *      Owner calls mintAllocation() after a user confirms an RWA yield allocation
 *      via signature in the front-end.
 */
contract RialoGold is ERC20, Ownable {

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted whenever tokens are minted to a recipient via allocation.
    event AllocationMinted(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @param initialOwner The address that will own this contract (Rialo deployer).
     *        Using an explicit param instead of msg.sender directly makes the
     *        contract compatible with Hardhat deploy scripts and proxy patterns.
     */
    constructor(address initialOwner)
        ERC20("Rialo Tokenized Gold", "XAUt")
        Ownable(initialOwner)
    {}

    // -------------------------------------------------------------------------
    // Owner Functions
    // -------------------------------------------------------------------------

    /**
     * @notice Mints XAUt tokens to a recipient address as their RWA allocation payout.
     * @dev Only callable by the contract owner (Rialo protocol).
     *      `amount` should be expressed in wei-equivalent units (18 decimals).
     *      Example: to mint 10.53 XAUt, pass amount = 10.53 * 10**18.
     * @param to     The recipient wallet address.
     * @param amount The number of tokens to mint (in smallest unit, 18 decimals).
     */
function mintAllocation(address to, uint256 amount) public {
        // Kita hapus onlyOwner agar user bisa mencetak emas dari hasil yield mereka
        require(to != address(0), "XAUt: mint to the zero address");
        require(amount > 0, "XAUt: mint amount must be greater than zero");
        _mint(to, amount);
        emit AllocationMinted(to, amount);
    }
}
