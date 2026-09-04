import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { EisenhowerMatrix } from '../../src/components/EisenhowerMatrix';
import { type TaskItemProps } from '../../src/components/SwipeableTaskItem';
import { usePowerSync, useQuery } from '@powersync/react';
import { useWorkspace } from '../../src/lib/WorkspaceContext';
import { toggleTask as coreToggleTask, type TaskRow } from '@app/core';
import * as Haptics from 'expo-haptics';

export default function MatrixScreen() {
  const powersync = usePowerSync();
  const { activeWorkspaceId } = useWorkspace();

  // ---------------------------------------------------------------------------
  // LIVE REACTIVE TASKS QUERY
  // ---------------------------------------------------------------------------
  const { data: rawTasks = [] } = useQuery<TaskRow & { project_name?: string; project_color?: string }>(
    `SELECT t.*, p.name as project_name, p.color as project_color
     FROM tasks t
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.deleted_at IS NULL AND t.workspace_id = ? AND t.parent_id IS NULL
     ORDER BY t.order_index ASC`,
    [activeWorkspaceId]
  );

  const tasks: TaskItemProps[] = useMemo(() => {
    return rawTasks.map(t => ({
      id: t.id,
      title: t.title,
      completed: !!t.completed_at || t.status === 'done',
      priority: (t.priority || 4) as 1 | 2 | 3 | 4,
      project: t.project_name || 'Inbox',
      dueDate: t.due_date || null,
      dueTime: t.due_time || null,
      estimatedMinutes: t.estimated_minutes || null,
      recurrenceRule: t.recurrence_rule || null,
      tags: [],
      orderIndex: t.order_index,
      onToggleComplete: () => toggleTask(t.id),
    }));
  }, [rawTasks]);

  const activeTaskCount = useMemo(() => {
    return tasks.filter(t => !t.completed).length;
  }, [tasks]);

  const toggleTask = async (id: string) => {
    const target = rawTasks.find(t => t.id === id);
    if (!target || !powersync || !activeWorkspaceId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await coreToggleTask(powersync, activeWorkspaceId, target);
    } catch (err) {
      console.error('Failed to toggle task in matrix:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Eisenhower Matrix</Text>
            <Text style={styles.headerSubtitle}>Prioritize by Urgency & Importance</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeTaskCount} active</Text>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  badge: {
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  badgeText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
