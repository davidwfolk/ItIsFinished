import 'react-native-get-random-values';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

const GestureRoot = GestureHandlerRootView as any;
import { AppProvider } from '../src/lib/WorkspaceContext';

export default function RootLayout() {
  return (
    <GestureRoot style={styles.container}>
      <StatusBar style="light" />
      <AppProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#09090B' } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AppProvider>
    </GestureRoot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
});
