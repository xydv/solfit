import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useColorScheme } from "react-native";
import * as Screens from "../screens";
import { HomeNavigator } from "./HomeNavigator";
import { StatusBar } from "expo-status-bar";
import {
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from "react-native-paper";

// Export the RootStackParamList type
export type RootStackParamList = {
  Home: undefined; // Use "Home" instead of "HomeStack"
  Settings: undefined;
  ChallengeDetails: { challenge: string; name: string };
  CreateChallenge: undefined;
  // 🔥 Your screens go here
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppStack = () => {
  return (
    <Stack.Navigator initialRouteName={"Home"}>
      <Stack.Screen
        name="Home" // Use "Home" instead of "HomeStack"
        component={HomeNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateChallenge"
        component={Screens.CreateChallengeScreen}
        options={{ title: "Create Challenge" }}
      />
      <Stack.Screen
        name="ChallengeDetails"
        component={Screens.ChallengeDetailsScreen}
        options={({ route }) => ({
          title: route.params?.name || "Unknown Challenge",
        })}
      />
      <Stack.Screen name="Settings" component={Screens.SettingsScreen} />
      {/** 🔥 Your screens go here */}
    </Stack.Navigator>
  );
};

export interface NavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer>> {}

export const AppNavigator = (props: NavigationProps) => {
  const colorScheme = useColorScheme();
  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

  const CombinedDefaultTheme = {
    ...MD3LightTheme,
    ...LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      ...LightTheme.colors,
    },
  };
  const CombinedDarkTheme = {
    ...MD3DarkTheme,
    ...DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      ...DarkTheme.colors,
    },
  };

  return (
    <NavigationContainer
      theme={colorScheme === "dark" ? CombinedDarkTheme : CombinedDefaultTheme}
      {...props}
    >
      <StatusBar />
      <AppStack />
    </NavigationContainer>
  );
};
