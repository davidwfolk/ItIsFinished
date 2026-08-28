import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import { FocusTimer, type FocusTask } from '../../src/components/FocusTimer';
import { Ionicons } from '@expo/vector-icons';

interface CompletedSession {
  id: string;
  taskTitle: string;
  durationMinutes: number;
  mode: 'focus' | 'break';
  completedAt: string;
}

export default function FocusScreen() {
  const [tasks] = useState<FocusTask[]>([
    { id: '1', title: 'Review Supabase RLS security policies', project: 'Core Architecture' },
    { id: '2', title: 'Verify lexicographical string indexing reorders', project: 'Core Architecture' },
    { id: '3', title: 'Test 120 FPS swipe gestures with tactile haptics', project: 'Mobile UX' },
    { id: '4', title: 'Integrate client image compression (~350KB target)', project: 'Media Storage' },
  ]);

  const [sessionLogs, setSessionLogs] = useState<CompletedSession[]>([
    {
      id: 's1',
      taskTitle: 'Review Supabase RLS security policies',
      durationMinutes: 25,
      mode: 'focus',
      completedAt: '10:30 AM',
    },
    {
      id: 's2',
      taskTitle: 'Verify lexicographical string indexing reorders',
      durationMinutes: 25,
      mode: 'focus',
      completedAt: '02:15 PM',
    },
  ]);

  const handleSessionComplete = (session: {
    taskId?: string | null;
    taskTitle?: string;
    durationMinutes: number;
    mode: 'focus' | 'break';
    completedAt: string;
  }) => {
    const newLog: CompletedSession = {
      id: `s-${Date.now()}`,
      taskTitle: session.taskTitle || 'General Deep Work',
      durationMinutes: session.durationMinutes,
      mode: session.mode,
      completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSessionLogs((prev) => [newLog, ...prev]);
  };

  const totalFocusMinutes = sessionLogs
    .filter((s) => s.mode === 'focus')
    .reduce((sum, s) => sum + s.durationMinutes, 0);

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
            <Text style={styles.statText}>{totalFocusMinutes}m Today</Text>
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
            <Text style={styles.historyTitle}>Today's Focus Log</Text>
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
                <Text style={styles.emptyText}>No focus sessions logged yet today.</Text>
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
