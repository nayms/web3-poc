import { readFileSync } from 'node:fs';
import path from 'node:path'
import { deserialize } from "@wormhole-foundation/sdk";
import { http, createPublicClient, createWalletClient, getContract, pad, parseAbi, parseEventLogs } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { blue, bold, cyan, green, red, yellow } from 'yoctocolors-cjs';
import { MNEMONIC } from './constants'

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('arbitrum-address', {
    type: 'string',
    description: 'Existing contract address on Arbitrum Sepolia',
  })
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any



const account = mnemonicToAccount(MNEMONIC);

const networks = {
  arbitrum: { 
    name: 'Arbitrum Sepolia', 
    chain: arbitrumSepolia, 
    explorer: 'https://sepolia.arbiscan.io',
    wormholeAddress: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    wormholeChainId: 10003,
    wormholeFinality: 200,
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
    name: 'Base Sepolia', 
    chain: baseSepolia, 
    explorer: 'https://sepolia.basescan.org',
    wormholeAddress: '0x79A1027a6A159502049F10906D333EC57E95F083',
    wormholeChainId: 10004,
    wormholeFinality: 200,
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

const mainArtifact = JSON.parse(readFileSync(path.resolve(__dirname, '../out/Main.sol/Main.json'), 'utf-8'));

const interfaceAbi = parseAbi([
  "function sendMessage(string memory message) public payable returns (uint64 messageSequence)",
  "function receiveMessage(bytes memory encodedMessage) public",
  "function receivedMessageHashes(uint256 index) view returns (bytes32)",
  "function receivedMessages(bytes32 hash) view returns (string memory)",
  "function getReceivedMessagesCount() public view returns (uint256)",
  "function registerEmitter(uint16 chainId, bytes32 emitterAddress) public",
])

const wormholeCoreAbi = parseAbi([
  // wormhole event that triggesr the guardian network and which we will use to fetch the VAA
  "event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)",
]);

const base64ToUint8Array = (base64: string): Uint8Array => {
  const b = Buffer.from(base64, 'base64');
  return new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));  
}

function getExplorerLink(network: typeof networks[keyof typeof networks], type: 'address' | 'tx', value: string): string {
  return `${network.explorer}/${type}/${value}`;
}

function logSection(title: string) {
  console.log(`\n${cyan('='.repeat(50))}`);
  console.log(bold(cyan(title)));
  console.log(`${cyan('='.repeat(50))}\n`);
}

const fetchVAA = async (chainId: number, emitterAddress: string, sequence: bigint): Promise<string> => {
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

async function deployContract(network: typeof networks[keyof typeof networks]) {
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

async function getOrDeployContract(network: typeof networks[keyof typeof networks], existingAddress?: string) {
  let contractAddress: `0x${string}` = existingAddress as `0x${string}`;

  if (existingAddress) {
    logSection(`Using existing contract on ${network.name}`);
    console.log(green(`Contract address: ${existingAddress}`));
    console.log(blue(`Explorer link: ${getExplorerLink(network, 'address', existingAddress)}`));
    contractAddress = existingAddress as `0x${string}`;
  } else {
    contractAddress = await deployContract(network)
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

async function sendAndConfirmTransaction(
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

async function main() {
  // Get or deploy contracts
  const arbitrum = await getOrDeployContract(networks.arbitrum, argv['arbitrum-address']);
  const base = await getOrDeployContract(networks.base, argv['base-address']);

  // register arbitrum contract as emitter on base
  logSection('Registering Arbitrum contract as emitter on Base');
  await sendAndConfirmTransaction(
    // @ts-ignore
    await base.contract.write.registerEmitter([networks.arbitrum.wormholeChainId, pad(arbitrum.contractAddress)]),
    networks.base
  );

  // Send message from Arbitrum to Base
  logSection('Sending message from Arbitrum Sepolia to Base Sepolia');

  const message = 'Nayms is in the house!';
  console.log(yellow(`Message: "${message}"`));

  const receipt = await sendAndConfirmTransaction(
    // @ts-ignore
    await arbitrum.contract.write.sendMessage([message]),
    networks.arbitrum
  );

  logSection('Fetching VAA');

  const logs = parseEventLogs({
    abi: wormholeCoreAbi,
    logs: receipt.logs,
  });

  // get sender and sequence from the logs
  const logMessagePublishedEvent = logs.find(log => log.eventName === 'LogMessagePublished');
  if (!logMessagePublishedEvent) {
    throw new Error('LogMessagePublished event not found in transaction receipt');
  }
  const sender = logMessagePublishedEvent.args.sender;
  const sequence = logMessagePublishedEvent.args.sequence;

  console.log(yellow(`Message sender: ${sender}`));
  console.log(yellow(`Message sequence: ${sequence}`));

  // fetch VAA from wormhole api
  const vaaBase64 = await fetchVAA(networks.arbitrum.wormholeChainId, sender, sequence)
  const vaaUint8Array = base64ToUint8Array(vaaBase64);
  // decode vaa
  const decodedVAA = deserialize("Uint8Array", vaaUint8Array);
  console.log(yellow("Decoded VAA:"), decodedVAA);

  logSection('Submitting VAA to Base Sepolia');

  await sendAndConfirmTransaction(
    // @ts-ignore
    await base.contract.write.receiveMessage([vaaUint8Array]),
    networks.base
  );

  logSection('Checking to see if message was received on Base Sepolia');

  const numberOfMessages = await base.contract.read.getReceivedMessagesCount();
  console.log(yellow(`Number of messages: ${numberOfMessages}`));

  const msgHash = await base.contract.read.receivedMessageHashes([0n]);
  console.log(yellow(`Message hash: ${msgHash}`));

  const msg = await base.contract.read.receivedMessages([msgHash]);
  console.log(green(`Received message: "${msg}"`));
}



main().then(() => {
  logSection('Execution Completed');
  console.log(bold(green('Deployed contracts and sent message successfully')));
  process.exit(0);
}).catch((error) => {
  console.error(red('Error occurred:'));
  console.error(red(error.stack || error.message));
  process.exit(1);
});
