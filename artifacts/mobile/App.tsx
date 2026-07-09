import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import ChatScreen from "./src/screens/ChatScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ArsenalScreen from "./src/screens/ArsenalScreen";
import SplashScreen from "./src/screens/SplashScreen";

export type RootStackParamList = {
  Main: undefined;
  Chat: { chatId?: string };
};

export type TabParamList = {
  ChatTab: undefined;
  History: undefined;
  Arsenal: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();
const qc    = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 30_000 } } });

const MR7_THEME = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary:    "#e21227",
    background: "#080808",
    card:       "#0d0d0d",
    text:       "#f0f0f0",
    border:     "#1f1f1f",
    notification: "#e21227",
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   "#e21227",
        tabBarInactiveTintColor: "#666",
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            ChatTab:  focused ? "chatbubble"      : "chatbubble-outline",
            History:  focused ? "time"            : "time-outline",
            Arsenal:  focused ? "shield"          : "shield-outline",
            Settings: focused ? "settings"        : "settings-outline",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ChatTab"  component={ChatScreen}    options={{ title: "Chat" }} />
      <Tab.Screen name="History"  component={HistoryScreen} options={{ title: "History" }} />
      <Tab.Screen name="Arsenal"  component={ArsenalScreen} options={{ title: "Arsenal" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeout(() => setReady(true), 2500);
  }, []);

  if (!ready) return <SplashScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={qc}>
          <StatusBar barStyle="light-content" backgroundColor="#080808" />
          <NavigationContainer theme={MR7_THEME}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={TabNavigator} />
            </Stack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#0d0d0d",
    borderTopColor:  "#1f1f1f",
    borderTopWidth:  1,
    height: 60,
    paddingBottom: 8,
  },
});
