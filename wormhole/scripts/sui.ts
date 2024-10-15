import path from 'node:path'
import { blue, green } from "yoctocolors-cjs";
import { buildExecuteShellCommand } from "./utils";

export const SUI_TESTNET_WORMHOLE_STATE_OBJECT_ID = '0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790'
export const SUI_TESTNET_WORMHOLE_GATEWAY_OBJECT_ID = '0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94'
const SUI_CWD = path.join(__dirname, '..', 'sui')

const execShell = buildExecuteShellCommand({ cwd: SUI_CWD, silent: true, outputIfError: true });

const parseTransactionJson = (cliOutput: string) => {
  const jsonStart = cliOutput.indexOf('{');
  const jsonEnd = cliOutput.lastIndexOf('}') + 1;
  const json = JSON.parse(cliOutput.slice(jsonStart, jsonEnd));
  logTransaction(json);
  if (json.effects.status.status !== 'success') {
    throw new Error(`Transaction failed: ${json.effects.status.status}`);
  }
  return json;
}

export const buildSuiContracts = async () => {
  console.log(blue('Building SUI contracts...'));
  execShell('sui move build');
  console.log(green('Contracts built successfully'));
};

const logTransaction = (json: any) => {
  if (json.digest) {
    console.log(blue(`Transaction digest: ${json.digest}`));
    console.log(blue(`Block explorer link: https://suiscan.xyz/testnet/tx/${json.digest}`));
  }
}

export const deploySuiContracts = async () => {
  console.log(blue('Deploying SUI contracts...'));
  const ret = execShell("sui client publish --skip-dependency-verification --json");
  const output = ret.stdout + ret.stderr;
  const json = parseTransactionJson(output);
  
  const contractInfo = json.objectChanges.find((change: any) => change.type === 'published');
  const packageId = contractInfo.packageId
  console.log(`Contract id: ${packageId}`);

  const mainInfo = json.objectChanges.find((change: any) => change.type === 'created' && change.objectType.endsWith('::Main'));
  const mainObjectId = mainInfo.objectId
  console.log(`Main object id: ${mainObjectId}`);

  console.log(green("Contracts deployed successfully"));
  return { contractId: packageId, mainObjectId };
}


export const execPTB = async ({ cmd, gas = 20000000n, deposit = 0n }: { cmd: string, gas?: bigint, deposit?: bigint }) => { 
  console.log(blue("Executing SUI PTB..."));
  const ret = execShell(`sui client ptb
    --move-call sui::tx_context::sender
    --assign sender
    ${cmd}
    --gas-budget ${gas}
    --json
  `.replace(/\n+/g, ' '))
  console.log(green('PTB executed successfully'));
  const output = ret.stdout + ret.stderr;
  const json = parseTransactionJson(output);
  return json;
}
