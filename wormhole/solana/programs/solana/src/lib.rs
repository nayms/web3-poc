use anchor_lang::prelude::*;
use wormhole_anchor_sdk::wormhole;

declare_id!("BYFW1vhC1ohxwRbYoLbAWs86STa25i9sD5uEusVjTYNd");

#[program]
mod nayms {
    use super::*;
    pub fn post_message(
        ctx: Context<PostMessage>,
        message: Vec<u8>,
        nonce: u32,
        consistency_level: u8,
    ) -> Result<()> {
        if message.is_empty() {
            return Err(ErrorCode::EmptyMessage.into());
        }

        let accs = wormhole::PostMessage {
            config: ctx.accounts.bridge.to_account_info(),
            message: ctx.accounts.message.to_account_info(),
            emitter: ctx.accounts.emitter.clone(),
            sequence: ctx.accounts.sequence.clone(),
            payer: ctx.accounts.payer.to_account_info(),
            fee_collector: ctx.accounts.fee_collector.to_account_info(),
            clock: ctx.accounts.clock.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        wormhole::post_message(
            CpiContext::new_with_signer(
                ctx.accounts.wormhole_program.to_account_info(),
                accs,
                &[&[
                    b"emitter",
                    crate::ID.as_ref(),
                    &[ctx.bumps.emitter],
                ]],
            ),
            nonce,
            message,
            wormhole::Finality::try_from(consistency_level).unwrap(),
        )?;

        msg!("Message posted to Wormhole bridge");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct PostMessage<'info> {
    /// CHECK: Wormhole program
    #[account(address = wormhole::program::ID)]
    pub wormhole_program: AccountInfo<'info>,
    /// CHECK: Wormhole bridge
    #[account(mut)]
    pub bridge: AccountInfo<'info>,
    /// CHECK: Wormhole message
    #[account(mut)]
    pub message: AccountInfo<'info>,
    /// CHECK: Wormhole emitter
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 32,
        seeds = [b"emitter"],
        bump
    )]
    pub emitter: AccountInfo<'info>,
    /// CHECK: Wormhole sequence
    #[account(mut)]
    pub sequence: AccountInfo<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Wormhole fee collector
    #[account(mut)]
    pub fee_collector: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Message cannot be empty")]
    EmptyMessage,
}


