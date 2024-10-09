import path from 'node:path'
import { blue, green, red } from 'yoctocolors-cjs';
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

export const deployNearContracts = async ({ nearAccount }: { nearAccount: string }) => {
  console.log(blue('Deploying NEAR contracts...'));
  execShell(`near deploy ${nearAccount} build/main.wasm`);
  console.log(green('Contracts deployed successfully'));
}

export const callContract = async ({ nearAccount, method, args = {}, gas = 30000000000000n, deposit = 0n }: { nearAccount: string, method: string, args?: object, gas?: bigint, deposit?: bigint }) => { 
  console.log(blue(`Calling NEAR contract on ${nearAccount}, method: ${method}, args: ${args}`));
  const ret = execShell(`near call ${nearAccount} ${method} '${JSON.stringify(args)}' --accountId ${nearAccount} --gas ${gas} --deposit ${deposit}`)
  console.log(green('Contract called successfully'));
  return ret.stdout;
}

export const callContractView = async ({ nearAccount, method, args = {} }: { nearAccount: string, method: string, args?: object }) => { 
  console.log(blue(`Calling NEAR contract on ${nearAccount}, method: ${method}, args: ${args}`));
  const ret = execShell(`near view ${nearAccount} ${method} '${JSON.stringify(args)}'`)
  console.log(green('Contract called successfully'));
  return ret.stdout;
}
