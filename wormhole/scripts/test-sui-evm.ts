import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red } from 'yoctocolors-cjs';
import { 
  logSection
} from './evm';
import { SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID, buildSuiContracts, callContract, deploySuiContracts } from './sui';

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function main() {
  logSection('Building SUI Contracts');
  await buildSuiContracts()
  console.log(green('SUI contracts built successfully'));

  logSection('Deploying SUI Contracts');
  const deployed = await deploySuiContracts()
  console.log(green('SUI contracts deployed successfully'));

  await callContract({
    contractId: deployed.contractId,
    params: 'main wormhole_state',
    paramValues: {
      main: deployed.mainObjectId,
      wormhole_state: SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID,
    },
    method: 'send::update_message_fee', 
  })
  console.log(green('Message fee updated successfully'));
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

