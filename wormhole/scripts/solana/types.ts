import type { PostMessageCpiAccounts } from "@certusone/wormhole-sdk/lib/cjs/solana";
import type { Program } from "@coral-xyz/anchor";
import type { Connection, PublicKey, Signer } from "@solana/web3.js";
import type { Nayms } from "../../solana/target/types/nayms";

export type BootstrapParams = {
  connection: Connection,
  signer: Signer,
  program: Program<Nayms>,
  owner: PublicKey,
  config: PublicKey,
  wormholeProgram: PublicKey,
  postMessageCpiAccounts: PostMessageCpiAccounts,
}