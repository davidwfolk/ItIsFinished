import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { HabitTrackerCard, type HabitItem } from '../../src/components/HabitTrackerCard';
import { usePowerSync, useQuery } from '@powersync/react';
import { useWorkspace } from '../../src/lib/WorkspaceContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#EAB308', // Yellow
];

export default function HabitsScreen() {
  const powersync = usePowerSync();
  const { activeWorkspaceId } = useWorkspace();

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  // ---------------------------------------------------------------------------
  // 7-DAY TIMELINE CALCULATION (LOCAL YYYY-MM-DD)
  // ---------------------------------------------------------------------------
  const past7Days = useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  }, []);

  const todayStr = past7Days[6];

  // ---------------------------------------------------------------------------
  // LIVE SQLITE QUERIES
  // ---------------------------------------------------------------------------
  const { data: rawHabits = [] } = useQuery<{
    id: string;
    title: string;
    color?: string | null;
    target_count?: number | null;
  }>(
    `SELECT * FROM habits WHERE deleted_at IS NULL AND (workspace_id = ? OR workspace_id IS NULL) ORDER BY created_at ASC`,
    [activeWorkspaceId]
  );

  const { data: rawLogs = [] } = useQuery<{
    id: string;
    habit_id: string;
    log_date: string;
    count: number;
  }>(
    `SELECT * FROM habit_logs WHERE (workspace_id = ? OR workspace_id IS NULL)`,
    [activeWorkspaceId]
  );

  // ---------------------------------------------------------------------------
  // STREAK & COMPLETION AGGREGATION
  // ---------------------------------------------------------------------------
  const habitLogsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of rawLogs) {
      if (log.count > 0) {
        if (!map.has(log.habit_id)) {
          map.set(log.habit_id, new Set());
        }
        map.get(log.habit_id)!.add(log.log_date);
      }
    }
    return map;
  }, [rawLogs]);

  const habits: HabitItem[] = useMemo(() => {
    return rawHabits.map(h => {
      const completedDates = habitLogsMap.get(h.id) || new Set<string>();
      
      const history = past7Days.map(d => completedDates.has(d));
      const completedToday = completedDates.has(todayStr);

      // Calculate streak backwards from today (or yesterday if today isn't logged yet)
      let streakCount = 0;
      const checkDate = new Date();
      if (!completedToday) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      while (true) {
        const y = checkDate.getFullYear();
        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        if (completedDates.has(dateKey)) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return {
        id: h.id,
        title: h.title,
        streakCount,
        completedToday,
        history,
        targetCount: h.target_count || 1,
        color: h.color || '#3B82F6',
      };
    });
  }, [rawHabits, habitLogsMap, past7Days, todayStr]);

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------
  const toggleHabit = async (habitId: string) => {
    if (!powersync || !activeWorkspaceId) return;

    const completedDates = habitLogsMap.get(habitId);
    const isCurrentlyCompleted = completedDates?.has(todayStr);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (isCurrentlyCompleted) {
        await powersync.execute(
          `DELETE FROM habit_logs WHERE habit_id = ? AND log_date = ?`,
          [habitId, todayStr]
        );
      } else {
        const newId = Crypto.randomUUID();
        const now = new Date().toISOString();
        await powersync.execute(
          `INSERT INTO habit_logs (id, workspace_id, habit_id, log_date, count, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
          [newId, activeWorkspaceId, habitId, todayStr, now]
        );
      }
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const handleCreateHabit = async () => {
    if (!newTitle.trim() || !powersync || !activeWorkspaceId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newId = Crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `INSERT INTO habits (id, workspace_id, title, color, target_count, frequency_type, is_archived, created_at, updated_at) 
         VALUES (?, ?, ?, ?, 1, 'daily', 0, ?, ?)`,
        [newId, activeWorkspaceId, newTitle.trim(), selectedColor, now, now]
      );
      setNewTitle('');
      setModalVisible(false);
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Habit Tracker</Text>
            <Text style={styles.headerSubtitle}>Daily streaks & consistency matrix</Text>
          </View>
          <TouchableOpacity 
            style={styles.addHeaderBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Habits List */}
        <FlatList
          data={habits}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <HabitTrackerCard habit={item} onToggleToday={toggleHabit} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flame-outline" size={48} color="#3F3F46" />
              <Text style={styles.emptyTitle}>No habits tracked yet</Text>
              <Text style={styles.emptySubtitle}>Tap the + button to build your first daily routine.</Text>
            </View>
          }
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* New Habit Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Habit</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#71717A" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="e.g. Read 15 pages, Drink 2L water"
                placeholderTextColor="#52525B"
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />

              <Text style={styles.sectionLabel}>Accent Color</Text>
              <View style={styles.colorPalette}>
                {PRESET_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedColor(color);
                    }}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorDotSelected
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, !newTitle.trim() && styles.saveBtnDisabled]}
                onPress={handleCreateHabit}
                disabled={!newTitle.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Create Habit</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  addHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#52525B',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  input: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#FAFAFA',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
