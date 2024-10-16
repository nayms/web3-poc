import { pad, parseEventLogs } from 'viem';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow } from 'yoctocolors-cjs';
import { THE_MESSAGE } from './constants';
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

  const receipt = await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await arbitrum.contract.write.sendMessage([THE_MESSAGE]),
    networks.arbitrum
  );
  const txId = receipt.transactionHash

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

  // Use the new fetchAndProcessVAA function
  logSection('Fetching and Processing VAA');
  await fetchAndProcessVAA({ txId, chainId: networks.arbitrum.wormholeChainId, sender, sequence, destEvmContract: base, network: networks.base });
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
