import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useMemo } from "react";
import * as anchor from "@coral-xyz/anchor";

import { Solfit } from "../../../../solfit/anchor-program/target/types/solfit";
import idl from "../../utils/idl.json";
import { useConnection } from "../../utils/ConnectionProvider";
import { useAnchorWallet } from "../../utils/useAnchorWallet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { alertAndLog } from "../../utils/alertAndLog";
import {
  initialize,
  getGrantedPermissions,
  requestPermission,
} from "react-native-health-connect";

const PROGRAM_ID = "HGJ5aduNj8zgTthPEXf3hgmmEy19MmCpSu3PzwhPedCd";

export type CreateChallengeArgs = {
  name: string;
  duration: string;
  amount: string;
  steps: string;
  startTime: string;
};

export type SyncDataArgs = {
  challenge: string;
  message: string;
  signature: string;
};

// export type Challenge = typeof Solfit;

export function useSolfitProgram() {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const solfitProgramId = useMemo(() => {
    return new PublicKey(PROGRAM_ID);
  }, []);

  const provider = useMemo(() => {
    if (!anchorWallet) {
      return;
    }
    return new AnchorProvider(connection, anchorWallet, {
      preflightCommitment: "confirmed",
      commitment: "processed",
    });
  }, [anchorWallet, connection]);

  const solfitProgram = useMemo(() => {
    if (!provider) {
      return;
    }

    return new Program<Solfit>(idl as Solfit, solfitProgramId, provider);
  }, [provider]);

  const getAllChallenges = useQuery({
    queryKey: ["get-all-challenges"],
    queryFn: async () => {
      if (!solfitProgram) {
        return null;
      }

      return await solfitProgram.account.challenge.all();
    },
  });

  const getChallenge = (challenge: string) => {
    return useQuery({
      queryKey: ["get-challenge"],
      queryFn: async () => {
        if (!solfitProgram) {
          return null;
        }

        return await solfitProgram.account.challenge.fetch(challenge);
      },
    });
  };

  const checkIfUserIsRegisteredInChallenge = (challenge: string) => {
    return useQuery({
      queryKey: ["get-challenge-with-user", challenge],
      queryFn: async () => {
        if (!solfitProgram) {
          return null;
        }

        if (!anchorWallet) {
          throw Error("Please connect wallet");
        }

        const participantSeed = Buffer.from("participant");
        const [participant] = PublicKey.findProgramAddressSync(
          [
            participantSeed,
            new PublicKey(challenge).toBuffer(),
            anchorWallet.publicKey.toBuffer(),
          ],
          solfitProgramId,
        );

        try {
          const c = await solfitProgram.account.challenge.fetch(challenge);
          const p = await solfitProgram.account.participant.fetch(participant);
          const all = (
            await solfitProgram.account.participant.all([
              { memcmp: { offset: 40, bytes: challenge } },
            ])
          ).sort(
            (a, b) =>
              b.account.history.reduce((accumulator, currentValue) => {
                return accumulator + currentValue;
              }, 0) -
              a.account.history.reduce((accumulator, currentValue) => {
                return accumulator + currentValue;
              }, 0),
          );

          return {
            challenge: c,
            participant: p,
            all,
          };
        } catch (error) {
          return null;
        }
      },
    });
  };

  const getUserJoinedChallenges = (user: string | undefined) => {
    return useQuery({
      queryKey: ["get-user", user],
      queryFn: async () => {
        if (!solfitProgram) {
          return null;
        }

        if (!user) return null;

        await initialize();
        const permissions = await getGrantedPermissions();

        if (permissions.length == 0) {
          await requestPermission([
            { accessType: "read", recordType: "Steps" },
            { accessType: "write", recordType: "Steps" },
          ]);
        }

        const participants = await solfitProgram.account.participant.all([
          { memcmp: { offset: 8, bytes: user } },
        ]);

        const mergedData = await Promise.all(
          participants.map(async (participant) => {
            const challenge = await solfitProgram.account.challenge.fetch(
              participant.account.challenge,
            );

            return { participant, challenge };
          }),
        );

        // console.log(mergedData);

        const created = await solfitProgram.account.challenge.all([
          { memcmp: { offset: 8, bytes: user } },
        ]);

        return {
          complete: mergedData.filter(
            (item) => item.participant.account.completed,
          ),
          incomplete: mergedData.filter(
            (item) => !item.participant.account.completed,
          ),
          created,
        };
      },
    });
  };

  const joinChallenge = useMutation({
    mutationKey: ["join-challenge"],
    mutationFn: async (challenge: PublicKey) => {
      if (!solfitProgram) {
        throw Error("Counter program not instantiated");
      }

      if (!anchorWallet) {
        throw Error("Please connect wallet");
      }

      const participantSeed = Buffer.from("participant");
      const [participant] = PublicKey.findProgramAddressSync(
        [
          participantSeed,
          challenge.toBuffer(),
          anchorWallet.publicKey.toBuffer(),
        ],
        solfitProgramId,
      );

      const poolSeed = Buffer.from("vault");
      const [pool] = PublicKey.findProgramAddressSync(
        [poolSeed, challenge.toBuffer()],
        solfitProgramId,
      );

      return await solfitProgram.methods
        .joinChallenge()
        .accounts({
          challenge,
          participant,
          user: anchorWallet.publicKey,
          pool,
        })
        .rpc();
    },
    onSuccess: (signature: string) => {
      return [signature, getAllChallenges.refetch()];
    },
    onError: (error: Error) => alertAndLog(error.name, error.message),
  });

  const createChallenge = useMutation({
    mutationKey: ["create-challenge"],
    mutationFn: async (data: CreateChallengeArgs) => {
      if (!solfitProgram) {
        throw Error("Counter program not instantiated");
      }

      if (!anchorWallet) {
        throw Error("Please connect wallet");
      }

      const challengeSeed = Buffer.from("challenge");
      const [challengePda] = PublicKey.findProgramAddressSync(
        [
          challengeSeed,
          anchorWallet.publicKey.toBuffer(),
          Buffer.from(data.name),
        ],
        solfitProgramId,
      );

      const poolSeed = Buffer.from("vault");
      const [pool] = PublicKey.findProgramAddressSync(
        [poolSeed, challengePda.toBuffer()],
        solfitProgramId,
      );

      return await solfitProgram.methods
        .createChallenge(
          data.name,
          new anchor.BN(data.duration),
          new anchor.BN(parseFloat(data.amount) * LAMPORTS_PER_SOL),
          new anchor.BN(data.steps),
          new anchor.BN(data.startTime),
        )
        .accounts({
          challenge: challengePda,
          creator: anchorWallet.publicKey,
          pool,
        })
        .rpc();
    },
    onSuccess: (signature: string) => {
      return [signature, getAllChallenges.refetch()];
    },
    onError: (error: Error) => alertAndLog(error.name, error.message),
  });

  const syncData = useMutation({
    mutationKey: ["sync-data"],
    mutationFn: async (data: SyncDataArgs) => {
      if (!solfitProgram) {
        throw Error("Counter program not instantiated");
      }

      if (!anchorWallet) {
        throw Error("Please connect wallet");
      }

      const response = await fetch("https://solfit.dedomil.workers.dev/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challenge: data.challenge,
          publicKey: anchorWallet.publicKey.toBase58(),
          message: data.message,
          signature: data.signature,
        }),
      });

      return await response.json();
    },
    onSuccess: (signature: string) => {
      return [signature];
    },
    onError: (error: Error) => alertAndLog(error.name, error.message),
  });

  return {
    solfitProgram,
    solfitProgramId,
    getAllChallenges,
    joinChallenge,
    createChallenge,
    getChallenge,
    getUserJoinedChallenges,
    checkIfUserIsRegisteredInChallenge,
    syncData,
  };
}
