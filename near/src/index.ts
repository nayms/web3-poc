const dotenv = require('dotenv');
dotenv.config();

import { Ethereum } from './ethereum';
import { createWallet } from './near';

const { MPC_CONTRACT_ID, NEAR_ACCOUNT_ID, NEAR_PRIVATE_KEY } = process.env

if (!MPC_CONTRACT_ID || !NEAR_ACCOUNT_ID || !NEAR_PRIVATE_KEY) {
  throw new Error('Missing environment variables');
}

// Constants
const MPC_CONTRACT = 'v1.signer-prod.testnet';
const CHAIN_RPC = 'https://rpc2.sepolia.org';
const CHAIN_ID = 11155111; // Sepolia testnet

// ABI for the counter contract
const abi = [
  {
    inputs: [{ internalType: 'uint256', name: '_num', type: 'uint256' }],
    name: 'set',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'get',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const contractAddress = '0xe2a01146FFfC8432497ae49A7a6cBa5B9Abd71A3';
const senderAddress = '0x6248561fb8ab5D2C35CfeCC6fBCb6497A260359A';

const ethereum = new Ethereum(CHAIN_RPC, CHAIN_ID);
const near = createWallet(MPC_CONTRACT, NEAR_ACCOUNT_ID, NEAR_PRIVATE_KEY);

// Convert Uint8Array to string
const uint8ArrayToString = (array: Uint8Array): string => {
  return Array.from(array, (byte) => String.fromCharCode(byte)).join('');
};

async function main() {
  const eth = new Ethereum(CHAIN_RPC, CHAIN_ID);

  console.log('Initializing Ethereum connection...');

  console.log(`Sender address: ${senderAddress}`);

  // Create payload for the contract call
  console.log('Creating transaction payload...');
  const data = eth.createTransactionData(contractAddress, abi, 'set', [1000]);
  const { transaction, payload } = await eth.createPayload(senderAddress, contractAddress, '0', data);

  console.log('Payload created successfully.');
  console.log(`Payload hash: ${payload}`);

  // Sign the transaction (replace this with your MPC signing logic)
  console.log('Signing transaction...');
  const { big_r, s, recovery_id } = await near.sign(payload, `m/44'/60'/0'/1`, '250000000000000', '1');

  console.log('big_r:', big_r);
  console.log('s:', s);
  console.log('recovery_id:', recovery_id);

  // Reconstruct signature
  const signedTransaction = await ethereum.reconstructSignature(big_r, s, recovery_id, transaction);

  // Relay the transaction
  try {
    console.log('Relaying transaction...');
    const txHash = await eth.relayTransaction(signedTransaction);
    console.log(`Transaction successful. Hash: ${txHash}`);
    console.log(`View transaction on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
  } catch (error: any) {
    console.error(error)
    console.error(`Error relaying transaction: ${error.message}`);
  }
}

main().catch(console.error);