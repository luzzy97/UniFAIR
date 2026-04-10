const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Load ABIs
const stakingABI = require('./abi/staking.json');
const swapABI = require('./abi/swap.json');
const bridgeABI = require('./abi/bridge.json');
const rewardsABI = require('./abi/rewards.json');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      writeDb({ users: {} });
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('DB Read Error:', err);
    return { users: {} };
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Provider & signer setup
function getProvider() {
  return new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo');
}

function getSigner() {
  // Mocked for UI-only demo - returns a dummy signer or just bypasses real wallet init
  return { address: '0x1234567890123456789012345678901234567890' };
}

function getContract(address, abi) {
  const signer = getSigner();
  return new ethers.Contract(address, abi, signer);
}

// Validation helpers
function validateAmount(amount) {
  const num = parseFloat(amount);
  if (!amount || isNaN(num) || num <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  return num;
}

function validateAddress(address) {
  if (!address || !ethers.isAddress(address)) {
    throw new Error('Valid wallet address required');
  }
  return ethers.getAddress(address);
}

// POST /api/swap
app.post('/api/swap', async (req, res) => {
  try {
    const { amount, fromToken, toToken, userAddress } = req.body;
    validateAmount(amount);
    validateAddress(userAddress);

    if (!fromToken || !toToken) throw new Error('fromToken and toToken are required');

    // MOCKING TRANSACTION
    console.log(`Mocking swap: ${amount} ${fromToken} -> ${toToken} for ${userAddress}`);
    const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
      success: true,
      txHash: mockTxHash,
      status: 'confirmed',
      message: `Swapped ${amount} ${fromToken} → ${toToken} (Mocked)`
    });
  } catch (err) {
    console.error('Swap error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/bridge
app.post('/api/bridge', async (req, res) => {
  try {
    const { amount, fromChain, toChain, userAddress } = req.body;
    validateAmount(amount);
    validateAddress(userAddress);

    if (!fromChain || !toChain) throw new Error('fromChain and toChain are required');
    if (fromChain === toChain) throw new Error('Source and destination chains must differ');

    // MOCKING TRANSACTION
    console.log(`Mocking bridge: ${amount} from ${fromChain} to ${toChain} for ${userAddress}`);
    const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
      success: true,
      txHash: mockTxHash,
      status: 'confirmed',
      fromChain,
      toChain,
      message: `Bridge initiated: ${amount} tokens from ${fromChain} → ${toChain} (Mocked)`
    });
  } catch (err) {
    console.error('Bridge error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/stake
app.post('/api/stake', async (req, res) => {
  try {
    const { amount, pool, userAddress } = req.body;
    validateAmount(amount);
    validateAddress(userAddress);

    if (!pool) throw new Error('Pool is required');

    // MOCKING TRANSACTION
    console.log(`Mocking stake: ${amount} in ${pool} for ${userAddress}`);
    const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PERSISTENCE UPDATE
    const db = readDb();
    const cleanAddr = validateAddress(userAddress);
    if (!db.users[cleanAddr]) db.users[cleanAddr] = { stakedRlo: 0, stakedEth: 0, rewards: 0 };
    
    if (pool?.toLowerCase().includes('eth')) {
      db.users[cleanAddr].stakedEth += parseFloat(amount);
    } else {
      db.users[cleanAddr].stakedRlo += parseFloat(amount);
    }
    writeDb(db);

    res.json({
      success: true,
      txHash: mockTxHash,
      status: 'confirmed',
      message: `Successfully staked ${amount} in pool ${pool} (Mocked & Persisted)`
    });
  } catch (err) {
    console.error('Stake error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/unstake
app.post('/api/unstake', async (req, res) => {
  try {
    const { amount, pool, userAddress } = req.body;
    validateAmount(amount);
    validateAddress(userAddress);

    if (!pool) throw new Error('Pool is required');

    // MOCKING TRANSACTION
    console.log(`Mocking unstake: ${amount} from ${pool} for ${userAddress}`);
    const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // PERSISTENCE UPDATE
    const db = readDb();
    const cleanAddr = validateAddress(userAddress);
    if (db.users[cleanAddr]) {
      if (pool?.toLowerCase().includes('eth')) {
        db.users[cleanAddr].stakedEth = Math.max(0, db.users[cleanAddr].stakedEth - parseFloat(amount));
      } else {
        db.users[cleanAddr].stakedRlo = Math.max(0, db.users[cleanAddr].stakedRlo - parseFloat(amount));
      }
      writeDb(db);
    }

    res.json({
      success: true,
      txHash: mockTxHash,
      status: 'confirmed',
      message: `Successfully unstaked ${amount} from pool ${pool} (Mocked & Persisted)`
    });
  } catch (err) {
    console.error('Unstake error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/rewards
app.get('/api/rewards', async (req, res) => {
  try {
    const { userAddress } = req.query;
    validateAddress(userAddress);

    const contract = getContract(process.env.REWARD_CONTRACT, rewardsABI);

    const [totalEarned, claimable, apy] = await Promise.all([
      contract.totalEarned(userAddress),
      contract.claimable(userAddress),
      contract.getAPY(userAddress)
    ]);

    res.json({
      success: true,
      totalEarned: ethers.formatEther(totalEarned),
      claimable: ethers.formatEther(claimable),
      apy: Number(apy) / 100 // assuming contract returns basis points
    });
  } catch (err) {
    console.error('Rewards error:', err.message);
    // Return mock data if contract not deployed yet
    res.json({
      success: true,
      totalEarned: '1248.52',
      claimable: '84.20',
      apy: 12.4,
      _mock: true
    });
  }
});

// POST /api/claim
app.post('/api/claim', async (req, res) => {
  try {
    const { userAddress } = req.body;
    validateAddress(userAddress);

    // MOCKING TRANSACTION
    console.log(`Mocking claim for ${userAddress}`);
    const mockTxHash = '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
      success: true,
      txHash: mockTxHash,
      status: 'confirmed',
      message: 'Rewards claimed successfully (Mocked)'
    });
  } catch (err) {
    console.error('Claim error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/pools
app.get('/api/pools', async (req, res) => {
  // Serve staking pool metadata
  res.json({
    success: true,
    pools: [
      {
        id: 'rlo-eth',
        name: 'RLO/ETH',
        description: 'Stake Rialo paired with Ethereum liquidity',
        apy: '18.4%',
        totalStaked: '850M RLO',
        tvl: '$942M',
        minStake: '100 RLO'
      },
      {
        id: 'rlo-usdc',
        name: 'RLO/USDC',
        description: 'Stable liquidity provision for USDC pairs',
        apy: '12.1%',
        totalStaked: '120M RLO',
        tvl: '$133M',
        minStake: '50 RLO'
      },
      {
        id: 'rlo-single',
        name: 'RLO Single Stake',
        description: 'Pure RLO staking for protocol governance',
        apy: '8.7%',
        totalStaked: '450M RLO',
        tvl: '$499M',
        minStake: '10 RLO'
      }
    ]
  });
});

// POST /api/subscribe
app.post('/api/subscribe', (req, res) => {
  console.log(`[POST] New newsletter subscription:`, req.body);
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address required');
    }

    const db = readDb();
    if (!db.subscribers) db.subscribers = [];
    
    // Check if already exists
    if (db.subscribers.includes(email.toLowerCase())) {
      return res.json({ success: true, message: 'Already subscribed' });
    }

    db.subscribers.push(email.toLowerCase());
    writeDb(db);
    res.json({ success: true, message: 'Successfully subscribed' });
  } catch (err) {
    console.warn(`[POST] Subscription failed: ${err.message}`);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/user-staking/:address
app.get('/api/user-staking/:address', (req, res) => {
  try {
    const addr = validateAddress(req.params.address);
    const db = readDb();
    const userData = db.users[addr] || { stakedRlo: 0, stakedEth: 0, rewards: 0, lastUpdate: Date.now() };
    
    console.log(`[GET] Staking Data for ${addr}: RLO=${userData.stakedRlo}, ETH=${userData.stakedEth}`);
    
    res.json({ success: true, ...userData });
  } catch (error) {
    console.error(`[GET] Staking Error for ${req.params.address}:`, error.message);
    res.status(400).json({ success: false, error: 'Invalid address' });
  }
});

app.post('/api/user-staking/:address', (req, res) => {
  try {
    const addr = validateAddress(req.params.address);
    const { rewards, stakedRlo, stakedEth } = req.body;
    const db = readDb();
    
    if (!db.users) db.users = {};
    if (!db.users[addr]) db.users[addr] = { stakedRlo: 0, stakedEth: 0, rewards: 0 };
    
    if (rewards !== undefined) db.users[addr].rewards = parseFloat(rewards);
    if (stakedRlo !== undefined) db.users[addr].stakedRlo = parseFloat(stakedRlo);
    if (stakedEth !== undefined) db.users[addr].stakedEth = parseFloat(stakedEth);
    
    db.users[addr].lastUpdate = Date.now();
    
    console.log(`[POST] Syncing ${addr}: RLO=${db.users[addr].stakedRlo}, ETH=${db.users[addr].stakedEth}`);
    
    writeDb(db);
    res.json({ success: true, userData: db.users[addr] });
  } catch (error) {
    console.error(`[POST] Sync Error for ${req.params.address}:`, error.message);
    res.status(400).json({ success: false, error: 'Invalid address or data' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Rialo backend running on port ${PORT}`);
});

module.exports = app;
