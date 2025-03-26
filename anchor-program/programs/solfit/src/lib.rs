use anchor_lang::prelude::*;
use anchor_lang::solana_program::{pubkey, system_instruction};

declare_id!("HcW7goAkhwaUX1JdmaCEBoprk4XnXxci4XCGrRFnxvXe");

// used for backend verification for step counts
const SIGNER_PUBKEY: Pubkey = pubkey!("fithqevcksfXZJcLvje3kfybGLxCNTYAi18BJEZJdMk");

#[program]
pub mod solfit {

    use super::*;

    pub fn create_challenge(
        ctx: Context<CreateChallenge>,
        name: String,
        duration: u16,
        amount: u64,
        steps: u32,
        start_time: u64,
        is_private: bool,
        group_members_count: u8,
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let creator = &ctx.accounts.creator;

        let group_members: Vec<Pubkey> = ctx
            .remaining_accounts
            .iter()
            .map(|account| account.key())
            .collect();

        if is_private {
            if !group_members.contains(&creator.key()) {
                return err!(ErrorCode::CreatorMustBeInGroup);
            }

            if group_members.len() <= 1 {
                return err!(ErrorCode::InsufficientGroupMembers);
            }
        }

        challenge.creator = creator.key();
        challenge.name = name;
        challenge.duration = duration;
        challenge.amount = amount;
        challenge.steps = steps;
        challenge.start_time = start_time;
        challenge.end_time = start_time + (duration as u64 * 86400);
        challenge.total_participants = 0;
        challenge.successful_participants = 0;
        challenge.pool = 0;
        challenge.group = group_members;
        challenge.is_private = is_private;

        Ok(())
    }

    pub fn join_challenge(ctx: Context<JoinChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let participant = &mut ctx.accounts.participant;
        let current_time = Clock::get()?.unix_timestamp as u64;

        if challenge.is_private {
            require!(
                challenge.group.contains(&ctx.accounts.user.key()),
                ErrorCode::NotInChallengeGroup
            );
        }

        require!(
            current_time < challenge.start_time,
            ErrorCode::ChallengeAlreadyStarted
        );

        participant.user = ctx.accounts.user.key();
        participant.challenge = challenge.key();
        participant.history = Vec::new();
        participant.days_completed = 0;
        participant.completed = false;
        participant.reward_taken = false;

        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.pool.key(),
            challenge.amount,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.pool.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        challenge.total_participants += 1;
        challenge.pool += challenge.amount;

        Ok(())
    }

    pub fn sync_data(ctx: Context<SyncData>, steps: u32) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        let participant = &mut ctx.accounts.participant;
        let current_time = Clock::get()?.unix_timestamp as u64;

        if challenge.is_private {
            require!(
                challenge.group.contains(&participant.user),
                ErrorCode::NotInChallengeGroup
            );
        }

        require!(
            current_time >= challenge.start_time,
            ErrorCode::ChallengeNotStarted
        );

        require!(
            current_time <= challenge.end_time,
            ErrorCode::ChallengeEnded
        );

        let current_day = ((current_time - challenge.start_time) / 86400) as u64;

        // add a element (0) in vector to resize it to next day!
        while participant.history.len() <= current_day as usize {
            participant.history.push(0);
        }

        let previous_steps = participant.history[current_day as usize];
        let threshold = previous_steps < challenge.steps && steps >= challenge.steps;

        participant.history[current_day as usize] = steps;

        if threshold {
            participant.days_completed += 1;
        }

        if participant.days_completed >= challenge.duration {
            participant.completed = true;
            challenge.successful_participants += 1;
        }

        Ok(())
    }

    pub fn withdraw_reward(ctx: Context<WithdrawReward>) -> Result<()> {
        let challenge = &ctx.accounts.challenge;
        let participant = &mut ctx.accounts.participant;
        let current_time = Clock::get()?.unix_timestamp as u64;

        if challenge.is_private {
            require!(
                challenge.group.contains(&participant.user),
                ErrorCode::NotInChallengeGroup
            );
        }

        require!(
            current_time > challenge.end_time,
            ErrorCode::ChallengeStillActive
        );
        require!(participant.completed, ErrorCode::ChallengeNotCompleted);
        require!(!participant.reward_taken, ErrorCode::RewardAlreadyWithdrawn);

        let reward_amount = if challenge.successful_participants == 0 {
            0
        } else {
            let failed_participants =
                (challenge.total_participants - challenge.successful_participants) as u64;
            let extra_amount = failed_participants * challenge.amount;

            challenge.amount + (extra_amount / challenge.successful_participants as u64)
        };

        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.pool.key(),
            &ctx.accounts.user.key(),
            reward_amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                ctx.accounts.pool.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"challenge",
                challenge.creator.as_ref(),
                challenge.name.as_bytes(),
                &[ctx.bumps.challenge],
            ]],
        )?;

        participant.reward_taken = true;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, group_members_count: u8)]
pub struct CreateChallenge<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + (4 + name.len()) + 2 + 8 + 4 + 8 + 8 + 4 + 4 + 8 + 1 + (4 + (32 * group_members_count as usize)),
        seeds = [b"challenge", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub challenge: Account<'info, Challenge>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: pool address
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

#[derive(Accounts)]
pub struct JoinChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,

    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 4 + (4 * challenge.duration as usize) + 2 + 1 + 1,
        seeds = [b"participant", challenge.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, Participant>,
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: pool address
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump
    )]
    pub pool: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SyncData<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,

    #[account(
        mut,
        seeds = [b"participant", challenge.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = participant.user == user.key()
    )]
    pub participant: Account<'info, Participant>,

    /// CHECK: this will be validated by signed message in backend
    pub user: AccountInfo<'info>,
    #[account(address = SIGNER_PUBKEY)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawReward<'info> {
    #[account(
        mut,
        seeds = [b"challenge", challenge.creator.as_ref(), challenge.name.as_bytes()],
        bump
    )]
    pub challenge: Account<'info, Challenge>,

    #[account(
        mut,
        seeds = [b"participant", challenge.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = participant.user == user.key()
    )]
    pub participant: Account<'info, Participant>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: pool account
    #[account(
        mut,
        seeds = [b"vault", challenge.key().as_ref()],
        bump
    )]
    pub pool: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Challenge {
    pub creator: Pubkey,
    pub name: String,
    pub duration: u16, // in days hoga
    pub amount: u64,   // in lamports
    pub steps: u32,
    pub start_time: u64,
    pub end_time: u64,
    // fields below this need to be updated when joining challenge
    pub total_participants: u32,
    pub successful_participants: u32,
    pub pool: u64,
    pub is_private: bool,
    pub group: Vec<Pubkey>,
}

#[account]
pub struct Participant {
    pub user: Pubkey,
    pub challenge: Pubkey,
    pub history: Vec<u32>,
    pub days_completed: u16,
    pub completed: bool,
    pub reward_taken: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Challenge has already started")]
    ChallengeAlreadyStarted,
    #[msg("Challenge has not started yet")]
    ChallengeNotStarted,
    #[msg("Challenge has ended")]
    ChallengeEnded,
    #[msg("Challenge is still active")]
    ChallengeStillActive,
    #[msg("Challenge was not completed")]
    ChallengeNotCompleted,
    #[msg("Reward has already been withdrawn")]
    RewardAlreadyWithdrawn,
    #[msg("User is not in the challenge group")]
    NotInChallengeGroup,
    #[msg("Creator must be in the group")]
    CreatorMustBeInGroup,
    #[msg("Group must have at least two members")]
    InsufficientGroupMembers,
}
