import path from 'node:path'
import shell from 'shelljs';
import { blue, green, red } from 'yoctocolors-cjs';

const NEAR_CWD = path.resolve(__dirname, '..', 'near');

export const createNearAccount = async () => {
  console.log(blue('Creating NEAR account...'));

  const nearAccount = `naymspoc-${Math.floor(Math.random() * 100000)}.testnet`

  const result = shell.exec(`near create-account ${nearAccount} --useFaucet`, { silent: true, cwd: NEAR_CWD });
  
  if (result.code !== 0) {
    console.error(red('Error creating account:'), result.stderr);
    throw new Error('Failed to create account');
  }

  console.log(green(`NEAR account created successfully: ${nearAccount}`));
  return nearAccount
}

export const buildNearContracts = async () => {
  console.log(blue('Building NEAR contracts...'));
  
  const result = shell.exec('node_modules/.bin/near-sdk-js build src/contract.ts build/main.wasm', { silent: true, cwd: NEAR_CWD });
  
  if (result.code !== 0) {
    console.error(red('Error building contracts:'), result.stderr);
    throw new Error('Failed to build contracts');
  }

  console.log(green('Contracts built successfully'));
  console.log(result.stdout);
};

export const deployNearContracts = async ({ nearAccount }: { nearAccount: string }) => {
  console.log(blue('Deploying NEAR contracts...'));

  const result = shell.exec(`near deploy ${nearAccount} build/main.wasm`, { silent: true, cwd: NEAR_CWD });
  
  if (result.code !== 0) {
    console.error(red('Error deploying contracts:'), result.stderr);
    throw new Error('Failed to deploy contracts');
  }

  console.log(green('Contracts deployed successfully'));
  console.log(result.stdout);
};
