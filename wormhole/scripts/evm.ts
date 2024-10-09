import { readFileSync } from 'node:fs';
import path from 'node:path'
import shell from 'shelljs';
import { http, createPublicClient, createWalletClient, getContract, parseAbi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { blue, bold, cyan, green, red, yellow } from 'yoctocolors-cjs';
import { MNEMONIC, WORMHOLE_NETWORKS } from './constants'
import { buildExecuteShellCommand, executeShellCommand } from './utils';

const EVM_CWD = path.resolve(__dirname, '..');
const execShell = buildExecuteShellCommand({ cwd: EVM_CWD });

// Export the account
export const account = mnemonicToAccount(MNEMONIC);

// Export networks
export const networks = {
  arbitrum: {
    ...WORMHOLE_NETWORKS.arbitrum,
    chain: arbitrumSepolia,
    publicClient: createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    }),
    walletClient: createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(),
    }),
  },
  base: {
    ...WORMHOLE_NETWORKS.base,
    chain: baseSepolia,
    publicClient: createPublicClient({
      chain: baseSepolia,
      transport: http(),
    }),
    walletClient: createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    }),
  },
};

// Export mainArtifact if needed in other files
export const mainArtifact = JSON.parse(readFileSync(path.resolve(__dirname, '../out/Main.sol/Main.json'), 'utf-8'));

// Export ABIs
export const interfaceAbi = parseAbi([
  "function sendMessage(string memory message) public payable returns (uint64 messageSequence)",
  "function receiveMessage(bytes calldata encodedMessage) public",
  "function receivedMessageHashes(uint256 index) view returns (bytes32)",
  "function receivedMessages(bytes32 hash) view returns (string memory)",
  "function getNumberOfReceivedMessages() public view returns (uint256)",
  "function registerEmitter(uint16 chainId, bytes32 emitterAddress) public",
])

export const wormholeCoreAbi = parseAbi([
  // wormhole event that triggesr the guardian network and which we will use to fetch the VAA
  "event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)",
]);

// Export utility functions
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const b = Buffer.from(base64, 'base64');
  return new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));  
}

export function getExplorerLink(network: typeof networks[keyof typeof networks], type: 'address' | 'tx', value: string): string {
  return `${network.explorer}/${type}/${value}`;
}

export function logSection(title: string) {
  console.log(`\n${cyan('='.repeat(50))}`);
  console.log(bold(cyan(title)));
  console.log(`${cyan('='.repeat(50))}\n`);
}

export const fetchVAA = async (chainId: number, emitterAddress: string, sequence: bigint): Promise<string> => {
  console.log(yellow(`Fetching VAA for chainId: ${chainId}, emitterAddress: ${emitterAddress}, sequence: ${sequence}`));
  
  const url = `https://api.testnet.wormholescan.io/api/v1/vaas/${chainId}/${emitterAddress}/${sequence}`;
  console.log(blue(`API URL: ${url}`));

  const response = await fetch(url);
  
  if (!response.ok) {
    console.error(red(`Failed to fetch VAA. Status: ${response.status}`));
    throw new Error(`Failed to fetch VAA: ${response.statusText}`);
  }

  const { data } = await response.json() as any;
  console.log(green('VAA fetched successfully'));

  if (!data.vaa) {
    throw new Error('VAA not found or not yet available')
  }

  console.log(yellow(`VAA: ${data.vaa}`));

  return data.vaa as string
};

// Export contract deployment and interaction functions
export async function deployEvmContract(network: typeof networks[keyof typeof networks]) {
  logSection(`Deploying to ${network.name}`);

  // Use the clients from the network config
  const { publicClient, walletClient } = network;

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(yellow(`Deployer balance: ${balance} wei`));

  if (balance === 0n) {
    throw new Error(red(`Insufficient balance on ${network.name}`));
  }

  console.log(blue('Deploying contract...'));
  const hash = await walletClient.deployContract({
    abi: mainArtifact.abi,
    bytecode: mainArtifact.bytecode.object as `0x${string}`,
    account,
    args: [network.wormholeAddress, network.wormholeChainId, network.wormholeFinality],
    chain: walletClient.chain, 
  });

  console.log(green(`Transaction hash: ${hash}`));

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(green(`Contract deployed at: ${receipt.contractAddress}`));
  console.log(blue(`Explorer link: ${getExplorerLink(network, 'address', receipt.contractAddress as `0x${string}`)}`));

  return receipt.contractAddress as `0x${string}`
}

export async function getOrDeployEvmContract(network: typeof networks[keyof typeof networks], existingAddress?: string) {
  let contractAddress: `0x${string}` = existingAddress as `0x${string}`;

  if (existingAddress) {
    logSection(`Using existing contract on ${network.name}`);
    console.log(green(`Contract address: ${existingAddress}`));
    console.log(blue(`Explorer link: ${getExplorerLink(network, 'address', existingAddress)}`));
    contractAddress = existingAddress as `0x${string}`;
  } else {
    contractAddress = await deployEvmContract(network)
  }

  return {
    contractAddress,
    contract: getContract({
      abi: interfaceAbi,
      address: contractAddress,
      client: { public: network.publicClient, wallet: network.walletClient },
    }),
  };
}

export async function sendAndConfirmEvmTransaction(
  txHash: `0x${string}`,
  network: typeof networks[keyof typeof networks],
) {
  const { publicClient } = network;

  console.log(green(`Transaction sent: ${txHash}`));
  console.log(blue(`Explorer link: ${getExplorerLink(network, 'tx', txHash)}`));

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(green("Transaction confirmed!"));

  return receipt;
}


export const buildEvmContracts = async () => {
  console.log(blue('Building EVM contracts...'));
  
  // Execute the forge build command
  const result = execShell('forge build');
  
  if (result.code !== 0) {
    console.error(red('Error building contracts:'), result.stderr);
    throw new Error('Failed to build contracts');
  }

  console.log(green('Contracts built successfully'));
  console.log(result.stdout);
};

