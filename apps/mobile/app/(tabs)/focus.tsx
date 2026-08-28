import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { FocusTimer } from '../../src/components/FocusTimer';

export default function FocusScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Focus Engine</Text>
          <Text style={styles.headerSubtitle}>Pomodoro intervals & ambient soundscapes</Text>
        </View>

        <View style={styles.content}>
          <FocusTimer linkedTaskTitle="Deep Work: Finish Architecture Core" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});
