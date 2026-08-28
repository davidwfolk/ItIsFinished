import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export interface HabitItem {
  id: string;
  title: string;
  streakCount: number;
  completedToday: boolean;
  history: boolean[]; // Last 7 days (true = completed, false = missed)
  targetCount: number;
  color: string;
}

export interface HabitCardProps {
  habit: HabitItem;
  onToggleToday: (id: string) => void;
}

export const HabitTrackerCard: React.FC<HabitCardProps> = ({ habit, onToggleToday }) => {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleToday(habit.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleInfo}>
          <Text style={styles.title}>{habit.title}</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#F97316" />
            <Text style={styles.streakText}>{habit.streakCount} day streak</Text>
          </View>
        </View>

        <Pressable 
          onPress={handleToggle}
          style={[styles.checkButton, habit.completedToday && { backgroundColor: habit.color }]}
        >
          <Ionicons 
            name={habit.completedToday ? "checkmark" : "add"} 
            size={18} 
            color={habit.completedToday ? "#FFFFFF" : "#A1A1AA"} 
          />
        </Pressable>
      </View>

      {/* GitHub-style 7-day streak grid */}
      <View style={styles.gridContainer}>
        {habit.history.map((done, index) => (
          <View
            key={index}
            style={[
              styles.gridDot,
              done && { backgroundColor: habit.color },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleInfo: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  streakText: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  checkButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  gridDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#27272A',
  },
});
