// tests are from solana playground (as anchor has some version issues, i deployed and tested from solpg)

describe("solfit tests", () => {
  it("can create a challenge", async () => {
    const challengeName = "Test Challenge";

    const [challengePda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("challenge"),
        pg.wallet.publicKey.toBuffer(),
        Buffer.from(challengeName),
      ],
      pg.PROGRAM_ID,
    );

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      pg.PROGRAM_ID,
    );

    const txHash = await pg.program.methods
      .createChallenge(
        challengeName,
        1,
        new BN(0.01 * web3.LAMPORTS_PER_SOL),
        1000,
        new BN(Math.floor(Date.now() / 1000) + 3600),
        false,
        0,
      )
      .accounts({
        challenge: challengePda,
        creator: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    await pg.connection.confirmTransaction(txHash);

    const challenge = await pg.program.account.challenge.fetch(challengePda);

    assert(challenge.amount.eq(new BN(0.01 * web3.LAMPORTS_PER_SOL)));
    assert(challenge.creator.equals(pg.wallet.publicKey));
    assert(challenge.duration === 1);
    assert(!challenge.isPrivate);
    assert(challenge.name === challengeName);
    assert(challenge.steps === 1000);
  });

  it("can join a challenge", async () => {
    const challengeName = "Test Challenge";

    const [challengePda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("challenge"),
        pg.wallet.publicKey.toBuffer(),
        Buffer.from(challengeName),
      ],
      pg.PROGRAM_ID,
    );

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .createChallenge(
        challengeName,
        1,
        new BN(0.01 * web3.LAMPORTS_PER_SOL),
        1000,
        new BN(Math.floor(Date.now() / 1000) + 3600),
        false,
        0,
      )
      .accounts({
        challenge: challengePda,
        creator: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const [participantPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        challengePda.toBuffer(),
        pg.wallet.publicKey.toBuffer(),
      ],
      pg.PROGRAM_ID,
    );

    const txHash = await pg.program.methods
      .joinChallenge()
      .accounts({
        challenge: challengePda,
        participant: participantPda,
        user: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    await pg.connection.confirmTransaction(txHash);

    const participant =
      await pg.program.account.participant.fetch(participantPda);

    assert(participant.user.equals(pg.wallet.publicKey));
    assert(participant.challenge.equals(challengePda));
    assert(participant.daysCompleted === 0);
    assert(participant.completed === false);
    assert(participant.rewardTaken === false);

    const challenge = await pg.program.account.challenge.fetch(challengePda);
    assert(challenge.totalParticipants === 1);
    assert(challenge.pool.eq(new BN(0.01 * web3.LAMPORTS_PER_SOL)));
  });

  it("can sync data for a challenge", async () => {
    const challengeName = "Sync Test Challenge";
    const startTime = Math.floor(Date.now() / 1000) - 3600;

    const [challengePda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("challenge"),
        pg.wallet.publicKey.toBuffer(),
        Buffer.from(challengeName),
      ],
      pg.PROGRAM_ID,
    );

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .createChallenge(
        challengeName,
        1,
        new BN(0.01 * web3.LAMPORTS_PER_SOL),
        1000,
        new BN(startTime),
        false,
        0,
      )
      .accounts({
        challenge: challengePda,
        creator: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const [participantPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        challengePda.toBuffer(),
        pg.wallet.publicKey.toBuffer(),
      ],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .joinChallenge()
      .accounts({
        challenge: challengePda,
        participant: participantPda,
        user: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const signerKeypair = web3.Keypair.fromSecretKey(
      Uint8Array.from([
        215, 175, 51, 88, 217, 246, 72, 79, 154, 99, 18, 251, 106, 198, 78, 137,
        186, 221, 225, 142, 144, 230, 117, 113, 225, 5, 88, 207, 191, 244, 158,
        247, 9, 235, 112, 3, 217, 86, 60, 161, 67, 98, 95, 199, 73, 70, 102,
        218, 41, 63, 91, 169, 212, 203, 145, 215, 112, 192, 243, 21, 153, 120,
        11, 203,
      ]),
    );

    const txHash = await pg.program.methods
      .syncData(1200)
      .accounts({
        challenge: challengePda,
        participant: participantPda,
        user: pg.wallet.publicKey,
        signer: signerKeypair.publicKey,
      })
      .signers([signerKeypair])
      .rpc();

    await pg.connection.confirmTransaction(txHash);

    const participant =
      await pg.program.account.participant.fetch(participantPda);

    assert(participant.daysCompleted === 1);
    assert(participant.completed === true);
    assert(participant.history.length === 1);
    assert(participant.history[0] === 1200);

    const challenge = await pg.program.account.challenge.fetch(challengePda);
    assert(challenge.successfulParticipants === 1);
  });

  it("can withdraw reward after completing a challenge", async () => {
    const challengeName = "Withdraw Test Challenge";
    const startTime = Math.floor(Date.now() / 1000) - 172800;
    const endTime = startTime + 86400;

    const [challengePda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("challenge"),
        pg.wallet.publicKey.toBuffer(),
        Buffer.from(challengeName),
      ],
      pg.PROGRAM_ID,
    );

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .createChallenge(
        challengeName,
        1,
        new BN(0.01 * web3.LAMPORTS_PER_SOL),
        1000,
        new BN(startTime),
        false,
        0,
      )
      .accounts({
        challenge: challengePda,
        creator: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const [participantPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        challengePda.toBuffer(),
        pg.wallet.publicKey.toBuffer(),
      ],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .joinChallenge()
      .accounts({
        challenge: challengePda,
        participant: participantPda,
        user: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const signerKeypair = web3.Keypair.fromSecretKey(
      Uint8Array.from([
        215, 175, 51, 88, 217, 246, 72, 79, 154, 99, 18, 251, 106, 198, 78, 137,
        186, 221, 225, 142, 144, 230, 117, 113, 225, 5, 88, 207, 191, 244, 158,
        247, 9, 235, 112, 3, 217, 86, 60, 161, 67, 98, 95, 199, 73, 70, 102,
        218, 41, 63, 91, 169, 212, 203, 145, 215, 112, 192, 243, 21, 153, 120,
        11, 203,
      ]),
    );

    await pg.program.methods
      .syncData(1200)
      .accounts({
        challenge: challengePda,
        participant: participantPda,
        user: pg.wallet.publicKey,
        signer: signerKeypair.publicKey,
      })
      .signers([signerKeypair])
      .rpc();

    const balanceBefore = await pg.connection.getBalance(pg.wallet.publicKey);

    const txHash = await pg.program.methods
      .withdrawReward()
      .accounts({
        challenge: challengePda,
        participant: participantPda,
        user: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    await pg.connection.confirmTransaction(txHash);

    const participant =
      await pg.program.account.participant.fetch(participantPda);

    assert(participant.rewardTaken === true);

    const balanceAfter = await pg.connection.getBalance(pg.wallet.publicKey);
    assert(balanceAfter > balanceBefore);
  });

  it("cannot join a challenge after it started", async () => {
    const challengeName = "Late Join Test";
    const startTime = Math.floor(Date.now() / 1000) - 3600;

    const [challengePda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("challenge"),
        pg.wallet.publicKey.toBuffer(),
        Buffer.from(challengeName),
      ],
      pg.PROGRAM_ID,
    );

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .createChallenge(
        challengeName,
        1,
        new BN(0.01 * web3.LAMPORTS_PER_SOL),
        1000,
        new BN(startTime),
        false,
        0,
      )
      .accounts({
        challenge: challengePda,
        creator: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const [participantPda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        challengePda.toBuffer(),
        pg.wallet.publicKey.toBuffer(),
      ],
      pg.PROGRAM_ID,
    );

    try {
      await pg.program.methods
        .joinChallenge()
        .accounts({
          challenge: challengePda,
          participant: participantPda,
          user: pg.wallet.publicKey,
          pool: poolPda,
        })
        .signers([pg.wallet.keypair])
        .rpc();

      assert.fail("Should have thrown an error");
    } catch (error) {
      assert(error.message.includes("ChallengeAlreadyStarted"));
    }
  });

  it("can create and join a private challenge", async () => {
    const challengeName = "Private Challenge";

    const [challengePda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("challenge"),
        pg.wallet.publicKey.toBuffer(),
        Buffer.from(challengeName),
      ],
      pg.PROGRAM_ID,
    );

    const [poolPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), challengePda.toBuffer()],
      pg.PROGRAM_ID,
    );

    const groupMembers = [
      pg.wallet.publicKey,
      pg.wallets.wallet2.publicKey,
      pg.wallets.wallet3.publicKey,
    ];

    await pg.program.methods
      .createChallenge(
        challengeName,
        1,
        new BN(0.01 * web3.LAMPORTS_PER_SOL),
        1000,
        new BN(Math.floor(Date.now() / 1000) + 3600),
        true,
        groupMembers.length,
      )
      .accounts({
        challenge: challengePda,
        creator: pg.wallet.publicKey,
        pool: poolPda,
      })
      .remainingAccounts(
        groupMembers.map((pk) => ({
          pubkey: pk,
          isWritable: false,
          isSigner: false,
        })),
      )
      .signers([pg.wallet.keypair])
      .rpc();

    const [participant1Pda] = web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("participant"),
        challengePda.toBuffer(),
        pg.wallet.publicKey.toBuffer(),
      ],
      pg.PROGRAM_ID,
    );

    await pg.program.methods
      .joinChallenge()
      .accounts({
        challenge: challengePda,
        participant: participant1Pda,
        user: pg.wallet.publicKey,
        pool: poolPda,
      })
      .signers([pg.wallet.keypair])
      .rpc();

    const challenge = await pg.program.account.challenge.fetch(challengePda);
    assert(challenge.isPrivate === true);
    assert(challenge.totalParticipants === 1);
    assert(challenge.group.length === 3);
    assert(challenge.group[0].equals(pg.wallet.publicKey));
    assert(challenge.group[1].equals(pg.wallets.wallet2.publicKey));
    assert(challenge.group[2].equals(pg.wallets.wallet3.publicKey));
  });
});
