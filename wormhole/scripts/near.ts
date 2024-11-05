import path from 'node:path'
import { blue, green, red, yellow } from 'yoctocolors-cjs';
import { buildExecuteShellCommand, executeShellCommand } from './utils';

const NEAR_CWD = path.resolve(__dirname, '..', 'near');

const execShell = buildExecuteShellCommand({ cwd: NEAR_CWD });

export const createNearAccount = async () => {
  console.log(blue('Creating NEAR account...'));
  const nearAccount = `naymspoc-${Math.floor(Math.random() * 10000000)}.testnet`
  execShell(`near create-account ${nearAccount} --useFaucet`);
  console.log(green(`NEAR account created successfully: ${nearAccount}`));
  return nearAccount;
}

export const buildNearContracts = async () => {
  console.log(blue('Building NEAR contracts...'));
    execShell('node_modules/.bin/near-sdk-js build src/contract.ts build/main.wasm');
  console.log(green('Contracts built successfully'));
};

export const deployNearContracts = async ({ nearAccount, nearNetworkId }: { nearAccount: string, nearNetworkId: string }) => {
  console.log(blue('Deploying NEAR contracts...'));
  execShell(`near deploy --network-id ${nearNetworkId} ${nearAccount} build/main.wasm`);
  console.log(green('Contracts deployed successfully'));
}

export const callContract = async ({ nearNetworkId, nearAccount, method, args = {}, gas = 30000000000000n, deposit = 0n }: { nearNetworkId: string, nearAccount: string, method: string, args?: object, gas?: bigint, deposit?: bigint }) => { 
  console.log(blue(`Calling NEAR contract on ${nearAccount}, method: ${method}, args: ${args}`));
  const ret = execShell(`near call --accountId ${nearAccount} --network-id ${nearNetworkId} --gas ${gas} --deposit ${deposit} ${nearAccount} ${method} '${JSON.stringify(args)}'`)
  console.log(green('Contract called successfully'));
  return ret.stdout + ret.stderr;
}

export const callContractView = async ({ nearNetworkId, nearAccount, method, args = {} }: { nearNetworkId: string, nearAccount: string, method: string, args?: object }) => { 
  console.log(blue(`Calling NEAR contract on ${nearAccount}, method: ${method}, args: ${args}`));
  const ret = execShell(`near view --network-id ${nearNetworkId} ${nearAccount} ${method} '${JSON.stringify(args)}'`)
  console.log(green('Contract called successfully'));
  return ret.stdout + ret.stderr;
}
