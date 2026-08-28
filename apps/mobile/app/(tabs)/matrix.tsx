import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { EisenhowerMatrix } from '../../src/components/EisenhowerMatrix';
import { type TaskItemProps } from '../../src/components/SwipeableTaskItem';

export default function MatrixScreen() {
  const [tasks, setTasks] = useState<TaskItemProps[]>([
    {
      id: '1',
      title: 'Fix urgent authentication bug',
      completed: false,
      priority: 1,
      project: 'Core Backend',
      dueDate: '2026-08-28',
      dueTime: '12:00:00',
      estimatedMinutes: 30,
      tags: ['critical'],
      orderIndex: 'a0',
      onToggleComplete: () => {},
    },
    {
      id: '2',
      title: 'Plan Q4 roadmap & milestones',
      completed: false,
      priority: 2,
      project: 'Strategy',
      dueDate: '2026-08-30',
      dueTime: null,
      estimatedMinutes: 60,
      tags: ['planning'],
      orderIndex: 'a1',
      onToggleComplete: () => {},
    },
    {
      id: '3',
      title: 'Update marketing social banner',
      completed: false,
      priority: 3,
      project: 'Growth',
      dueDate: '2026-08-29',
      dueTime: null,
      estimatedMinutes: 20,
      tags: ['social'],
      orderIndex: 'a2',
      onToggleComplete: () => {},
    },
    {
      id: '4',
      title: 'Archive old email threads',
      completed: false,
      priority: 4,
      project: 'Admin',
      dueDate: null,
      dueTime: null,
      estimatedMinutes: 15,
      tags: ['cleanup'],
      orderIndex: 'a3',
      onToggleComplete: () => {},
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Eisenhower Matrix</Text>
          <Text style={styles.headerSubtitle}>Prioritize by Urgency & Importance</Text>
        </View>

        <EisenhowerMatrix tasks={tasks} onToggleTask={toggleTask} />
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
});
