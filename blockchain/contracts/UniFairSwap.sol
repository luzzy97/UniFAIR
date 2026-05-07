// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  UniFairSwap.sol — Testnet AMM Swap Contract
//  UniFAIR Protocol · v1.0.0
//
//  Supported Assets:
//    - Native ETH
//    - RLO  (RialoToken)
//    - stRLO (Staked Rialo)
//    - USDC (MockUSDC)
//    - USDT (MockUSDT)
//
//  Swap Mechanism:
//    - ETH ↔ ERC20   : Constant-product AMM (x * y = k)
//    - ERC20 ↔ ERC20 : Route through ETH virtual reserve (x * y = k)
//    - Swap Fee       : 0.30% retained in pool (consistent with Uniswap V2)
//
//  Security:
//    - ReentrancyGuard on all state-changing functions
//    - SafeERC20 for all token transfers
//    - Ownable for liquidity management
// ============================================================

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract UniFairSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────
    //  CONSTANTS & CONFIGURATION
    // ─────────────────────────────────────────────────────────

    /// @notice Swap fee: 0.30% (30 / 10_000)
    uint256 public constant SWAP_FEE_BPS = 30;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─────────────────────────────────────────────────────────
    //  TOKEN REGISTRY
    // ─────────────────────────────────────────────────────────

    enum TokenId { RLO, stRLO, USDC, USDT }

    struct TokenInfo {
        IERC20  token;
        string  symbol;
        uint8   decimals;
    }

    /// @notice Registered ERC20 tokens (indexed by TokenId enum)
    mapping(TokenId => TokenInfo) public tokenRegistry;

    // ─────────────────────────────────────────────────────────
    //  AMM RESERVES
    //  Each ERC20 token is paired with native ETH in its own
    //  virtual pool: reserveETH[T] and reserveToken[T].
    // ─────────────────────────────────────────────────────────

    /// @notice ETH side of each token pool
    mapping(TokenId => uint256) public reserveETH;

    /// @notice Token side of each token pool
    mapping(TokenId => uint256) public reserveToken;

    // ─────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────

    event LiquidityAdded(
        address indexed owner,
        TokenId indexed tokenId,
        uint256 ethAmount,
        uint256 tokenAmount
    );

    event SwapETHForToken(
        address indexed user,
        TokenId indexed tokenId,
        uint256 ethIn,
        uint256 tokenOut
    );

    event SwapTokenForETH(
        address indexed user,
        TokenId indexed tokenId,
        uint256 tokenIn,
        uint256 ethOut
    );

    event SwapTokenForToken(
        address indexed user,
        TokenId indexed tokenIdIn,
        TokenId indexed tokenIdOut,
        uint256 amountIn,
        uint256 amountOut
    );

    // ─────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────

    /**
     * @param rlo    Address of the RLO ERC20 token
     * @param stRlo  Address of the stRLO ERC20 token
     * @param usdc   Address of the USDC ERC20 token
     * @param usdt   Address of the USDT ERC20 token
     */
    constructor(
        address rlo,
        address stRlo,
        address usdc,
        address usdt
    ) Ownable(msg.sender) {
        require(rlo   != address(0), "UniFairSwap: zero address RLO");
        require(stRlo != address(0), "UniFairSwap: zero address stRLO");
        require(usdc  != address(0), "UniFairSwap: zero address USDC");
        require(usdt  != address(0), "UniFairSwap: zero address USDT");

        tokenRegistry[TokenId.RLO]   = TokenInfo({ token: IERC20(rlo),   symbol: "RLO",   decimals: 18 });
        tokenRegistry[TokenId.stRLO] = TokenInfo({ token: IERC20(stRlo), symbol: "stRLO", decimals: 18 });
        tokenRegistry[TokenId.USDC]  = TokenInfo({ token: IERC20(usdc),  symbol: "USDC",  decimals: 6  });
        tokenRegistry[TokenId.USDT]  = TokenInfo({ token: IERC20(usdt),  symbol: "USDT",  decimals: 6  });
    }

    // ─────────────────────────────────────────────────────────
    //  OWNER: LIQUIDITY MANAGEMENT
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Deposit ETH + a specific ERC20 token to seed a pool.
     *         Can be called multiple times to top-up reserves.
     * @dev    The ETH amount is determined by msg.value.
     *         The token amount must be pre-approved to this contract.
     * @param  tokenId  The pool to seed (RLO, stRLO, USDC, or USDT)
     * @param  tokenAmount  Amount of ERC20 tokens to deposit (in token's native units)
     */
    function addLiquidity(TokenId tokenId, uint256 tokenAmount)
        external
        payable
        onlyOwner
        nonReentrant
    {
        require(msg.value > 0,     "UniFairSwap: ETH amount required");
        require(tokenAmount > 0,   "UniFairSwap: token amount required");

        IERC20 token = tokenRegistry[tokenId].token;
        require(address(token) != address(0), "UniFairSwap: token not registered");

        // Pull tokens from owner into the contract
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);

        // Update virtual reserves
        reserveETH[tokenId]   += msg.value;
        reserveToken[tokenId] += tokenAmount;

        emit LiquidityAdded(msg.sender, tokenId, msg.value, tokenAmount);
    }

    /**
     * @notice Convenience function: deposit only ETH into an existing pool.
     *         Useful for topping up the ETH side when the token side is already funded.
     * @param  tokenId  Target pool
     */
    function addLiquidityETH(TokenId tokenId)
        external
        payable
        onlyOwner
        nonReentrant
    {
        require(msg.value > 0, "UniFairSwap: ETH amount required");
        reserveETH[tokenId] += msg.value;
        emit LiquidityAdded(msg.sender, tokenId, msg.value, 0);
    }

    /**
     * @notice Convenience function: deposit only ERC20 tokens into an existing pool.
     * @param  tokenId     Target pool
     * @param  tokenAmount Amount of tokens to deposit
     */
    function addLiquidityToken(TokenId tokenId, uint256 tokenAmount)
        external
        onlyOwner
        nonReentrant
    {
        require(tokenAmount > 0, "UniFairSwap: token amount required");
        IERC20 token = tokenRegistry[tokenId].token;
        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        reserveToken[tokenId] += tokenAmount;
        emit LiquidityAdded(msg.sender, tokenId, 0, tokenAmount);
    }

    /**
     * @notice Emergency: Owner withdraws ETH from a pool.
     * @param  tokenId Target pool
     * @param  amount  ETH amount (wei)
     */
    function withdrawLiquidityETH(TokenId tokenId, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(reserveETH[tokenId] >= amount, "UniFairSwap: insufficient ETH reserve");
        reserveETH[tokenId] -= amount;
        (bool ok, ) = payable(owner()).call{value: amount}("");
        require(ok, "UniFairSwap: ETH withdrawal failed");
    }

    /**
     * @notice Emergency: Owner withdraws ERC20 tokens from a pool.
     * @param  tokenId     Target pool
     * @param  tokenAmount Amount to withdraw
     */
    function withdrawLiquidityToken(TokenId tokenId, uint256 tokenAmount)
        external
        onlyOwner
        nonReentrant
    {
        require(reserveToken[tokenId] >= tokenAmount, "UniFairSwap: insufficient token reserve");
        reserveToken[tokenId] -= tokenAmount;
        tokenRegistry[tokenId].token.safeTransfer(owner(), tokenAmount);
    }

    // ─────────────────────────────────────────────────────────
    //  AMM CORE MATH
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Constant-product formula (Uniswap V2 style).
     *         amountOut = (amountIn * fee_adjusted * reserveOut)
     *                   / (reserveIn * BPS_DENOMINATOR + amountIn * fee_adjusted)
     * @param  amountIn   Exact input amount (after external fee, before swap)
     * @param  reserveIn  Current reserve of the input asset
     * @param  reserveOut Current reserve of the output asset
     * @return amountOut  Calculated output amount
     */
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0,   "UniFairSwap: insufficient input");
        require(reserveIn > 0 && reserveOut > 0, "UniFairSwap: empty reserve");

        // Apply 0.30% fee: effective input = amountIn * (10000 - 30)
        uint256 amountInWithFee = amountIn * (BPS_DENOMINATOR - SWAP_FEE_BPS);
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = (reserveIn * BPS_DENOMINATOR) + amountInWithFee;

        amountOut = numerator / denominator;
    }

    // ─────────────────────────────────────────────────────────
    //  PUBLIC VIEW: PRICE QUOTES
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Quote: how many tokens you get for a given ETH input.
     */
    function quoteETHForToken(TokenId tokenId, uint256 ethIn)
        external
        view
        returns (uint256 tokenOut)
    {
        tokenOut = _getAmountOut(ethIn, reserveETH[tokenId], reserveToken[tokenId]);
    }

    /**
     * @notice Quote: how much ETH you get for a given token input.
     */
    function quoteTokenForETH(TokenId tokenId, uint256 tokenIn)
        external
        view
        returns (uint256 ethOut)
    {
        ethOut = _getAmountOut(tokenIn, reserveToken[tokenId], reserveETH[tokenId]);
    }

    /**
     * @notice Quote: ERC20 → ERC20 via ETH bridge.
     *         Step 1: tokenIn → ETH  |  Step 2: ETH → tokenOut
     */
    function quoteTokenForToken(
        TokenId tokenIdIn,
        TokenId tokenIdOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        uint256 ethMid  = _getAmountOut(amountIn, reserveToken[tokenIdIn], reserveETH[tokenIdIn]);
        amountOut        = _getAmountOut(ethMid,  reserveETH[tokenIdOut], reserveToken[tokenIdOut]);
    }

    // ─────────────────────────────────────────────────────────
    //  SWAP FUNCTIONS
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Swap exact ETH → ERC20 token.
     * @param  tokenId        Target token to receive
     * @param  minTokenOut    Minimum acceptable output (slippage protection)
     * @param  deadline       Unix timestamp after which the swap reverts
     */
    function swapExactETHForTokens(
        TokenId tokenId,
        uint256 minTokenOut,
        uint256 deadline
    ) external payable nonReentrant {
        require(block.timestamp <= deadline, "UniFairSwap: transaction expired");
        require(msg.value > 0,              "UniFairSwap: ETH amount required");

        uint256 ethIn    = msg.value;
        uint256 tokenOut = _getAmountOut(ethIn, reserveETH[tokenId], reserveToken[tokenId]);

        require(tokenOut >= minTokenOut,    "UniFairSwap: slippage exceeded");
        require(reserveToken[tokenId] >= tokenOut, "UniFairSwap: insufficient liquidity");

        // Update reserves (ETH in, tokens out)
        reserveETH[tokenId]   += ethIn;
        reserveToken[tokenId] -= tokenOut;

        // Send tokens to user
        tokenRegistry[tokenId].token.safeTransfer(msg.sender, tokenOut);

        emit SwapETHForToken(msg.sender, tokenId, ethIn, tokenOut);
    }

    /**
     * @notice Swap exact ERC20 token → ETH.
     * @param  tokenId    Source token to sell
     * @param  tokenIn    Exact amount of token to sell
     * @param  minEthOut  Minimum acceptable ETH output (slippage protection)
     * @param  deadline   Unix timestamp after which the swap reverts
     */
    function swapExactTokensForETH(
        TokenId tokenId,
        uint256 tokenIn,
        uint256 minEthOut,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "UniFairSwap: transaction expired");
        require(tokenIn > 0,                "UniFairSwap: token amount required");

        uint256 ethOut = _getAmountOut(tokenIn, reserveToken[tokenId], reserveETH[tokenId]);

        require(ethOut >= minEthOut,        "UniFairSwap: slippage exceeded");
        require(reserveETH[tokenId] >= ethOut, "UniFairSwap: insufficient ETH liquidity");

        // Pull tokens from user
        tokenRegistry[tokenId].token.safeTransferFrom(msg.sender, address(this), tokenIn);

        // Update reserves (tokens in, ETH out)
        reserveToken[tokenId] += tokenIn;
        reserveETH[tokenId]   -= ethOut;

        // Send ETH to user
        (bool ok, ) = payable(msg.sender).call{value: ethOut}("");
        require(ok, "UniFairSwap: ETH transfer failed");

        emit SwapTokenForETH(msg.sender, tokenId, tokenIn, ethOut);
    }

    /**
     * @notice Swap ERC20 token → ERC20 token (via ETH bridge internally).
     *         Routes: tokenIn → ETH (pool A) → tokenOut (pool B)
     *         Both pools are consulted; fee is applied twice.
     * @param  tokenIdIn   Source token
     * @param  tokenIdOut  Destination token
     * @param  amountIn    Exact input amount
     * @param  minAmountOut Minimum acceptable output (slippage protection)
     * @param  deadline    Unix timestamp after which the swap reverts
     */
    function swapTokensForTokens(
        TokenId tokenIdIn,
        TokenId tokenIdOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "UniFairSwap: transaction expired");
        require(tokenIdIn != tokenIdOut,     "UniFairSwap: identical tokens");
        require(amountIn > 0,               "UniFairSwap: input amount required");

        // ── Step 1: tokenIn → virtual ETH (pool of tokenIn)
        uint256 ethMid = _getAmountOut(
            amountIn,
            reserveToken[tokenIdIn],
            reserveETH[tokenIdIn]
        );
        require(reserveETH[tokenIdIn] >= ethMid, "UniFairSwap: insufficient ETH in source pool");

        // ── Step 2: virtual ETH → tokenOut (pool of tokenOut)
        uint256 amountOut = _getAmountOut(
            ethMid,
            reserveETH[tokenIdOut],
            reserveToken[tokenIdOut]
        );
        require(amountOut >= minAmountOut,               "UniFairSwap: slippage exceeded");
        require(reserveToken[tokenIdOut] >= amountOut,   "UniFairSwap: insufficient liquidity in dest pool");

        // Pull tokenIn from user
        tokenRegistry[tokenIdIn].token.safeTransferFrom(msg.sender, address(this), amountIn);

        // Update reserves for source pool (tokens in, ETH virtually out)
        reserveToken[tokenIdIn] += amountIn;
        reserveETH[tokenIdIn]   -= ethMid;

        // Update reserves for destination pool (ETH virtually in, tokens out)
        reserveETH[tokenIdOut]   += ethMid;
        reserveToken[tokenIdOut] -= amountOut;

        // Send tokenOut to user
        tokenRegistry[tokenIdOut].token.safeTransfer(msg.sender, amountOut);

        emit SwapTokenForToken(msg.sender, tokenIdIn, tokenIdOut, amountIn, amountOut);
    }

    // ─────────────────────────────────────────────────────────
    //  VIEW HELPERS
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Returns reserves for a given pool.
     * @return ethReserve   Current ETH reserve (wei)
     * @return tokenReserve Current token reserve (token native units)
     */
    function getReserves(TokenId tokenId)
        external
        view
        returns (uint256 ethReserve, uint256 tokenReserve)
    {
        ethReserve   = reserveETH[tokenId];
        tokenReserve = reserveToken[tokenId];
    }

    /**
     * @notice Returns the registered token address for a given TokenId.
     */
    function getTokenAddress(TokenId tokenId) external view returns (address) {
        return address(tokenRegistry[tokenId].token);
    }

    /**
     * @notice Returns the current spot price of 1 token in ETH (18-decimal basis).
     *         Uses reserveETH / reserveToken, not accounting for fees.
     *         Use quoteETHForToken / quoteTokenForETH for actual swap rates.
     */
    function getSpotPriceTokenInETH(TokenId tokenId)
        external
        view
        returns (uint256 priceWei)
    {
        uint256 rETH = reserveETH[tokenId];
        uint256 rTok = reserveToken[tokenId];
        require(rTok > 0, "UniFairSwap: no token reserve");
        // Normalise to 18 decimals
        uint8 dec = tokenRegistry[tokenId].decimals;
        priceWei = (rETH * (10 ** dec)) / rTok;
    }

    // ─────────────────────────────────────────────────────────
    //  RECEIVE ETH (direct top-up without pool routing)
    // ─────────────────────────────────────────────────────────

    /// @dev Accept plain ETH sends (e.g. re-entrancy guard return ETH path)
    receive() external payable {}
}
