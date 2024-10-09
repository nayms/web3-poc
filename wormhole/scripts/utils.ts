import shell from 'shelljs';
import { blue, green, red, yellow } from "yoctocolors-cjs";


// New method to execute shell commands with logging
export interface ExecuteShellCommandOptions {
  cwd?: string;
  silent?: boolean;
}

export const executeShellCommand = (command: string, options: ExecuteShellCommandOptions = {}) => {
  const { cwd, silent = false } = options;
  if (!silent) {
    console.log(blue(`Executing command: ${command}`));
  }
  const result = shell.exec(command, { cwd, silent });
  if (result.code !== 0) {
    console.error(red('Error executing command:'), result.stderr);
    throw new Error(`Failed to execute command: ${command}`);
  }
  if (!silent) {
    console.log(result.stdout);
  }
  return result;
};


// Update the buildExecuteShellCommand function
export const buildExecuteShellCommand = (options: ExecuteShellCommandOptions) => {
  return (command: string, opts: ExecuteShellCommandOptions = {}) => 
    executeShellCommand(command, { ...options, ...opts });
}


export const fetchVAA = async (chainId: number, emitterAddress: string, sequence: bigint): Promise<string> => {
  console.log(yellow(`Fetching VAA for chainId: ${chainId}, emitterAddress: ${emitterAddress}, sequence: ${sequence}`));
  
  const url = `https://api.testnet.wormholescan.io/api/v1/vaas/${chainId}/${emitterAddress}/${sequence}`;
  console.log(blue(`API URL: ${url}`));

  const response = await fetch(url);
  
  if (!response.ok) {
    console.error(red(`Failed to fetch VAA. Status: ${response.status}`));
    throw new Error(`Failed to fetch VAA: ${response.statusText}`);
  }

  const { data } = await response.json() as any;
  console.log(green('VAA fetched successfully'));

  if (!data.vaa) {
    throw new Error('VAA not found or not yet available')
  }

  console.log(yellow(`VAA: ${data.vaa}`));

  return data.vaa as string
};


// Export utility functions
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const b = Buffer.from(base64, 'base64');
  return new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));  
}
