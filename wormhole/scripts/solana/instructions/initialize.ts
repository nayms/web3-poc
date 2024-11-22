import { getPostMessageCpiAccounts } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { deriveWormholeMessageKey } from "../accounts";
import { type BootstrapParams, getCpiAccounts } from "../utils";

export async function createInitializeInstruction(
  params: BootstrapParams,
): Promise<TransactionInstruction> {
  const { 
    program, 
    owner, 
    config, 
    wormholeProgram,
  } = params;

  const message = deriveWormholeMessageKey(program.programId, 1n);
  const wormholeAccounts = getCpiAccounts(params, message);
  
  return program.methods
    .initialize()
    .accounts({
      owner,
      // @ts-ignore
      config,
      wormholeProgram,
      ...wormholeAccounts,
    })
    .instruction();
}
