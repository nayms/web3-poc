import { readFileSync } from 'node:fs';
import path from 'node:path'
import { http, createPublicClient, createWalletClient, getContract, parseAbi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { blue, bold, cyan, green, red, yellow } from 'yoctocolors-cjs';
import { MNEMONIC } from './constants'

const account = mnemonicToAccount(MNEMONIC);

const networks = {
  arbitrum: { 
    name: 'Arbitrum Sepolia', 
    chain: arbitrumSepolia, 
    explorer: 'https://sepolia.arbiscan.io',
    wormholeAddress: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    wormholeChainId: 10003,
    wormholeFinality: 200
  },
  base: { 
    name: 'Base Sepolia', 
    chain: baseSepolia, 
    explorer: 'https://sepolia.basescan.org',
    wormholeAddress: '0x79A1027a6A159502049F10906D333EC57E95F083',
    wormholeChainId: 10004,
    wormholeFinality: 200
  },
};

const mainArtifact = JSON.parse(readFileSync(path.resolve(__dirname, '../out/Main.sol/Main.json'), 'utf-8'));

const interfaceAbi = parseAbi([
  "function sendMessage(string memory message) public payable returns (uint64 messageSequence)",
  "function receivedMessageHashes(uint256 index) view returns (bytes32)",
  "function receivedMessages(bytes32 hash) view returns (string memory)",
  "function getNumberOfReceivedMessages() public view returns (uint256)"
])

function getExplorerLink(network: typeof networks[keyof typeof networks], type: 'address' | 'tx', value: string): string {
  return `${network.explorer}/${type}/${value}`;
}

function logSection(title: string) {
  console.log('\n' + cyan('='.repeat(50)));
  console.log(bold(cyan(title)));
  console.log(cyan('='.repeat(50)) + '\n');
}

async function deployContract(network: typeof networks[keyof typeof networks]) {
  logSection(`Deploying to ${network.name}`);

  const publicClient = createPublicClient({
    chain: network.chain, 
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: network.chain,
    transport: http(),
  });

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

  return { 
    contractAddress: receipt.contractAddress, 
    publicClient, 
    walletClient,
    contract: getContract({
      abi: interfaceAbi,
      address: receipt.contractAddress as `0x${string}`,
      client: { public: publicClient, wallet: walletClient },
    }),
  }
}

async function main() {
  // Deploy contracts
  const arbitrum = await deployContract(networks.arbitrum);
  const base = await deployContract(networks.base);

  // Send message from Arbitrum to Base
  logSection('Sending message from Arbitrum Sepolia to Base Sepolia');

  const message = 'Hello from Arbitrum Sepolia!';
  console.log(yellow(`Message: "${message}"`));

  const txHash = await arbitrum.contract.write.sendMessage([message]);
  console.log(green(`Transaction sent: ${txHash}`));
  console.log(blue(`Explorer link: ${getExplorerLink(networks.arbitrum, 'tx', txHash)}`));
  console.log(blue(`Wormhole scan tx: https://wormholescan.io/#/tx/${txHash}?network=Testnet`));

  const receipt = await arbitrum.publicClient.waitForTransactionReceipt({ hash: txHash });

  // Extract messageSequence from the transaction logs
  const messageSequence = receipt.logs[0].topics[1];
  console.log(yellow(`Message sequence: ${messageSequence}`));

  // Wait for message to be received on Base Sepolia
  logSection('Waiting for message on Base Sepolia');

  let receivedMessagesCount = 0;
  while (receivedMessagesCount === 0) {
    receivedMessagesCount = Number(await base.contract.read.getNumberOfReceivedMessages());
    console.log(yellow(`Number of received messages: ${receivedMessagesCount}`));
    if (receivedMessagesCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
  }

  // Read received message
  logSection('Message Received');

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
