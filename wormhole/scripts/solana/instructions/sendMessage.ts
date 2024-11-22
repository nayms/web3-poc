import { getPostMessageCpiAccounts } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { getProgramSequenceTracker } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import { deriveWormholeMessageKey } from "../accounts";
import { type BootstrapParams, getCpiAccounts } from "../utils";

export async function createSendMessageInstruction(
  params: BootstrapParams,
  helloMessage: Buffer
) {
  const { connection, config, program, wormholeProgram, owner } = params;
  const { programId } = program;

  // get sequence
  const { sequence } = await getProgramSequenceTracker(connection, programId, wormholeProgram)
  const message = deriveWormholeMessageKey(programId, sequence + 1n)
  const wormholeAccounts = getCpiAccounts(params, message);
  
  const txInstruction = await program.methods
    .sendMessage(helloMessage)
    .accounts({
      // @ts-ignore
      config,
      wormholeProgram,
      ...wormholeAccounts,
    })
    .instruction();
  return { txInstruction, sequence }
}
