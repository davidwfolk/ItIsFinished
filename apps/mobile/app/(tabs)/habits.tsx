import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { HabitTrackerCard, type HabitItem } from '../../src/components/HabitTrackerCard';

export default function HabitsScreen() {
  const [habits, setHabits] = useState<HabitItem[]>([
    {
      id: '1',
      title: 'Morning Deep Work Block',
      streakCount: 14,
      completedToday: true,
      history: [true, true, true, true, true, true, true],
      targetCount: 1,
      color: '#3B82F6',
    },
    {
      id: '2',
      title: 'Drink 2.5L Water',
      streakCount: 8,
      completedToday: true,
      history: [true, false, true, true, true, true, true],
      targetCount: 1,
      color: '#06B6D4',
    },
    {
      id: '3',
      title: '30m Workout / Gym',
      streakCount: 5,
      completedToday: false,
      history: [true, true, false, true, true, true, false],
      targetCount: 1,
      color: '#10B981',
    },
    {
      id: '4',
      title: 'Read 15 Pages of Book',
      streakCount: 21,
      completedToday: false,
      history: [true, true, true, true, true, true, false],
      targetCount: 1,
      color: '#A855F7',
    },
  ]);

  const toggleHabit = (id: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === id) {
          const nextCompleted = !h.completedToday;
          const nextHistory = [...h.history];
          nextHistory[nextHistory.length - 1] = nextCompleted;
          return {
            ...h,
            completedToday: nextCompleted,
            streakCount: nextCompleted ? h.streakCount + 1 : Math.max(0, h.streakCount - 1),
            history: nextHistory,
          };
        }
        return h;
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Habit Tracker</Text>
          <Text style={styles.headerSubtitle}>Daily streaks & consistency matrix</Text>
        </View>

        <FlatList
          data={habits}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <HabitTrackerCard habit={item} onToggleToday={toggleHabit} />
          )}
        />
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
  listContent: {
    paddingVertical: 12,
  },
});
