import React from 'react';
import { Redirect } from 'expo-router';
import { useWorkspace } from '../src/lib/WorkspaceContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isLoading, isAuthenticated } = useWorkspace();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
