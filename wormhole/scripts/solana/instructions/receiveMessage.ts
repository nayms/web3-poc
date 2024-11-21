import { type ChainId, type ParsedVaa, type SignedVaa, isBytes, parseVaa } from "@certusone/wormhole-sdk";
import { derivePostedVaaKey } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { type Connection, PublicKey, type PublicKeyInitData, type TransactionInstruction } from "@solana/web3.js";
import { deriveConfigKey, deriveForeignEmitterKey, deriveReceivedKey } from "../accounts";
import { createNaymsProgramInterface } from "../program";

export async function createReceiveMessageInstruction(
  connection: Connection,
  programId: PublicKeyInitData,
  payer: PublicKeyInitData,
  wormholeProgramId: PublicKeyInitData,
  wormholeMessage: SignedVaa | ParsedVaa
): Promise<TransactionInstruction> {
  const program = createNaymsProgramInterface(connection, programId);

  const parsed = isBytes(wormholeMessage)
    ? parseVaa(wormholeMessage)
    : wormholeMessage;

  return program.methods
    .receiveMessage([...parsed.hash])
    .accounts({
      payer: new PublicKey(payer),
      // @ts-ignore
      config: deriveConfigKey(programId),
      wormholeProgram: new PublicKey(wormholeProgramId),
      posted: derivePostedVaaKey(wormholeProgramId, parsed.hash),
      foreignEmitter: deriveForeignEmitterKey(programId, parsed.emitterChain as ChainId),
      received: deriveReceivedKey(
        programId,
        parsed.emitterChain as ChainId,
        parsed.sequence
      ),
    })
    .instruction();
}
