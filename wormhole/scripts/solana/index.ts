import path from 'node:path'
// import { CONTRACTS } from "@certusone/wormhole-sdk";
import { deriveWormholeEmitterKey } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, type Signer, Transaction, type TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { blue, magenta, magentaBright, yellow, yellowBright } from "yoctocolors-cjs";
import { WORMHOLE_NETWORKS } from '../constants';
import { buildExecuteShellCommand } from "../utils";
import { deriveConfigKey, getConfigData } from './accounts';
import { createInitializeInstruction } from './instructions/initialize';
import { createSendMessageInstruction } from './instructions/sendMessage';
import { createNaymsProgramInterface } from './program';
import type { BootstrapParams } from './utils';

export const NETWORK = "DEVNET";
// export const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
export const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_NETWORKS.solana_devnet.wormholeAddress);
export const NAYMS_PROGRAM_ID = new PublicKey("GPzxCRHR8nJW6U9xqxvZnV4q1ZnfM5qwheCV8UPoaZ9Y");

console.log(blue(`CORE_BRIDGE_PID: ${CORE_BRIDGE_PID.toBase58()}`));
console.log(blue(`NAYMS_PROGRAM_ID: ${NAYMS_PROGRAM_ID.toBase58()}`));

const DEVNET_RPC_URL = "https://api.devnet.solana.com";

export const SIGNER_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from([90,202,92,115,133,75,93,228,100,80,58,95,230,48,1,222,252,48,122,68,72,129,46,239,33,105,85,21,21,34,229,252,140,235,98,117,24,111,73,237,41,62,146,29,39,245,233,125,13,229,143,117,231,217,48,52,120,101,45,220,1,37,219,175]));

const SOLANA_CWD = path.join(__dirname, '..', '..', 'solana')

const execShell = buildExecuteShellCommand({ cwd: SOLANA_CWD, silent: true, outputIfError: true });


export const checkSolanaBalance = async () => {
  const { connection } = getBootstrapParams();
  const balance = await connection.getBalance(SIGNER_KEYPAIR.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`Solana balance: ${solBalance} SOL`);
  if (solBalance < 2.5) {
    throw new Error('Insufficient balance, need >2.5 SOL');
  }
}

export const buildSolanaContract = async () => {
  console.log(blue('Building Solana contracts...'));
  execShell('anchor build');
  console.log(blue('Contracts built successfully'));
};

export const deploySolanaContract = async () => {
  console.log(blue('Deploying Solana contract...'));
  const ret = execShell("solana program deploy ./target/deploy/solana.so");
  const output = ret.stdout + ret.stderr;

  // parse the output to extract the program id
  const programId = output.match(/Program Id: (\w+)/)?.[1];
  if (!programId) {
    throw new Error('Failed to extract program id from output');
  }
  console.log(`Deployed ID: ${programId}`);

  console.log(blue("Contracts deployed successfully"));
}


export const initializeSolanaContract = async () => {
  console.log(blue('Initializing Solana contract...'));

  // only initialize once
  const params = getBootstrapParams();
  const configData = await getConfigData(params);
  if (configData.owner.toBase58() !== params.owner.toBase58()) {
    const initializeIx = await createInitializeInstruction(params)
    await sendAndConfirmIx(initializeIx);
    console.log(blue('Solana contract initialized successfully'));
  } else {
    console.log(blue('Solana contract already initialized'));
  }
}

export const sendMessage = async (message: string) => {
  console.log(yellowBright(`Sending message: ${message}`));

  const params = getBootstrapParams();

  const { txInstruction, sequence } = await createSendMessageInstruction(params, Buffer.from(message));
  const txId = await sendAndConfirmIx(txInstruction);

  console.log(blue("Message sent successfully"));

  const emitter = await deriveWormholeEmitterKey(params.program.programId);
  console.log(`Emitter: ${emitter.toBase58()}`);
  
  const sender = emitter.toBuffer().toString('hex')
  
  return { txId, sequence, sender };
}

// ================================
// Utility functions
// ================================

let bootstrapParams: undefined | BootstrapParams = undefined

const getBootstrapParams = () => {
  if (!bootstrapParams) {
    const connection = new Connection(DEVNET_RPC_URL, "processed");
    const signer = SIGNER_KEYPAIR;
    const config = deriveConfigKey(NAYMS_PROGRAM_ID);
    const program = createNaymsProgramInterface(connection);

    bootstrapParams = Object.freeze({
      connection,
      signer,
      config,
      program,
      owner: signer.publicKey,
      wormholeProgram: CORE_BRIDGE_PID,
    });
  }

  return bootstrapParams;
}

class SendIxError extends Error {
  logs: string;

  constructor(originalError: Error & { logs?: string[] }) {
    //The newlines don't actually show up correctly in chai's assertion error, but at least
    // we have all the information and can just replace '\n' with a newline manually to see
    // what's happening without having to change the code.
    const logs = originalError.logs?.join('\n') || "error had no logs";
    super(`${originalError.message}\nlogs:\n${logs}`);
    this.stack = originalError.stack;
    this.logs = logs;
  }
}


const sendAndConfirmIx = async (
  ix: TransactionInstruction | Promise<TransactionInstruction>,
  signerOrSignersOrComputeUnits?: Signer | Signer[] | number,
  computeUnits?: number,
) => {
  const { signer, connection } = getBootstrapParams();
  
  const [signers, units] = (() => {
    if (!signerOrSignersOrComputeUnits)
      return [[signer], computeUnits];

    if (typeof signerOrSignersOrComputeUnits === "number") {
      if(computeUnits !== undefined)
        throw new Error("computeUnits can't be specified twice");
      return [[signer], signerOrSignersOrComputeUnits];
    }

    return [
      Array.isArray(signerOrSignersOrComputeUnits)
        ? signerOrSignersOrComputeUnits
        : [signerOrSignersOrComputeUnits],
        computeUnits
    ];
  })();

  const tx = new Transaction().add(await ix);
  if (units)
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({units}));
  try {
    const txId = await sendAndConfirmTransaction(connection, tx, signers);

    console.log(magenta(`\nTxId: ${txId}`))
    console.log(magentaBright(getExplorerLink(WORMHOLE_NETWORKS.solana_devnet.explorer, 'tx', txId)))
    console.log("\n")

    return txId;
  }
  catch (error: any) {
    if (error.transactionLogs) {
      console.log(yellow(error.transactionLogs));
    }
    throw new SendIxError(error);
  }
}


const getExplorerLink = (explorerLink: string, type: 'address' | 'tx', value: string) => {
  const clusterStart = explorerLink.indexOf('?cluster=')
  return `${explorerLink.substring(0, clusterStart)}/${type}/${value}${explorerLink.substring(clusterStart)}`;
}