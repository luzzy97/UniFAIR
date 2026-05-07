import { ethers } from 'ethers';
import deployedContracts from './contracts/deployedContracts.json';

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/0Q1w8cnNB5iA7R46P9zKH";

export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(RPC_URL);
};

export const getContract = (name, signerOrProvider) => {
  const address = deployedContracts.address[name];
  const abi = deployedContracts.abi[name];
  if (!address || !abi) throw new Error(`Contract ${name} not found`);

  return new ethers.Contract(address, abi, signerOrProvider || getProvider());
};

export const RLO_ADDRESS = deployedContracts.address.RLO;
export const STAKING_ADDRESS = deployedContracts.address.Staking;
