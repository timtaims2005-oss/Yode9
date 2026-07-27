import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Redirect, Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { setAuthTokenGetter } from '@workspace/api-client-react';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'bubble.left.and.bubble.right', selected: 'bubble.left.and.bubble.right.fill' }} />
        <Label>دردشة</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scan">
        <Icon sf={{ default: 'shield.lefthalf.filled', selected: 'shield.lefthalf.filled' }} />
        <Label>فحص</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="status">
        <Icon sf={{ default: 'server.rack', selected: 'server.rack' }} />
        <Label>الحالة</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ecosystem">
        <Icon sf={{ default: 'square.2.layers.3d', selected: 'square.2.layers.3d.fill' }} />
        <Label>المنظومة</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_500Medium',
          marginBottom: isWeb ? 8 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'دردشة',
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={size} />
            ) : (
              <Feather name="message-square" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'فحص',
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="shield.lefthalf.filled" tintColor={color} size={size} />
            ) : (
              <Feather name="crosshair" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'الحالة',
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="server.rack" tintColor={color} size={size} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="ecosystem"
        options={{
          title: 'المنظومة',
          tabBarIcon: ({ color, size }) => <Feather name="layers" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  // Wire Clerk bearer token to the API client for all mobile requests
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  // Wait for Clerk to resolve session before deciding redirect
  if (!isLoaded) return null;

  // Not signed in — redirect to auth flow
  if (!isSignedIn) return <Redirect href={"/(auth)/sign-in" as any} />;

  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
