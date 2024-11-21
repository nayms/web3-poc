import path from 'node:path'
import { CONTRACTS } from "@certusone/wormhole-sdk";
import { type PostMessageCpiAccounts, deriveAddress, getPostMessageCpiAccounts } from '@certusone/wormhole-sdk/lib/cjs/solana';
import type { Program } from '@coral-xyz/anchor';
import { ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, type Signer, Transaction, type TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { blue, green, yellow } from "yoctocolors-cjs";
import type { Nayms } from '../../solana/target/types/nayms';
import { buildExecuteShellCommand } from "../utils";
import { deriveConfigKey } from './accounts';
import { createInitializeInstruction } from './instructions/initialize';
import { createNaymsProgramInterface } from './program';

export const NETWORK = "DEVNET";
export const WORMHOLE_CONTRACTS = CONTRACTS[NETWORK];
export const CORE_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.core);
export const TOKEN_BRIDGE_PID = new PublicKey(WORMHOLE_CONTRACTS.solana.token_bridge);
export const NAYMS_PROGRAM_ID = new PublicKey("BYFW1vhC1ohxwRbYoLbAWs86STa25i9sD5uEusVjTYNe");
const DEVNET_RPC_URL = "https://api.devnet.solana.com";

export const PAYER_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from([90,202,92,115,133,75,93,228,100,80,58,95,230,48,1,222,252,48,122,68,72,129,46,239,33,105,85,21,21,34,229,252,140,235,98,117,24,111,73,237,41,62,146,29,39,245,233,125,13,229,143,117,231,217,48,52,120,101,45,220,1,37,219,175]));

const SOLANA_CWD = path.join(__dirname, '..', '..', 'solana')

const execShell = buildExecuteShellCommand({ cwd: SOLANA_CWD, silent: true, outputIfError: true });


export const checkSolanaBalance = async () => {
  const { connection } = getBootstrapParams();
  const balance = await connection.getBalance(PAYER_KEYPAIR.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`Solana balance: ${solBalance} SOL`);
  if (solBalance < 2.5) {
    throw new Error('Insufficient balance, need >2.5 SOL');
  }
}

export const buildSolanaContract = async () => {
  console.log(blue('Building Solana contracts...'));
  execShell('anchor build');
  console.log(green('Contracts built successfully'));
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

  console.log(green("Contracts deployed successfully"));
}


export const initializeSolanaContract = async () => {
  console.log(blue('Initializing Solana contract...'));

  const { connection, payer } = getBootstrapParams();

  const initializeIx = await createInitializeInstruction(
    connection,
    NAYMS_PROGRAM_ID,
    payer.publicKey,
    CORE_BRIDGE_PID
  );

  await sendAndConfirmIx(initializeIx);

  console.log(green('Solana contract initialized successfully'));
}

// ================================
// Utility functions
// ================================

let bootstrapParams: undefined | {
  connection: Connection,
  payer: Signer,
  realConfig: PublicKey,
  program: Program<Nayms>,
  wormholeCpi: PostMessageCpiAccounts,
  realInitializeAccounts: {
    owner: PublicKey,
    config: PublicKey,
    wormholeProgram: PublicKey,
    wormholeBridge: PublicKey,
    wormholeFeeCollector: PublicKey,
    wormholeEmitter: PublicKey,
    wormholeSequence: PublicKey,
    wormholeMessage: PublicKey,
    clock: PublicKey,
    rent: PublicKey,
  },
} = undefined

const getBootstrapParams = () => {
  if (!bootstrapParams) {
    const connection = new Connection(DEVNET_RPC_URL, "processed");
    const payer = PAYER_KEYPAIR;
    const realConfig = deriveConfigKey(NAYMS_PROGRAM_ID);
    const program = createNaymsProgramInterface(connection);
    const wormholeCpi = getPostMessageCpiAccounts(
      NAYMS_PROGRAM_ID,
      CORE_BRIDGE_PID,
      payer.publicKey,
      deriveAddress([Buffer.from("alive")], NAYMS_PROGRAM_ID)
    );
    const realInitializeAccounts = {
      owner: payer.publicKey,
      config: realConfig,
      wormholeProgram: CORE_BRIDGE_PID,
      wormholeBridge: wormholeCpi.wormholeBridge,
      wormholeFeeCollector: wormholeCpi.wormholeFeeCollector,
      wormholeEmitter: wormholeCpi.wormholeEmitter,
      wormholeSequence: wormholeCpi.wormholeSequence,
      wormholeMessage: wormholeCpi.wormholeMessage,
      clock: wormholeCpi.clock,
      rent: wormholeCpi.rent,
    };

    bootstrapParams = Object.freeze({
      connection,
      payer,
      realConfig,
      program,
      wormholeCpi,
      realInitializeAccounts,
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
  const { payer, connection } = getBootstrapParams();
  
  const [signers, units] = (() => {
    if (!signerOrSignersOrComputeUnits)
      return [[payer], computeUnits];

    if (typeof signerOrSignersOrComputeUnits === "number") {
      if(computeUnits !== undefined)
        throw new Error("computeUnits can't be specified twice");
      return [[payer], signerOrSignersOrComputeUnits];
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
    return await sendAndConfirmTransaction(connection, tx, signers);
  }
  catch (error: any) {
    if (error.transactionLogs) {
      console.log(yellow(error.transactionLogs));
    }
    throw new SendIxError(error);
  }
}