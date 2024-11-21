import { Program, type Provider } from "@coral-xyz/anchor";
import { type Connection, PublicKey, type PublicKeyInitData } from "@solana/web3.js";

import IDL from "../../solana/target/idl/nayms.json";
import type { Nayms } from "../../solana/target/types/nayms";

export function createNaymsProgramInterface(
  connection: Connection,
  payer?: PublicKeyInitData
): Program<Nayms> {
  const provider: Provider = {
    connection,
    publicKey: payer === undefined ? undefined : new PublicKey(payer),
  };
  return new Program<Nayms>(
    IDL as any,
    provider
  );
}
