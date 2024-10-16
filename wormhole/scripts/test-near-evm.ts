import { deserialize } from '@wormhole-foundation/sdk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { blue, bold, green, red, yellow } from 'yoctocolors-cjs';
import { WORMHOLE_NETWORKS } from './constants';
import { 
  buildEvmContracts, 
  logSection
} from './evm';
import { buildNearContracts, callContract, callContractView, createNearAccount, deployNearContracts } from "./near";
import { base64ToUint8Array, fetchVAA } from './utils';

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
  const output = await callContract({ 
    nearAccount, 
    method: 'send_message', 
    args: { message }, 
    gas: 300000000000000n 
  })
  console.log(green('Message sent successfully'));

  // parse the message to extract the JSON: EVENT_JSON:{"standard":"wormhole","event":"publish","data":"1,11,0,72,101,108,108,111,44,32,69,86,77,33","nonce":1,"emitter":"942298bcc4f392571b28caa4993067f0977b5c565f90889713fb695f61c3a097","seq":1,"block":176373165}
  const jsonString = output.match(/EVENT_JSON:({.*})/)?.[1];
  if (!jsonString) {
    throw new Error('Failed to parse result output');
  }
  const json = JSON.parse(jsonString);
  const messageSequence = json.seq;
  const emitterId = json.emitter;
  console.log(blue(`Emitter ID: ${emitterId}`));
  console.log(blue(`Message sequence: ${messageSequence}`));

  // TODO: fetch VAA from wormhole api and submit to Base
  // At present the VAA doesn't seem to be available in the wormhole api

  // // fetch VAA from wormhole api
  // const vaaBase64 = await fetchVAA(WORMHOLE_NETWORKS.near.wormholeChainId, emitterId, messageSequence)
  // const vaaUint8Array = base64ToUint8Array(vaaBase64);
  // // decode vaa
  // const decodedVAA = deserialize("Uint8Array", vaaUint8Array);
  // console.log(yellow("Decoded VAA:"), decodedVAA);
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

