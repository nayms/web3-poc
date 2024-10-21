use anchor_lang::prelude::*;

declare_id!("F6djtgSXvsSLy4CFPDum3jccq4j3V9hZFJpqzdayipEx");

#[program]
pub mod solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
