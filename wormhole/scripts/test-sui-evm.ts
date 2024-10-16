import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { bold, green, red, yellow, yellowBright } from 'yoctocolors-cjs';
import { THE_MESSAGE, WORMHOLE_NETWORKS } from './constants';
import { 
  buildEvmContracts,
  getOrDeployEvmContract,
  logSection,
  networks,
  sendAndConfirmEvmTransaction
} from './evm';
import { SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID, buildSuiContracts, deploySuiContracts, execPTB } from './sui';
import { fetchAndProcessVAA } from './utils'; 

// Parse command-line arguments
const argv = (yargs(hideBin(process.argv))
  .option('base-address', {
    type: 'string',
    description: 'Existing contract address on Base Sepolia',
  })
  .argv) as any

async function main() {
  await buildEvmContracts()

  // Get or deploy contracts
  const base = await getOrDeployEvmContract(networks.base, argv['base-address']);

  logSection('Building SUI Contracts');
  await buildSuiContracts()
  console.log(green('SUI contracts built successfully'));

  logSection('Deploying SUI Contracts');
  const deployed = await deploySuiContracts()
  console.log(green('SUI contracts deployed successfully'));

  logSection('Updating message fee');

  await execPTB({
    cmd: `
    --assign main @${deployed.mainObjectId}
    --assign wormhole_state @${SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID}
    --move-call ${deployed.contractId}::send::update_message_fee main wormhole_state
    `
  })
  
  logSection('Getting emitter cap');

  let json = await execPTB({
    cmd: `
    --assign main @${deployed.mainObjectId}
    --assign wormhole_state @${SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID}
    --move-call ${deployed.contractId}::send::get_emitter_cap main wormhole_state
    --assign emitter_cap
    --transfer-objects [emitter_cap] sender
    `
  })

  const cap = json.objectChanges.find((change: any) => change.type === 'created' && change.objectType.endsWith('::EmitterCap'))
  console.log(bold(yellowBright(`Emitter Cap Object ID: ${cap.objectId}`)))

  logSection('Sending message from SUI to EVM');  

  json = await execPTB({
    cmd: `
    --assign main @${deployed.mainObjectId}
    --assign wormhole_state @${SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID}
    --assign emitter_cap @${cap.objectId}
    --assign message "'${THE_MESSAGE}'"
    --assign clock @0x6
    --split-coins gas [0]
    --assign coins
    --move-call ${deployed.contractId}::send::send_message main wormhole_state emitter_cap clock message coins.0
    `
  })

  const messageEvent = json.events.find((event: any) => event.type.endsWith('::WormholeMessage'))
  const { sequence, sender} = messageEvent.parsedJson
  console.log(bold(yellowBright(`Sequence: ${sequence}`)))
  console.log(bold(yellowBright(`Sender: ${sender}`)))

  // register arbitrum contract as emitter on base
  logSection('Registering SUI sender as emitter on Base');
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await base.contract.write.registerEmitter([WORMHOLE_NETWORKS.sui.wormholeChainId, sender]),
    networks.base
  );

  logSection('Fetching and Processing VAA');
  await fetchAndProcessVAA(WORMHOLE_NETWORKS.sui.wormholeChainId, sender, sequence, base, networks.base);
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
