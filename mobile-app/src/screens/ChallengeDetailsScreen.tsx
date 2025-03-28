import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Clipboard,
} from "react-native";
import {
  Text,
  Card,
  Divider,
  Chip,
  ProgressBar,
  Avatar,
  Surface,
  useTheme,
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  Button,
} from "react-native-paper";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigators/AppNavigator";
import { useSolfitProgram } from "../components/solfit/solfit-data-access";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthorization } from "../utils/useAuthorization";

type ChallengeDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  "ChallengeDetails"
>;

interface ChallengeDetailsScreenProps {
  route: ChallengeDetailsScreenRouteProp;
}

const ChallengeDetailsScreen: React.FC<ChallengeDetailsScreenProps> = ({
  route,
}: {
  route: { params: { challenge: string; name: string } };
}) => {
  const { challenge } = route.params;
  const { selectedAccount } = useAuthorization();
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === "dark" ? MD3DarkTheme : MD3LightTheme;
  const theme = useTheme();
  const { colors } = theme;
  const { checkIfUserIsRegisteredInChallenge, getChallenge, joinChallenge } =
    useSolfitProgram();
  const { isSuccess, data } = getChallenge(challenge);
  const { data: user } = checkIfUserIsRegisteredInChallenge(challenge);
  const queryClient = useQueryClient();

  if (isSuccess && !data) {
    queryClient.invalidateQueries({ queryKey: ["get-all-challenges"] });
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const startTime = parseInt(data?.startTime.toString() || `${currentTime}`);
  const endTime =
    startTime + parseInt(data?.duration.toString() || "0") * 86400;
  const currentDay = Math.floor((currentTime - startTime) / 86400);
  const dayStartTime = startTime + currentDay * 86400;
  const dayEndTime = dayStartTime + 86400;

  const getChallengeTimingText = (): { text: string; isStarted: boolean } => {
    if (!data) {
      return { text: "Loading challenge data...", isStarted: false };
    }

    if (currentTime < startTime) {
      const daysToStart = Math.ceil((startTime - currentTime) / 86400);
      return {
        text: `Challenge starts in ${daysToStart} ${daysToStart === 1 ? "day" : "days"}`,
        isStarted: false,
      };
    } else if (currentTime < endTime) {
      const daysToEnd = Math.ceil((endTime - currentTime) / 86400);
      return {
        text: `Challenge ends in ${daysToEnd} ${daysToEnd === 1 ? "day" : "days"}`,
        isStarted: true,
      };
    } else {
      return { text: "Challenge has ended", isStarted: false };
    }
  };

  const formatPubkey = (pubkey: string): string => {
    if (!pubkey || pubkey.length < 10) return pubkey;
    const first5 = pubkey.slice(0, 5);
    const last5 = pubkey.slice(-5);
    return `${first5}...${last5}`;
  };

  const dynamicStyles = getDynamicStyles(colorScheme);

  return (
    <PaperProvider theme={paperTheme}>
      <ScrollView style={[styles.container, dynamicStyles.container]}>
        <Card style={[styles.card, dynamicStyles.card]} mode="elevated">
          <Card.Content>
            <View style={styles.challengeHeader}>
              <Text variant="headlineSmall" style={{ fontWeight: "bold" }}>
                {data?.name}
              </Text>
              <Chip icon="currency-usd">
                {data?.pool.toString() / LAMPORTS_PER_SOL} SOL
              </Chip>
            </View>
            <View style={styles.countdownContainer}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.countdownText,
                  getChallengeTimingText().isStarted
                    ? styles.endsInText
                    : styles.startsInText,
                ]}
              >
                {getChallengeTimingText().text}
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text variant="bodyMedium">Duration</Text>
                <Text variant="titleMedium">
                  {data?.duration.toString()} Days
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="bodyMedium">Target</Text>
                <Text variant="titleMedium">
                  {data?.steps.toString()} Steps
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="bodyMedium">Participants</Text>
                <Text variant="titleMedium">
                  {data?.totalParticipants.toString()}
                </Text>
              </View>
            </View>

            {!user ? (
              <Button
                mode="contained"
                icon="run-fast"
                onPress={() => {
                  if (!selectedAccount) return;
                  joinChallenge.mutateAsync(
                    new PublicKey(route.params.challenge),
                  );
                }}
                disabled={
                  parseInt(data?.startTime) < Math.floor(Date.now() / 1000)
                }
              >
                Register for {data?.amount / LAMPORTS_PER_SOL} SOL
              </Button>
            ) : (
              <>
                <View style={styles.progressSection}>
                  <Text variant="titleMedium">Your Progress</Text>
                  <View style={styles.progressRow}>
                    <Text variant="bodyMedium">Overall Completion</Text>
                    <Text variant="bodyMedium">
                      {Math.floor(
                        (user.participant.history.reduce(
                          (a: number, c: number) => a + c,
                          0,
                        ) /
                          ((data?.duration || 0) * (data?.steps || 0))) *
                          100,
                      )}
                      %
                    </Text>
                  </View>
                  <ProgressBar
                    progress={
                      user.participant.history.reduce(
                        (a: number, c: number) => a + c,
                        0,
                      ) /
                      ((data?.duration || 0) * (data?.steps || 0))
                    }
                    color={colors.primary}
                    style={styles.progressBar}
                  />
                  <View style={styles.progressRow}>
                    <Text variant="bodyMedium">Days Completed</Text>
                    <Text variant="bodyMedium">
                      {currentDay <= 0
                        ? `${data?.duration}/${data?.duration} Days`
                        : `${currentDay + 1}/${data?.duration || 1 || 0} Days`}
                    </Text>
                  </View>
                  {currentDay <= 0 ? (
                    <ProgressBar
                      progress={1}
                      color={colors.secondary}
                      style={styles.progressBar}
                    />
                  ) : (
                    <ProgressBar
                      progress={
                        currentDay / parseInt(data?.duration.toString() || "0")
                      }
                      color={colors.secondary}
                      style={styles.progressBar}
                    />
                  )}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {!user || user.participant.history.length == 0 ? (
          ""
        ) : (
          <Card style={[styles.card, dynamicStyles.card]} mode="elevated">
            <Card.Content>
              <Text variant="bodyMedium" style={styles.cardSubtitle}>
                {currentDay <= 0
                  ? "Challenge Ended"
                  : `Today is Day ${currentDay + 1}`}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daysScrollContent}
              >
                {user?.participant.history.map((day: number, i: number) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedDay(i + 1)}
                    style={[
                      styles.dayPill,
                      dynamicStyles.dayPill,
                      selectedDay === day && styles.selectedDayPill,
                      day === currentDay && styles.currentDayPill,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        parseInt(
                          user?.participant.history[i].toString() || "0",
                        ) >= parseInt(user?.challenge.steps.toString() || "0")
                          ? "check-circle"
                          : day < currentDay
                            ? "close-circle"
                            : "progress-clock"
                      }
                      size={16}
                      color={
                        parseInt(
                          user?.participant.history[i].toString() || "0",
                        ) >= parseInt(user?.challenge.steps.toString() || "0")
                          ? "#4CAF50"
                          : day < currentDay
                            ? "#F44336"
                            : "#FF9800"
                      }
                      style={styles.dayStatusIcon}
                    />
                    <Text
                      style={[
                        styles.dayPillText,
                        dynamicStyles.dayPillText,
                        selectedDay === day && styles.selectedDayPillText,
                      ]}
                    >
                      Day {i + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedDay && (
                <Surface
                  style={[
                    styles.dailyDetailCard,
                    dynamicStyles.dailyDetailCard,
                  ]}
                >
                  <View style={styles.dailyDetailHeader}>
                    <View>
                      <Text
                        variant="titleMedium"
                        style={styles.dailyDetailTitle}
                      >
                        Day {selectedDay}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={
                          parseInt(
                            user?.participant.history[
                              selectedDay - 1
                            ]?.toString() || "0",
                          ) >= parseInt(user?.challenge.steps.toString() || "0")
                            ? styles.completedStatus
                            : styles.incompleteStatus
                        }
                      >
                        {parseInt(
                          user?.participant.history[
                            selectedDay - 1
                          ]?.toString() || "0",
                        ) >= parseInt(user?.challenge.steps.toString() || "0")
                          ? "Completed"
                          : selectedDay < currentDay
                            ? "Failed"
                            : "In Progress"}
                      </Text>
                    </View>

                    {parseInt(
                      user?.participant.history[selectedDay - 1]?.toString() ||
                        "0",
                    ) >= parseInt(user?.challenge.steps.toString() || "0") && (
                      <MaterialCommunityIcons
                        name="trophy"
                        size={24}
                        color="#FFD700"
                      />
                    )}
                  </View>

                  <Divider style={styles.divider} />

                  <View style={styles.progressDetails}>
                    <View style={styles.progressRow}>
                      <Text variant="bodyMedium">Steps Taken:</Text>
                      <Text variant="bodyMedium" style={styles.progressValue}>
                        {user?.participant.history[selectedDay - 1]?.toString()}
                      </Text>
                    </View>

                    <View style={styles.progressRow}>
                      <Text variant="bodyMedium">Target Steps:</Text>
                      <Text variant="bodyMedium" style={styles.progressValue}>
                        {user?.challenge.steps}
                      </Text>
                    </View>

                    <View style={styles.progressRow}>
                      <Text variant="bodyMedium">Completion:</Text>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.progressValue,
                          parseInt(
                            user?.participant.history[
                              selectedDay - 1
                            ]?.toString() || "0",
                          ) /
                            parseInt(user?.challenge.steps.toString() || "0") >=
                          1
                            ? styles.completedStatus
                            : styles.incompleteStatus,
                        ]}
                      >
                        {Math.floor(
                          (parseInt(
                            user?.participant.history[
                              selectedDay - 1
                            ]?.toString() || "0",
                          ) /
                            parseInt(user?.challenge.steps.toString() || "0")) *
                            100,
                        )}
                        %
                      </Text>
                    </View>
                  </View>
                  <ProgressBar
                    progress={Math.min(
                      parseInt(
                        user?.participant.history[
                          selectedDay - 1
                        ]?.toString() || "0",
                      ) / parseInt(user?.challenge.steps.toString() || "1"),
                      1,
                    )}
                    color={
                      parseInt(
                        user?.participant.history[
                          selectedDay - 1
                        ]?.toString() || "0",
                      ) >= parseInt(user?.challenge.steps.toString() || "0")
                        ? "#4CAF50"
                        : "#FF9800"
                    }
                    style={styles.dailyProgressBar}
                  />
                </Surface>
              )}
            </Card.Content>
          </Card>
        )}

        {data?.isPrivate && (
          <Card style={[styles.card, dynamicStyles.card]} mode="elevated">
            <Card.Content>
              <View style={styles.invitedUsersHeader}>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Invited Users
                </Text>
                <Text variant="bodyLarge" style={styles.invitedUsersCount}>
                  {data?.group.length} Member
                  {data?.group.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {data?.group.map((participant, i) => (
                <View
                  key={i}
                  style={[
                    styles.invitedUserItem,
                    dynamicStyles.invitedUserItem,
                  ]}
                >
                  <View style={styles.invitedUserContent}>
                    <Avatar.Text
                      size={40}
                      label={participant.toBase58().substring(0, 2)}
                      style={styles.invitedUserAvatar}
                    />
                    <View style={styles.invitedUserDetails}>
                      <Text
                        variant="bodyLarge"
                        style={styles.invitedUserPubkey}
                      >
                        {formatPubkey(participant.toBase58())}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setString(participant.toBase58());
                        // You might want to add a toast or snackbar to show "Copied!"
                      }}
                      style={styles.copyButton}
                    >
                      <MaterialCommunityIcons
                        name="content-copy"
                        size={20}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {user?.all && (
          <Card style={[styles.card, dynamicStyles.card]} mode="elevated">
            <Card.Content>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Leaderboard
              </Text>
              {user?.all.map((participant, i) => (
                <View
                  key={i}
                  style={[
                    styles.leaderboardItem,
                    dynamicStyles.leaderboardItem,
                  ]}
                >
                  <View style={styles.rankContainer}>
                    <Text
                      variant="titleMedium"
                      // style={participant.name === "You" ? styles.yourRank : null}
                    >
                      #{i + 1}
                    </Text>
                  </View>
                  <Avatar.Text
                    size={28}
                    label={participant.publicKey.toBase58().substring(0, 2)}
                    style={styles.avatar}
                  />
                  <View style={styles.participantInfo}>
                    <Text
                      variant="bodyMedium"
                      // style={participant.name === "You" ? styles.yourName : null}
                    >
                      {formatPubkey(participant.publicKey.toBase58())}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.leaderboardSteps}>
                    {participant.account.history.reduce(
                      (a: number, c: number) => a + c,
                      0,
                    )}{" "}
                    Steps
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </PaperProvider>
  );
};

// Static styles that don't change with theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  challengeHeaderDate: {
    fontSize: 13,
    color: "grey",
    textAlign: "right",
    marginBottom: 8,
    marginRight: 3,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  progressSection: {
    marginVertical: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  cardSubtitle: {
    marginBottom: 12,
    opacity: 0.7,
  },
  daysScrollContent: {
    paddingVertical: 8,
  },
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedDayPill: {
    backgroundColor: "#3F51B5",
  },
  currentDayPill: {
    borderWidth: 2,
    borderColor: "#FF9800",
  },
  dayStatusIcon: {
    marginRight: 4,
  },
  dayPillText: {
    fontSize: 14,
  },
  selectedDayPillText: {
    color: "white",
  },
  dailyDetailCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  dailyDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dailyDetailTitle: {
    fontWeight: "bold",
  },
  completedStatus: {
    color: "#4CAF50",
  },
  incompleteStatus: {
    color: "#FF9800",
  },
  divider: {
    marginVertical: 12,
  },
  progressDetails: {
    marginVertical: 8,
  },
  progressValue: {
    fontWeight: "bold",
  },
  dailyProgressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
  },
  rankContainer: {
    width: 36,
    alignItems: "center",
  },
  avatar: {
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
    marginRight: 8,
  },
  leaderboardProgress: {
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  leaderboardSteps: {
    minWidth: 60,
    textAlign: "right",
  },
  yourRank: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  yourName: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  countdownContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  countdownText: {
    fontWeight: "bold",
  },
  startsInText: {
    color: "#FF9800", // Orange for "starts in"
  },
  endsInText: {
    color: "#4CAF50", // Green for "ends in"
  },
  invitedUsersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  invitedUsersCount: {
    opacity: 0.7,
  },
  invitedUserItem: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  invitedUserContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  invitedUserAvatar: {
    marginRight: 12,
  },
  invitedUserDetails: {
    flex: 1,
  },
  invitedUserPubkey: {
    fontWeight: "500",
  },
  copyButton: {
    padding: 8,
  },
});

// Dynamic styles that change with theme
const getDynamicStyles = (colorScheme: any) => {
  const isDark = colorScheme === "dark";

  return StyleSheet.create({
    container: {
      backgroundColor: isDark ? "#121212" : "#f5f5f5",
    },
    card: {
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
    },
    dayPill: {
      backgroundColor: isDark ? "#333333" : "#E0E0E0",
    },
    dayPillText: {
      color: isDark ? "#ffffff" : "#000000",
    },
    dailyDetailCard: {
      backgroundColor: isDark ? "#2d2d2d" : "#ffffff",
    },
    leaderboardItem: {
      backgroundColor: isDark ? "#333333" : "#F5F5F5",
    },
    invitedUserItem: {
      backgroundColor: isDark ? "#333333" : "#F5F5F5",
    },
  });
};

export default ChallengeDetailsScreen;
