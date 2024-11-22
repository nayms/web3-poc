import { deriveAddress } from "@certusone/wormhole-sdk/lib/cjs/solana";
import type { PublicKey, PublicKeyInitData } from "@solana/web3.js";
import type { BootstrapParams } from "../utils";

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

export async function getConfigData(params: BootstrapParams): Promise<ConfigData> {
  const { program, config } = params;

  const data = await program.account.config.fetch(config);

  return {
    owner: data.owner,
    wormhole: data.wormhole,
  };
}
