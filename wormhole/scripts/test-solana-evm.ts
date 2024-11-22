import { keccak256 } from 'viem/utils';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow, yellowBright } from 'yoctocolors-cjs';
import { THE_MESSAGE, WORMHOLE_NETWORKS } from './constants';
import { 
  buildEvmContracts,
  getOrDeployEvmContract,
  logSection,
  networks,
  sendAndConfirmEvmTransaction,
} from './evm';
import { buildSolanaContract, checkSolanaBalance, deploySolanaContract, initializeSolanaContract, sendMessage } from './solana';
import { fetchAndProcessVAA } from './utils';

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function main() {
  const base = await getOrDeployEvmContract(networks.base_sepolia, argv['base-address']);

  logSection('Checking Solana balance');
  await checkSolanaBalance()  

  logSection('Building Solana Contract');
  await buildSolanaContract()
  console.log(green('Solana contract built successfully'));

  logSection('Deploying Solana Contract');
  await deploySolanaContract()
  console.log(green('Solana contract deployed successfully'));
  
  logSection('Initializing Solana Contract');
  await initializeSolanaContract()
  console.log(green('Solana contract initialized successfully'));

  logSection('Sending message from Solana to EVM');  
  const { txId, sequence, sender } = await sendMessage(THE_MESSAGE);
  console.log(green("Message sent successfully"));
  console.log(bold(yellowBright(`Sequence: ${sequence}`)))
  console.log(bold(yellowBright(`Sender: ${sender}`)))

  // register solana contract as emitter on base
  logSection('Registering Solana sender as emitter on Base');
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await base.contract.write.registerEmitter([WORMHOLE_NETWORKS.solana_devnet.wormholeChainId, `0x${sender}`]),
    networks.base_sepolia
  );

  // logSection('Fetching and Processing VAA');
  await fetchAndProcessVAA({ txId, chainId: WORMHOLE_NETWORKS.solana_devnet.wormholeChainId, sender, sequence, destEvmContract: base, network: networks.base_sepolia });
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
