import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import { deriveWormholeEmitterKey } from "@certusone/wormhole-sdk/lib/cjs/solana/wormhole";
import type { Connection, PublicKeyInitData } from "@solana/web3.js";
import { createNaymsProgramInterface } from "../program";

export { deriveWormholeEmitterKey };

export function deriveWormholeMessageKey(
  programId: PublicKeyInitData,
  sequence: bigint
) {
  return deriveAddress(
    [
      Buffer.from("sent"),
      (() => {
        const buf = Buffer.alloc(8);
        buf.writeBigUInt64LE(sequence);
        return buf;
      })(),
    ],
    programId
  );
}

export interface WormholeEmitterData {
  bump: number;
}

export async function getWormholeEmitterData(
  connection: Connection,
  programId: PublicKeyInitData
): Promise<WormholeEmitterData> {
  return createNaymsProgramInterface(connection, programId)
    .account.wormholeEmitter.fetch(deriveWormholeEmitterKey(programId));
}
