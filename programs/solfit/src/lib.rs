use anchor_lang::prelude::*;

declare_id!("HWDxg2mHw14Y8g3D6xvJeTK5pgByNaPnRVGBvsS8tTZV");

#[program]
pub mod solfit {
    use super::*;

    pub fn create_challenge(
        ctx: Context<CreateChallenge>,
        name: String,
        duration: u16,
        amount: u32,
        steps: u32,
        start_time: u64,
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let creator = &ctx.accounts.creator;

        challenge.creator = creator.key();
        challenge.name = name;
        challenge.duration = duration;
        challenge.amount = amount;
        challenge.steps = steps;
        challenge.start_time = start_time;
        challenge.end_time = start_time + (duration as u64 * 86400);
        challenge.active = true;
        challenge.total_participants = 0;
        challenge.successful_participants = 0;
        challenge.pool = 0;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateChallenge<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + (4 + name.len()) + 2 + 4 + 4 + 8 + 8 + 1 + 4 + 4 + 8,
        seeds = [b"challenge", challenge.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub challenge: Account<'info, Challenge>,

    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"vault", challenge.key().as_ref()],
        bump
    )]
    pub pool: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Challenge {
    pub creator: Pubkey,
    pub name: String,
    pub duration: u16, // in days hoga
    pub amount: u32,   // in lamports
    pub steps: u32,
    pub start_time: u64,
    pub end_time: u64,
    pub active: bool,
    // fields below this need to be updated when joining challenge
    pub total_participants: u32,
    pub successful_participants: u32,
    pub pool: u64,
}

#[account]
pub struct Participant {
    pub user: Pubkey,
    pub challenge: Pubkey,
    pub history: Vec<u64>,
    pub days_completed: u64,
    pub completed: bool,
    pub reward_taken: bool,
}
