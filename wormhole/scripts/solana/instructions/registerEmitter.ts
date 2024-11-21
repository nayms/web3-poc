import type { ChainId } from "@certusone/wormhole-sdk";
import { type Connection, PublicKey, type PublicKeyInitData, type TransactionInstruction } from "@solana/web3.js";
import { deriveConfigKey, deriveForeignEmitterKey } from "../accounts";
import { createNaymsProgramInterface } from "../program";

export async function createRegisterForeignEmitterInstruction(
  connection: Connection,
  programId: PublicKeyInitData,
  payer: PublicKeyInitData,
  emitterChain: ChainId,
  emitterAddress: Buffer
): Promise<TransactionInstruction> {
  const program = createNaymsProgramInterface(connection, programId);
  return program.methods
    .registerEmitter(emitterChain, [...emitterAddress])
    .accounts({
      // @ts-expect-error
      owner: new PublicKey(payer),
      config: deriveConfigKey(program.programId),
      foreignEmitter: deriveForeignEmitterKey(program.programId, emitterChain),
    })
    .instruction();
}
