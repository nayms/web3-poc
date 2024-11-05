import { setTimeout } from 'node:timers/promises';
import { pad, parseEventLogs } from 'viem';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow } from 'yoctocolors-cjs';
import { THE_MESSAGE, THE_MESSAGE_RESPONSE } from './constants';
import { 
  buildEvmContracts, 
  getOrDeployEvmContract, 
  logSection, 
  networks, 
  sendAndConfirmEvmTransaction, 
  wormholeCoreAbi 
} from './evm';
import { fetchAndProcessVAA } from './utils'; 

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('src-chain', {
    type: 'string',
    description: 'Source chain to send from (arbitrum or base)',
    choices: ['arbitrum', 'base'],
    default: 'arbitrum'
  })
  .option('dst-chain', {
    type: 'string', 
    description: 'Destination chain to send to (arbitrum or base)',
    choices: ['arbitrum', 'base'],
    default: 'base'
  })
  .option('src-address', {
    type: 'string',
    description: 'Existing contract address on source chain',
  })
  .option('dst-address', {
    type: 'string',
    description: 'Existing contract address on destination chain',
  })
  .argv) as any


async function waitForNetwork() {
  await setTimeout(5000);
}

async function main() {
  await buildEvmContracts()

  const srcChain = networks[argv['src-chain'] as string];
  if (!srcChain) {
    throw new Error(`Invalid source chain: ${argv['src-chain']}`);
  }
  const dstChain = networks[argv['dst-chain'] as string];
  if (!dstChain) {
    throw new Error(`Invalid destination chain: ${argv['dst-chain']}`);
  }

  // Get or deploy contracts
  const src = await getOrDeployEvmContract(srcChain, argv['src-address']);
  const dst = await getOrDeployEvmContract(dstChain, argv['dst-address']);

  // register source contract as sender on destination
  logSection(`Registering ${srcChain.name} contract as sender on ${dstChain.name}`);
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await dst.contract.write.registerEmitter([srcChain.wormholeChainId, pad(src.contractAddress)]),
    dstChain
  );

  // Send message from source to destination
  logSection(`Sending message from ${srcChain.name} to ${dstChain.name}`);

  const receipt = await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await src.contract.write.sendMessage([THE_MESSAGE]),
    srcChain
  );

  logSection('Fetching sender and sequence');

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

  await waitForNetwork();

  // Use the new fetchAndProcessVAA function
  logSection('Fetching and Processing VAA');
  await fetchAndProcessVAA({ 
    txId: receipt.transactionHash, 
    chainId: srcChain.wormholeChainId, 
    sender, 
    sequence, 
    destEvmContract: dst, 
    network: dstChain 
  });

  // now lets' send a message from the destination back to the source
  logSection(`Now sending a message from ${dstChain.name} back to ${srcChain.name}`);

  const receipt2 = await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await dst.contract.write.sendMessage([THE_MESSAGE_RESPONSE]),
    dstChain
  );

  logSection('Fetching sender and sequence');

  const logs2 = parseEventLogs({
    abi: wormholeCoreAbi,
    logs: receipt2.logs,
  });

  // get sender and sequence from the logs
  const logMessagePublishedEvent2 = logs2.find(log => log.eventName === 'LogMessagePublished');
  if (!logMessagePublishedEvent2) {
    throw new Error('LogMessagePublished event not found in transaction receipt');
  }
  const sender2 = logMessagePublishedEvent2.args.sender;
  const sequence2 = logMessagePublishedEvent2.args.sequence;

  console.log(yellow(`Message sender: ${sender2}`));
  console.log(yellow(`Message sequence: ${sequence2}`));

  // register source contract as sender on destination
  logSection(`Registering ${dstChain.name} contract as sender on ${srcChain.name}`);
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await src.contract.write.registerEmitter([dstChain.wormholeChainId, pad(dst.contractAddress)]),
    srcChain
  );

  await waitForNetwork();

  // Use the new fetchAndProcessVAA function
  logSection('Fetching and Processing VAA');
  await fetchAndProcessVAA({ 
    txId: receipt2.transactionHash, 
    chainId: dstChain.wormholeChainId, 
    sender: sender2, 
    sequence: sequence2, 
    destEvmContract: src, 
    network: srcChain 
  });
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
