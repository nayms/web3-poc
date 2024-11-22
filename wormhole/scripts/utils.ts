import { deserialize } from '@wormhole-foundation/sdk';
import shell from 'shelljs';
import { blue, green, magenta, red, yellow } from "yoctocolors-cjs";
import { type networks, sendAndConfirmEvmTransaction } from './evm';


// New method to execute shell commands with logging
export interface ExecuteShellCommandOptions {
  cwd?: string;
  silent?: boolean;
  outputIfError?: boolean;
}

export const executeShellCommand = (command: string, options: ExecuteShellCommandOptions = {}) => {
  const { cwd, silent = false, outputIfError = false } = options;
  console.log(blue(`Executing command: ${command}`));
  const result = shell.exec(command, { cwd, silent });
  if (!silent || (result.code !== 0 && outputIfError)) {
    console.log(result.stdout + result.stderr);
  }
  if (result.code !== 0) {
    console.error(red('Error executing command:'), result.stderr);
    throw new Error(`Failed to execute command: ${command}`);
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


export async function fetchAndProcessVAA({
  txId,
  chainId,
  sender,
  sequence,
  destEvmContract,
  network
}: {
  txId: string,
  chainId: number,
  sender: string,
  sequence: bigint,
  destEvmContract: any,
  network: typeof networks[keyof typeof networks],
}) {
  // Fetch VAA from wormhole api
  const vaaBase64 = await fetchVAA(chainId, sender, sequence);
  const vaaUint8Array = base64ToUint8Array(vaaBase64);
  
  // Decode VAA
  const decodedVAA = deserialize("Uint8Array", vaaUint8Array);
  // console.log(yellow("Decoded VAA:"), decodedVAA);

  console.log(magenta(`
----------------------------------------
Wormhole scan link: https://wormholescan.io/#/tx/${txId}?network=Testnet
----------------------------------------
`))

  console.log(yellow("\nDecoded VAA:\n"));
  console.log(yellow(`--> Emitter chain: ${decodedVAA.emitterChain}`));
  console.log(yellow(`--> Emitter address: ${decodedVAA.emitterAddress}`));
  console.log(yellow(`--> Sequence: ${decodedVAA.sequence}`));
  console.log(yellow(`--> Timestamp: ${decodedVAA.timestamp}`));
  console.log(yellow(`--> Consistency level: ${decodedVAA.consistencyLevel}`));


  console.log('Submitting VAA');

  const vaaHex = `0x${Buffer.from(vaaUint8Array).toString('hex')}`;

  // Get the initial number of messages
  const initialNumberOfMessages = await destEvmContract.contract.read.getNumberOfReceivedMessages();
  console.log(yellow(`Initial number of messages: ${initialNumberOfMessages}`));

  // Submit the VAA
  await sendAndConfirmEvmTransaction(
    // @ts-ignore
    await destEvmContract.contract.write.receiveMessage([vaaHex]),
    network
  );

  console.log('Checking message receipt');

  // Get the updated number of messages
  const updatedNumberOfMessages = await destEvmContract.contract.read.getNumberOfReceivedMessages();
  console.log(yellow(`Updated number of messages: ${updatedNumberOfMessages}`));

  // Check if the number of messages increased by 1
  if (updatedNumberOfMessages === initialNumberOfMessages + 1n) {
    console.log(green('Number of messages increased by 1 as expected.'));
  } else {
    console.log(red(`Unexpected change in number of messages. Expected ${initialNumberOfMessages + 1n}, got ${updatedNumberOfMessages}`));
  }

  const msgHash = await destEvmContract.contract.read.receivedMessageHashes([updatedNumberOfMessages - 1n]);
  console.log(yellow(`Message hash: ${msgHash}`));

  const msg = await destEvmContract.contract.read.receivedMessages([msgHash]);
  console.log(green(`Received message: "${msg}"`));
}


// Export utility functions
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const b = Buffer.from(base64, 'base64');
  return new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));  
}


