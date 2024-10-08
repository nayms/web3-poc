import path from 'node:path'
import { blue, green, red } from 'yoctocolors-cjs';
import { executeShellCommand } from './utils';

const NEAR_CWD = path.resolve(__dirname, '..', 'near');


export const createNearAccount = async () => {
  console.log(blue('Creating NEAR account...'));
  const nearAccount = `naymspoc-${Math.floor(Math.random() * 10000000)}.testnet`
  const result = executeShellCommand(`near create-account ${nearAccount} --useFaucet`);
  console.log(green(`NEAR account created successfully: ${nearAccount}`));
  return nearAccount;
}

export const buildNearContracts = async () => {
  console.log(blue('Building NEAR contracts...'));
  const result = executeShellCommand('node_modules/.bin/near-sdk-js build src/contract.ts build/main.wasm');
  console.log(green('Contracts built successfully'));
  console.log(result.stdout);
};

export const deployNearContracts = async ({ nearAccount }: { nearAccount: string }) => {
  console.log(blue('Deploying NEAR contracts...'));
  const result = executeShellCommand(`near deploy ${nearAccount} build/main.wasm`);
  console.log(green('Contracts deployed successfully'));
  console.log(result.stdout);
}

export const callContract = async ({ nearAccount, method, args }: { nearAccount: string, method: string, args: string }) => {
  console.log(blue(`Calling NEAR contract on ${nearAccount}, method: ${method}, args: ${args}`));
  const result = executeShellCommand(`near call ${nearAccount} ${method} ${args} --accountId ${nearAccount}`);
  console.log(green('Contract called successfully'));
  console.log(result.stdout);
}