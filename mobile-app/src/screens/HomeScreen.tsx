import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, useColorScheme, View } from "react-native";
import { Button, Card, Chip, FAB, Searchbar, Text } from "react-native-paper";
import { useSolfitProgram } from "../components/solfit/solfit-data-access";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useAuthorization } from "../utils/useAuthorization";
import { ConnectButton } from "../components/sign-in/sign-in-ui";

export function HomeScreen() {
  const { selectedAccount } = useAuthorization();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [result, setResult] = useState<typeof data>([]);

  const images = [
    "https://img.olympics.com/images/image/private/t_s_pog_staticContent_hero_xl_2x/f_auto/primary/lyf9jpjyhru97aazso38",
    "https://cdn.apollohospitals.com/health-library-prod/2021/04/shutterstock_788590396-scaled.jpg",
    "https://www.sciencefriday.com/wp-content/uploads/2024/10/NY-marathon.jpg",
  ];

  const { getAllChallenges, joinChallenge, getUserJoinedChallenges } =
    useSolfitProgram();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { isSuccess, data } = getAllChallenges;
  const { data: joinedData } = getUserJoinedChallenges(
    selectedAccount?.publicKey.toBase58(),
  );

  useEffect(() => {
    if (data) {
      setResult(data);
    }
  }, [data]);

  if (isSuccess && !data) {
    // weird bug in tanstack query (old version) - query fetching for first time didnt worked
    queryClient.invalidateQueries({ queryKey: ["get-all-challenges"] });
  }

  function handleSearch() {
    if (!data) return;

    const newData = data.filter((e) =>
      e.account.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    setResult(newData);
  }

  return (
    <>
      {selectedAccount ? (
        <View style={styles.screenContainer}>
          <Searchbar
            placeholder="Search"
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            value={searchQuery}
            onClearIconPress={() => setResult(data)}
            style={{ marginBottom: 16 }}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {result?.map((e, i) => {
              return (
                <Card key={i} style={[styles.card]} mode="elevated">
                  <Card.Cover
                    source={{
                      uri: images[i % 3],
                    }}
                    style={styles.cardCover}
                  />
                  <Card.Content style={styles.cardContent}>
                    <Text variant="titleLarge" style={[styles.challengeName]}>
                      {e.account.name}
                    </Text>
                    <View style={styles.challengeStats}>
                      <Chip icon="calendar-range" style={[styles.chip]}>
                        {e.account.duration} Days
                      </Chip>
                      <Chip icon="walk" style={[styles.chip]}>
                        {e.account.steps.toLocaleString()} Steps/Day
                      </Chip>
                    </View>
                    <View style={styles.challengeStats}>
                      <Chip icon="account-group" style={[styles.chip]}>
                        {e.account.totalParticipants} Participants
                      </Chip>
                      <Chip icon="currency-usd" style={[styles.chip]}>
                        {e.account.pool.toString() / LAMPORTS_PER_SOL} SOL Pool
                      </Chip>
                    </View>
                  </Card.Content>
                  <Card.Actions style={styles.cardActions}>
                    <Button
                      mode="contained"
                      icon="information-outline"
                      style={[styles.joinButton]}
                      onPress={() => {
                        navigation.navigate("ChallengeDetails", {
                          challenge: e.publicKey.toBase58(),
                          name: e.account.name,
                        });
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      mode="contained"
                      icon="run-fast"
                      style={[styles.joinButton]}
                      onPress={() => {
                        console.log("clicked");
                        joinChallenge.mutateAsync(e.publicKey);
                      }}
                      disabled={
                        joinedData?.incomplete
                          .map((x) =>
                            x.participant.account.challenge.toBase58(),
                          )
                          .includes(e.publicKey.toBase58()) ||
                        joinedData?.complete
                          .map((x) =>
                            x.participant.account.challenge.toBase58(),
                          )
                          .includes(e.publicKey.toBase58())
                      }
                    >
                      Register for{" "}
                      {e.account.amount.toString() / LAMPORTS_PER_SOL} SOL
                    </Button>
                  </Card.Actions>
                </Card>
              );
            })}
          </ScrollView>
          <FAB
            variant="secondary"
            icon="plus"
            style={styles.fab}
            onPress={() => navigation.navigate("CreateChallenge")}
          />
        </View>
      ) : (
        <ConnectButton />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontWeight: "bold",
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: "60%",
    opacity: 0.2,
    alignSelf: "center",
  },
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontWeight: "bold",
    margin: 10,
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
    height: 160,
  },
  featuredBadge: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cardContent: {
    paddingTop: 16,
  },
  challengeName: {
    fontWeight: "bold",
    marginBottom: 12,
  },
  challengeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    marginLeft: 6,
  },
  challengeStats: {
    flexDirection: "row",
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
  },
  cardActions: {
    flexDirection: "column",
    justifyContent: "center",
    paddingBottom: 16,
    gap: 10,
  },
  joinButton: {
    flex: 1,
    marginHorizontal: 16,
    width: "100%",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
