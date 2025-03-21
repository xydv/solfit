import { StyleSheet } from "react-native";
import { Appbar, Divider, Text, useTheme } from "react-native-paper";
import { TopBarWalletButton, TopBarWalletMenu } from "./top-bar-ui";
import { useNavigation } from "@react-navigation/core";

export function TopBar() {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <>
      <Appbar.Header mode="small" style={styles.topBar}>
        <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
          SolFit
        </Text>
        <TopBarWalletMenu />

        {/* <Appbar.Action
          icon="cog"
          mode="contained"
          onPress={() => {
            navigation.navigate("Settings");
          }}
        /> */}
      </Appbar.Header>
      <Divider style={{ marginTop: 4 }} />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
});
