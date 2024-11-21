import { getPostMessageCpiAccounts } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { type Connection, PublicKey, type PublicKeyInitData, type TransactionInstruction } from "@solana/web3.js";
import { deriveConfigKey, deriveWormholeMessageKey } from "../accounts";
import { createNaymsProgramInterface } from "../program";

export async function createInitializeInstruction(
  connection: Connection,
  programId: PublicKeyInitData,
  payer: PublicKeyInitData,
  wormholeProgramId: PublicKeyInitData
): Promise<TransactionInstruction> {
  const program = createNaymsProgramInterface(connection, programId);
  const message = deriveWormholeMessageKey(programId, 1n);
  const wormholeAccounts = getPostMessageCpiAccounts(
    program.programId,
    wormholeProgramId,
    payer,
    message
  );
  return program.methods
    .initialize()
    .accounts({
      owner: new PublicKey(payer),
      // @ts-ignore
      config: deriveConfigKey(programId),
      wormholeProgram: new PublicKey(wormholeProgramId),
      ...wormholeAccounts,
    })
    .instruction();
}
