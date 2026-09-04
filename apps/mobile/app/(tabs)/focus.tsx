import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import { FocusTimer, type FocusTask } from '../../src/components/FocusTimer';
import { usePowerSync, useQuery } from '@powersync/react';
import { useWorkspace } from '../../src/lib/WorkspaceContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';

interface CompletedSession {
  id: string;
  taskTitle: string;
  durationMinutes: number;
  mode: 'focus' | 'break';
  completedAt: string;
}

export default function FocusScreen() {
  const powersync = usePowerSync();
  const { activeWorkspaceId } = useWorkspace();

  // ---------------------------------------------------------------------------
  // LIVE SQLITE QUERIES
  // ---------------------------------------------------------------------------
  const { data: rawTasks = [] } = useQuery<{ id: string; title: string; project?: string }>(
    `SELECT t.id, t.title, p.name as project 
     FROM tasks t 
     LEFT JOIN projects p ON t.project_id = p.id 
     WHERE t.completed_at IS NULL AND t.deleted_at IS NULL AND t.workspace_id = ? 
     ORDER BY t.order_index ASC`,
    [activeWorkspaceId]
  );

  const { data: rawSessions = [] } = useQuery<{
    id: string;
    task_id?: string | null;
    task_title?: string | null;
    duration_minutes: number;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
  }>(
    `SELECT f.*, t.title as task_title 
     FROM focus_sessions f 
     LEFT JOIN tasks t ON f.task_id = t.id 
     WHERE (f.workspace_id = ? OR f.workspace_id IS NULL) 
     ORDER BY f.created_at DESC 
     LIMIT 50`,
    [activeWorkspaceId]
  );

  const tasks: FocusTask[] = useMemo(() => {
    return rawTasks.map(t => ({
      id: t.id,
      title: t.title,
      project: t.project || 'General',
    }));
  }, [rawTasks]);

  const sessionLogs: CompletedSession[] = useMemo(() => {
    return rawSessions.map(s => ({
      id: s.id,
      taskTitle: s.task_title || 'General Deep Work',
      durationMinutes: s.duration_minutes || 25,
      mode: (s.duration_minutes && s.duration_minutes <= 10) ? 'break' : 'focus',
      completedAt: s.completed_at 
        ? new Date(s.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : 'Just now',
    }));
  }, [rawSessions]);

  const handleSessionComplete = async (session: {
    taskId?: string | null;
    taskTitle?: string;
    durationMinutes: number;
    mode: 'focus' | 'break';
    completedAt: string;
  }) => {
    if (!powersync || !activeWorkspaceId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newId = Crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `INSERT INTO focus_sessions (id, workspace_id, task_id, duration_minutes, started_at, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId, activeWorkspaceId, session.taskId || null, session.durationMinutes, now, now, now]
      );
    } catch (err) {
      console.error('Failed to log focus session:', err);
    }
  };

  const totalFocusMinutes = useMemo(() => {
    return sessionLogs
      .filter((s) => s.mode === 'focus')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [sessionLogs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Focus Engine</Text>
            <Text style={styles.headerSubtitle}>Pomodoro intervals & ambient soundscapes</Text>
          </View>

          <View style={styles.statBadge}>
            <Ionicons name="flame" size={14} color="#F97316" />
            <Text style={styles.statText}>{totalFocusMinutes}m Logged</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Main Focus Timer Component */}
          <FocusTimer
            availableTasks={tasks}
            onSessionComplete={handleSessionComplete}
          />

          {/* Today's Focus Session History */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Recent Focus Sessions</Text>
            <View style={styles.historyList}>
              {sessionLogs.map((log) => (
                <View key={log.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Ionicons
                      name={log.mode === 'focus' ? "checkmark-circle" : "cafe"}
                      size={18}
                      color={log.mode === 'focus' ? "#10B981" : "#3B82F6"}
                    />
                    <View>
                      <Text style={styles.historyTaskTitle}>{log.taskTitle}</Text>
                      <Text style={styles.historyTime}>{log.completedAt}</Text>
                    </View>
                  </View>

                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>+{log.durationMinutes}m</Text>
                  </View>
                </View>
              ))}

              {sessionLogs.length === 0 && (
                <Text style={styles.emptyText}>No focus sessions logged yet.</Text>
              )}
            </View>
          </View>
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7C2D1230',
    borderWidth: 1,
    borderColor: '#EA580C40',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statText: {
    fontSize: 12,
    color: '#FB923C',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  content: {
    flex: 1,
  },
  historyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyList: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A50',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyTaskTitle: {
    fontSize: 14,
    color: '#FAFAFA',
    fontWeight: '500',
  },
  historyTime: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  durationBadge: {
    backgroundColor: '#064E3B40',
    borderWidth: 1,
    borderColor: '#05966940',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
