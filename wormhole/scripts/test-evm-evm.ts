import { deserialize } from "@wormhole-foundation/sdk";
import { pad, parseEventLogs } from 'viem';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow } from 'yoctocolors-cjs';
import { 
  base64ToUint8Array, 
  buildEvmContracts, 
  fetchVAA, 
  getOrDeployEvmContract, 
  logSection, 
  networks, 
  sendAndConfirmEvmTransaction, 
  wormholeCoreAbi 
} from './evm';

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

async function main() {
  await buildEvmContracts()

  // Get or deploy contracts
  const arbitrum = await getOrDeployEvmContract(networks.arbitrum, argv['arbitrum-address']);
  const base = await getOrDeployEvmContract(networks.base, argv['base-address']);

  // register arbitrum contract as emitter on base
  logSection('Registering Arbitrum contract as emitter on Base');
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await base.contract.write.registerEmitter([networks.arbitrum.wormholeChainId, pad(arbitrum.contractAddress)]),
    networks.base
  );

  // Send message from Arbitrum to Base
  logSection('Sending message from Arbitrum Sepolia to Base Sepolia');

  const message = 'Nayms is in the house!';
  console.log(yellow(`Message: "${message}"`));

  const receipt = await sendAndConfirmEvmTransaction(
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

  const vaaHex = `0x${Buffer.from(vaaUint8Array).toString('hex')}`;

  // Get the initial number of messages
  const initialNumberOfMessages = await base.contract.read.getNumberOfReceivedMessages();
  console.log(yellow(`Initial number of messages: ${initialNumberOfMessages}`));

  // Submit the VAA
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await base.contract.write.receiveMessage([vaaHex]),
    networks.base
  );

  logSection('Checking to see if message was received on Base Sepolia');

  // Get the updated number of messages
  const updatedNumberOfMessages = await base.contract.read.getNumberOfReceivedMessages();
  console.log(yellow(`Updated number of messages: ${updatedNumberOfMessages}`));

  // Check if the number of messages increased by 1
  if (updatedNumberOfMessages === initialNumberOfMessages + 1n) {
    console.log(green('Number of messages increased by 1 as expected.'));
  } else {
    console.log(red(`Unexpected change in number of messages. Expected ${initialNumberOfMessages + 1n}, got ${updatedNumberOfMessages}`));
  }

  const msgHash = await base.contract.read.receivedMessageHashes([updatedNumberOfMessages - 1n]);
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