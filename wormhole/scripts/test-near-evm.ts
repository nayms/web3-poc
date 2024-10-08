import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red } from 'yoctocolors-cjs';
import { 
  buildEvmContracts, 
  logSection
} from './evm';
import { buildNearContracts, createNearAccount, deployNearContracts } from "./near";

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function main() {
  const nearAccount = await createNearAccount()
  await buildNearContracts()
  await deployNearContracts({ nearAccount })
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