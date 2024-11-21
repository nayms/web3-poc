import { getPostMessageCpiAccounts } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { getProgramSequenceTracker } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { type Connection, PublicKey, type PublicKeyInitData, type TransactionInstruction } from "@solana/web3.js";
import { deriveConfigKey, deriveWormholeMessageKey } from "../accounts";
import { createNaymsProgramInterface } from "../program";

export async function createSendMessageInstruction(
  connection: Connection,
  programId: PublicKeyInitData,
  payer: PublicKeyInitData,
  wormholeProgramId: PublicKeyInitData,
  helloMessage: Buffer
): Promise<TransactionInstruction> {
  const program = createNaymsProgramInterface(connection, programId);

  // get sequence
  const message = await getProgramSequenceTracker(connection, programId, wormholeProgramId)
  .then((tracker) =>
    deriveWormholeMessageKey(programId, tracker.sequence + 1n)
  );
  const wormholeAccounts = getPostMessageCpiAccounts(
    programId,
    wormholeProgramId,
    payer,
    message
  );
  return program.methods
    .sendMessage(helloMessage)
    .accounts({
      // @ts-ignore
      config: deriveConfigKey(programId),
      wormholeProgram: new PublicKey(wormholeProgramId),
      ...wormholeAccounts,
    })
    .instruction();
}
