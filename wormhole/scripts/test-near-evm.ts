import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow } from 'yoctocolors-cjs';
import { WORMHOLE_NETWORKS } from './constants';
import { 
  buildEvmContracts, 
  logSection
} from './evm';
import { buildNearContracts, callContract, createNearAccount, deployNearContracts } from "./near";

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
      wormholeFinality: nearNetwork.wormholeFinality 
    } 
  })
  console.log(green('NEAR contract initialized successfully'));

  // TODO: call the update_message_fee method on the contract to get the latest message fee
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
    gas: 200000000000000n 
  })
  console.log(green('Message sent successfully'));
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

