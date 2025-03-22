import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  SegmentedButtons,
  Text,
  Card,
  Button,
  Chip,
  useTheme,
  ProgressBar,
} from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSolfitProgram } from "../components/solfit/solfit-data-access";
import { useAuthorization } from "../utils/useAuthorization";
import { useQueryClient } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  initialize,
  getGrantedPermissions,
  requestPermission,
  readRecords,
  readRecord,
} from "react-native-health-connect";
import { useMobileWallet } from "../utils/useMobileWallet";
import bs58 from "bs58";
import { ConnectButton } from "../components/sign-in/sign-in-ui";

export default function MyChallengesScreen() {
  const { selectedAccount } = useAuthorization();
  const connectedWallet = useAuthorization();
  const { signMessage } = useMobileWallet();
  const [value, setValue] = useState("current");
  const { colors } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { getUserJoinedChallenges, syncData, claimReward } = useSolfitProgram();
  const { isSuccess, data } = getUserJoinedChallenges(
    connectedWallet.selectedAccount?.publicKey.toString(),
  );

  useEffect(() => {
    if (isSuccess && !data) {
      queryClient.invalidateQueries({ queryKey: ["get-all-challenges"] });
    }
  }, [isSuccess, data, queryClient]);

  async function handleSyncData(startTime: number, challenge: string) {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentDay = Math.floor((currentTime - startTime) / 86400);
    const dayStartTime = startTime + currentDay * 86400;
    const dayEndTime = dayStartTime + 86400;
    const result = (
      await readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: new Date(dayStartTime * 1000).toISOString(),
          endTime: new Date(dayEndTime * 1000).toISOString(),
        },
      })
    ).records.reduce((a, c) => a + c.count, 0);
    // const signed = await signMessage(Buffer.from({steps}));
    console.log({ startTime, dayStartTime, dayEndTime, result });
    // send to backend

    const message = JSON.stringify({
      data: { steps: result, timestamp: Date.now() },
    });

    const signature = await signMessage(Buffer.from(message));

    await syncData.mutateAsync(
      {
        message,
        challenge,
        signature: bs58.encode(signature),
      },
      {
        async onSuccess(data, variables, context) {
          console.log("syncdata success");
          await queryClient.invalidateQueries({
            queryKey: ["get-user", selectedAccount?.publicKey.toBase58()],
          });
        },

        onError(error, variables, context) {
          console.log("syncdata error");
        },
      },
    );
  }

  async function handleClaimReward(challenge: string) {
    await claimReward.mutateAsync(challenge, {
      async onSuccess(data, variables, context) {
        console.log("claim success");
        await queryClient.invalidateQueries({
          queryKey: ["get-user", selectedAccount?.publicKey.toBase58()],
        });
      },
      onError(error, variables, context) {
        console.log("claim error");
      },
    });
  }

  const renderCurrentChallenges = () => {
    if (data?.incomplete.length == 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="run-fast" size={64} color="#BDBDBD" />
          <Text variant="titleMedium" style={styles.emptyText}>
            You're not participating in any challenges yet
          </Text>
          <Button
            mode="contained"
            style={styles.emptyButton}
            onPress={() => navigation.navigate("Home")}
          >
            Join a Challenge
          </Button>
        </View>
      );
    }

    return data?.incomplete?.map(({ challenge, participant }, i) => {
      const currentTime = Math.floor(Date.now() / 1000);
      const currentDay = Math.floor(
        (currentTime - parseInt(challenge.startTime.toString())) / 86400,
      );

      if (!participant.account.completed) {
        return (
          <Card key={i} style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleLarge" style={styles.challengeName}>
                {challenge.name}
              </Text>

              <View style={[styles.progressText]}>
                <ProgressBar
                  progress={
                    parseInt(
                      participant.account.history[currentDay]?.toString() ||
                        "0",
                    ) / parseInt(challenge.steps.toString())
                  }
                />
                <View
                  style={[
                    styles.statsContainer,
                    { justifyContent: "space-between" },
                  ]}
                >
                  <Chip
                    icon="walk"
                    mode="outlined"
                    style={{ borderWidth: 0, backgroundColor: "transparent" }}
                  >
                    {participant.account.history[currentDay]?.toString() || 0}/
                    {challenge.steps.toString()}
                  </Chip>
                  <Chip
                    icon="clock"
                    mode="outlined"
                    style={{ borderWidth: 0, backgroundColor: "transparent" }}
                  >
                    {parseInt(challenge.duration.toString()) - currentDay} days
                    left
                  </Chip>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <Chip icon="trophy">
                  {challenge.totalParticipants.toString()} participants
                </Chip>
                <Chip icon="currency-usd">
                  Pool: {challenge.pool.toString() / LAMPORTS_PER_SOL} SOL
                </Chip>
              </View>
            </Card.Content>

            <Card.Actions style={styles.cardActions}>
              <Button
                mode="contained-tonal"
                icon="update"
                style={styles.actionButton}
                onPress={() => {
                  handleSyncData(
                    parseInt(challenge.startTime.toString()),
                    participant.account.challenge.toBase58(),
                  );
                }}
                disabled={
                  parseInt(challenge.startTime.toString()) >
                  Math.floor(Date.now() / 1000)
                }
              >
                Sync Steps
              </Button>
              <Button
                mode="contained"
                icon="chart-line"
                style={styles.actionButton}
                onPress={() =>
                  navigation.navigate("ChallengeDetails", {
                    challenge: participant.account.challenge.toBase58(),
                    name: challenge.name,
                  })
                }
              >
                View Details
              </Button>
            </Card.Actions>
          </Card>
        );
      }
    });
  };

  const renderCompletedChallenges = () => {
    if (data?.complete.length == 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="trophy-outline"
            size={64}
            color="#BDBDBD"
          />
          <Text variant="titleMedium" style={styles.emptyText}>
            You haven't completed any challenges yet
          </Text>
        </View>
      );
    }

    return data?.complete?.map(({ challenge, participant }, i) => {
      if (participant.account.completed) {
        return (
          <Card key={i} style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleLarge" style={styles.challengeName}>
                {challenge.name}
              </Text>
              <View style={styles.statsContainer}>
                <Chip icon="trophy">
                  {challenge.totalParticipants.toString()} participants
                </Chip>
                <Chip icon="currency-usd">
                  Pool: {challenge.pool.toString() / LAMPORTS_PER_SOL} SOL
                </Chip>
              </View>
            </Card.Content>

            <Card.Actions style={styles.cardActions}>
              <Button
                mode="contained-tonal"
                icon="currency-usd"
                style={styles.actionButton}
                disabled={
                  participant.account.rewardTaken ||
                  parseInt(challenge.endTime.toString()) >
                    Math.floor(Date.now() / 1000)
                }
                onPress={() =>
                  handleClaimReward(participant.account.challenge.toBase58())
                }
              >
                {parseInt(challenge.endTime.toString()) >
                Math.floor(Date.now() / 1000)
                  ? "Not Ended"
                  : participant.account.rewardTaken
                    ? "Already Claimed"
                    : "Claim Reward"}
              </Button>
              <Button
                mode="contained"
                icon="chart-line"
                style={styles.actionButton}
                onPress={() =>
                  navigation.navigate("ChallengeDetails", {
                    challenge: participant.account.challenge.toBase58(),
                    name: challenge.name,
                  })
                }
              >
                View Details
              </Button>
            </Card.Actions>
          </Card>
        );
      }
    });
  };

  const renderCreatedChallenges = () => {
    if (data?.created.length == 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="account" size={64} color="#BDBDBD" />
          <Text variant="titleMedium" style={styles.emptyText}>
            You haven't created any challenges yet
          </Text>
          <Button
            mode="contained"
            style={styles.emptyButton}
            onPress={() => navigation.navigate("CreateChallenge")}
          >
            Create a Challenge
          </Button>
        </View>
      );
    }

    return data?.created?.map((challenge, i) => {
      return (
        <Card key={i} style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleLarge" style={styles.challengeName}>
              {challenge.account.name}
            </Text>

            <View style={styles.challengeStats}>
              <Chip icon="calendar-range" style={[styles.chip]}>
                {challenge.account.duration} Days
              </Chip>
              <Chip icon="walk" style={[styles.chip]}>
                {challenge.account.steps.toLocaleString()} Steps/Day
              </Chip>
            </View>
            <View style={styles.challengeStats}>
              <Chip icon="account-group" style={[styles.chip]}>
                {challenge.account.totalParticipants} Participants
              </Chip>
              <Chip icon="currency-usd" style={[styles.chip]}>
                {challenge.account.pool.toString() / LAMPORTS_PER_SOL} SOL Pool
              </Chip>
            </View>
          </Card.Content>

          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              icon="chart-line"
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("ChallengeDetails", {
                  challenge: challenge.publicKey.toBase58(),
                  name: challenge.account.name,
                })
              }
            >
              View Details
            </Button>
          </Card.Actions>
        </Card>
      );
    });
  };

  function getComponent(value: string) {
    switch (value) {
      case "current":
        return renderCurrentChallenges();
      case "finished":
        return renderCompletedChallenges();
      case "created":
        return renderCreatedChallenges();
    }
  }

  return (
    <>
      {selectedAccount ? (
        <View style={[styles.screenContainer]}>
          <SegmentedButtons
            value={value}
            onValueChange={setValue}
            style={styles.segmentedButtons}
            buttons={[
              {
                value: "current",
                label: "Ongoing",
                icon: "run-fast",
              },
              {
                value: "finished",
                label: "Completed",
                icon: "trophy",
              },
              {
                value: "created",
                label: "Created",
                icon: "account-plus",
              },
            ]}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {getComponent(value)}
          </ScrollView>
        </View>
      ) : (
        <ConnectButton />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  pageTitle: {
    fontWeight: "bold",
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardCover: {
    height: 120,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    textAlign: "right",
    marginTop: 4,
  },
  cardContent: {
    paddingTop: 16,
  },
  challengeName: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  rewardText: {
    fontWeight: "500",
  },
  earnedText: {
    fontWeight: "500",
  },
  cardActions: {
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  completedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  completedText: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  completedStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  completedStatItem: {
    alignItems: "center",
  },
  statLabel: {
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    color: "#757575",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {},
  challengeStats: {
    flexDirection: "row",
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
  },
});
