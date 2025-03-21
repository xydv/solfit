import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { useState, useCallback } from "react";
import { Button, Text } from "react-native-paper";
import { alertAndLog } from "../../utils/alertAndLog";
import { useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { View } from "react-native";

export function ConnectButton() {
  const { authorizeSession } = useAuthorization();
  const { connect } = useMobileWallet();
  const [authorizationInProgress, setAuthorizationInProgress] = useState(false);
  const handleConnectPress = useCallback(async () => {
    try {
      if (authorizationInProgress) {
        return;
      }
      setAuthorizationInProgress(true);
      await connect();
    } catch (err: any) {
      alertAndLog(
        "Error during connect",
        err instanceof Error ? err.message : err,
      );
    } finally {
      setAuthorizationInProgress(false);
    }
  }, [authorizationInProgress, authorizeSession]);
  return (
    <View
      style={{
        flex: 1,
        gap: 14,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="bodyLarge">Please Connect Your Wallet</Text>
      <Button
        mode="contained"
        disabled={authorizationInProgress}
        onPress={handleConnectPress}
      >
        Connect
      </Button>
    </View>
  );
}

export function SignInButton() {
  const { authorizeSession } = useAuthorization();
  const { signIn } = useMobileWallet();
  const [signInInProgress, setSignInInProgress] = useState(false);
  const handleConnectPress = useCallback(async () => {
    try {
      if (signInInProgress) {
        return;
      }
      setSignInInProgress(true);
      await signIn({
        domain: "yourdomain.com",
        statement: "Sign into Expo Template App",
        uri: "https://yourdomain.com",
      });
    } catch (err: any) {
      alertAndLog(
        "Error during sign in",
        err instanceof Error ? err.message : err,
      );
    } finally {
      setSignInInProgress(false);
    }
  }, [signInInProgress, authorizeSession]);
  return (
    <Button
      mode="outlined"
      disabled={signInInProgress}
      onPress={handleConnectPress}
      style={{ marginLeft: 4, flex: 1 }}
    >
      Sign in
    </Button>
  );
}
