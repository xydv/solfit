import React from "react";
import { View, StyleSheet } from "react-native";
import { CommonActions } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BottomNavigation, useTheme } from "react-native-paper";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { TopBar } from "../components/top-bar/top-bar-feature";
import { HomeScreen } from "../screens/HomeScreen";
import BlankScreen from "../screens/BlankScreen";

const Tab = createBottomTabNavigator();

/**
 * This is the main navigator with a bottom tab bar using React Native Paper's BottomNavigation.
 * Each tab is a stack navigator with its own set of screens.
 */
export function HomeNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <TopBar />,
      }}
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          navigationState={state}
          safeAreaInsets={insets}
          onTabPress={({ route, preventDefault }) => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) {
              preventDefault();
            } else {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          }}
          renderIcon={({ route, focused, color }) => {
            const { options } = descriptors[route.key];
            if (options.tabBarIcon) {
              return options.tabBarIcon({ focused, color, size: 24 });
            }
            return null;
          }}
          getLabelText={({ route }) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;
            return label as string; // Ensure the return type is a string
          }}
        />
      )}
    >
      <Tab.Screen
        name="All Challenges"
        component={HomeScreen}
        options={{
          tabBarLabel: "All Challenges",
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcon
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="My Challenges"
        component={BlankScreen}
        options={{
          tabBarLabel: "My Challenges",
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcon
              name={focused ? "application-edit" : "application-edit-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
