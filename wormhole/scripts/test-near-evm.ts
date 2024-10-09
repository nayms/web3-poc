import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { blue, bold, green, red, yellow } from 'yoctocolors-cjs';
import { WORMHOLE_NETWORKS } from './constants';
import { 
  buildEvmContracts, 
  logSection
} from './evm';
import { buildNearContracts, callContract, callContractView, createNearAccount, deployNearContracts } from "./near";

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function main() {
  logSection('Creating NEAR Account');
  const nearAccount = await createNearAccount()
  console.log(yellow(`NEAR Account created: ${nearAccount}`));

  logSection('Building NEAR Contracts');
  await buildNearContracts()
  console.log(green('NEAR contracts built successfully'));

  logSection('Deploying NEAR Contracts');
  await deployNearContracts({ nearAccount })
  console.log(green('NEAR contracts deployed successfully'));

  const nearNetwork = WORMHOLE_NETWORKS.near
  
  logSection('Initializing NEAR Contract');
  await callContract({ 
    nearAccount, 
    method: 'init', 
    args: { 
      wormhole: nearNetwork.wormholeAddress, 
      chainId: nearNetwork.wormholeChainId, 
    },
    gas: 100000000000000n 
  })
  console.log(green('NEAR contract initialized successfully'));

  logSection('Registering Emitter');
  await callContract({ 
    nearAccount, 
    method: 'register_emitter', 
    gas: 300000000000000n,
    deposit: 1n,
  })
  console.log(green('Emitter registered successfully'));

  logSection('Updating Message Fee');
  await callContract({ 
    nearAccount, 
    method: 'update_message_fee', 
    gas: 100000000000000n 
  })
  console.log(green('Message fee updated successfully'));

  logSection('Sending Message from NEAR to EVM');
  const message = "Hello, EVM!";
  console.log(yellow(`Message: "${message}"`));
  await callContract({ 
    nearAccount, 
    method: 'send_message', 
    args: { message }, 
    gas: 300000000000000n 
  })
  console.log(green('Message sent successfully'));

  // wait 2 seconds for the callback to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));

  logSection('Reading message sequence');
  const messageSequence = Number.parseInt(JSON.parse(await callContractView({ 
    nearAccount, 
    method: 'get_last_message_sequence', 
    args: {} 
  })), 10)
  console.log(blue(`Message sequence: ${messageSequence}`));
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

