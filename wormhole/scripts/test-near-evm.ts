import { setTimeout } from 'node:timers/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { blue, bold, green, red, yellow } from 'yoctocolors-cjs';
import { WORMHOLE_NETWORKS } from './constants';
import { 
  getOrDeployEvmContract,
  logSection,
  networks,
  sendAndConfirmEvmTransaction
} from './evm';
import { buildNearContracts, callContract, createNearAccount, deployNearContracts } from "./near";
import { fetchAndProcessVAA } from './utils';

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('network', {
    type: 'string',
    description: 'NEAR network to use',
    choices: ['testnet', 'mainnet'],
    default: 'testnet',
  })
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function waitForNetwork() {
  await setTimeout(5000);
}

async function main() {
  const nearNetworkId: 'mainnet' | 'testnet' = argv.network
  const nearNetwork = WORMHOLE_NETWORKS[`near_${nearNetworkId}`]
  let nearAccount: string = ''

  // Get or deploy contracts
  const base = await getOrDeployEvmContract(networks.base, argv['base-address']);

  if (nearNetworkId === 'testnet') {
    logSection('Creating NEAR Account');
    nearAccount = await createNearAccount();
    console.log(green(`NEAR account created successfully: ${nearAccount}`));
  } else {
    nearAccount = 'naymspoc.near'
  }

  logSection('Building NEAR Contracts');
  await buildNearContracts()
  console.log(green('NEAR contracts built successfully'));

  logSection('Deploying NEAR Contracts');
  await deployNearContracts({ nearAccount, nearNetworkId })
  console.log(green('NEAR contracts deployed successfully'));

  // if (nearNetworkId === 'testnet') {
    logSection('Initializing NEAR Contract');
    await callContract({ 
      nearNetworkId,
      nearAccount, 
      method: 'init', 
      gas: 100000000000000n 
    })
    console.log(green('NEAR contract initialized successfully'));
  
    await waitForNetwork();

    logSection('Setting Wormhole Params on NEAR Contract');
    await callContract({ 
      nearNetworkId,
      nearAccount, 
      method: 'setParams', 
      args: { 
        wormhole: nearNetwork.wormholeAddress, 
        chainId: nearNetwork.wormholeChainId, 
      },
      gas: 100000000000000n 
    })
    console.log(green('Wormhole params set successfully'));
  // }

  await waitForNetwork();

  logSection('Registering Emitter');
  await callContract({ 
    nearNetworkId,
    nearAccount, 
    method: 'register_emitter', 
    gas: 300000000000000n,
    deposit: 1n,
  })
  console.log(green('Emitter registered successfully'));

  await waitForNetwork();

  logSection('Updating Message Fee');
  await callContract({ 
    nearNetworkId,
    nearAccount, 
    method: 'update_message_fee', 
    gas: 100000000000000n 
  })
  console.log(green('Message fee updated successfully'));

  await waitForNetwork();
  
  logSection('Sending Message from NEAR to EVM');
  const message = "Hello, EVM!";
  console.log(yellow(`Message: "${message}"`));
  const output = await callContract({ 
    nearNetworkId,
    nearAccount, 
    method: 'send_message', 
    args: { message }, 
    gas: 300000000000000n 
  })
  console.log(green('Message sent successfully'));

  // parse the message to extract the JSON: EVENT_JSON:{"standard":"wormhole","event":"publish","data":"1,11,0,72,101,108,108,111,44,32,69,86,77,33","nonce":1,"emitter":"942298bcc4f392571b28caa4993067f0977b5c565f90889713fb695f61c3a097","seq":1,"block":176373165}
  // const jsonString = output.match(/EVENT_JSON:({.*})/)?.[1];
  // if (!jsonString) {
  //   throw new Error('Failed to parse result output');
  // }
  // const json = JSON.parse(jsonString);
  // const sequence = json.seq;
  // const sender = json.emitter;
  // console.log(blue(`Sender ID: ${sender}`));
  // console.log(blue(`Message sequence: ${sequence}`));

  // // register near contract as emitter on base
  // logSection('Registering NEAR sender as emitter on Base');
  // await sendAndConfirmEvmTransaction(
  //   // @ts-ignore
  //   await base.contract.write.registerEmitter([WORMHOLE_NETWORKS.near.wormholeChainId, sender]),
  //   networks.base
  // );

  // logSection('Fetching and Processing VAA');
  // await fetchAndProcessVAA({ txId, chainId: WORMHOLE_NETWORKS.sui.wormholeChainId, sender, sequence, destEvmContract: base, network: networks.base });
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

