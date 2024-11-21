import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow, yellowBright } from 'yoctocolors-cjs';
import { 
  buildEvmContracts,
  getOrDeployEvmContract,
  logSection,
  networks,
} from './evm';
import { buildSolanaContract, checkSolanaBalance, deploySolanaContract, initializeSolanaContract } from './solana';

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function main() {
  // Get or deploy contracts
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
