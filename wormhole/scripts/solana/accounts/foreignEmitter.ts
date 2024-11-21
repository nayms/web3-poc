import type { ChainId } from "@certusone/wormhole-sdk";
import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import type { Connection, PublicKeyInitData } from "@solana/web3.js";
import { createNaymsProgramInterface } from "../program";

export function deriveForeignEmitterKey(
  programId: PublicKeyInitData,
  chain: ChainId
) {
  return deriveAddress(
    [
      Buffer.from("foreign_emitter"),
      (() => {
        const buf = Buffer.alloc(2);
        buf.writeUInt16LE(chain);
        return buf;
      })(),
    ],
    programId
  );
}

export interface ForeignEmitter {
  chain: ChainId;
  address: Buffer;
}

export async function getForeignEmitterData(
  connection: Connection,
  programId: PublicKeyInitData,
  chain: ChainId
): Promise<ForeignEmitter> {
  const { address } = await createNaymsProgramInterface(connection, programId)
    .account.foreignEmitter.fetch(deriveForeignEmitterKey(programId, chain));

  return {
    chain,
    address: Buffer.from(address),
  };
}
