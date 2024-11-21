import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import type { Connection, PublicKey, PublicKeyInitData } from "@solana/web3.js";
import { createNaymsProgramInterface } from "../program";

export function deriveConfigKey(programId: PublicKeyInitData) {
  return deriveAddress([Buffer.from("config")], programId);
}

export interface WormholeAddresses {
  bridge: PublicKey;
  feeCollector: PublicKey;
  sequence: PublicKey;
}

export interface ConfigData {
  owner: PublicKey;
  wormhole: WormholeAddresses;
}

export async function getConfigData(
  connection: Connection,
  programId: PublicKeyInitData
): Promise<ConfigData> {
  const data = await createNaymsProgramInterface(connection, programId)
    .account.config.fetch(deriveConfigKey(programId));

  return {
    owner: data.owner,
    wormhole: data.wormhole,
  };
}
