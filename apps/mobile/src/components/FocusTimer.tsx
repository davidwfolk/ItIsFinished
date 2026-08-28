import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TouchableOpacity, 
  Modal, 
  FlatList 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export interface FocusTask {
  id: string;
  title: string;
  project?: string;
}

export interface FocusTimerProps {
  initialTaskId?: string | null;
  initialTaskTitle?: string | null;
  availableTasks?: FocusTask[];
  onSessionComplete?: (session: {
    taskId?: string | null;
    taskTitle?: string;
    durationMinutes: number;
    mode: 'focus' | 'break';
    completedAt: string;
  }) => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  initialTaskId,
  initialTaskTitle,
  availableTasks = [],
  onSessionComplete,
}) => {
  const [selectedTask, setSelectedTask] = useState<FocusTask | null>(
    initialTaskId && initialTaskTitle
      ? { id: initialTaskId, title: initialTaskTitle }
      : availableTasks[0] || null
  );
  const [taskPickerVisible, setTaskPickerVisible] = useState(false);

  // Timer Modes & Durations
  const [mode, setMode] = useState<'focus_25' | 'focus_50' | 'break_5' | 'break_15'>('focus_25');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'whitenoise' | 'cafe'>('none');

  const modeDurations: Record<typeof mode, number> = {
    focus_25: 25 * 60,
    focus_50: 50 * 60,
    break_5: 5 * 60,
    break_15: 15 * 60,
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && secondsLeft === 0) {
      setIsActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const totalMinutes = Math.round(modeDurations[mode] / 60);
      const isFocus = mode.startsWith('focus');

      if (onSessionComplete) {
        onSessionComplete({
          taskId: selectedTask?.id || null,
          taskTitle: selectedTask?.title || 'General Deep Work',
          durationMinutes: totalMinutes,
          mode: isFocus ? 'focus' : 'break',
          completedAt: new Date().toISOString(),
        });
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, mode, selectedTask, onSessionComplete]);

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(false);
    setSecondsLeft(modeDurations[mode]);
  };

  const switchMode = (newMode: typeof mode) => {
    Haptics.selectionAsync();
    setMode(newMode);
    setIsActive(false);
    setSecondsLeft(modeDurations[newMode]);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => switchMode('focus_25')}
          style={[styles.modeTab, mode === 'focus_25' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'focus_25' && styles.activeModeText]}>
            Focus 25m
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchMode('focus_50')}
          style={[styles.modeTab, mode === 'focus_50' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'focus_50' && styles.activeModeText]}>
            Deep 50m
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchMode('break_5')}
          style={[styles.modeTab, mode === 'break_5' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'break_5' && styles.activeModeText]}>
            Break 5m
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchMode('break_15')}
          style={[styles.modeTab, mode === 'break_15' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'break_15' && styles.activeModeText]}>
            Break 15m
          </Text>
        </Pressable>
      </View>

      {/* Linked Active Task (Clickable to switch task) */}
      <TouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          setTaskPickerVisible(true);
        }}
        style={styles.taskCard}
        activeOpacity={0.75}
      >
        <Ionicons name="checkbox-outline" size={16} color="#60A5FA" />
        <Text style={styles.taskTitle} numberOfLines={1}>
          {selectedTask ? selectedTask.title : 'Tap to link a task...'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#71717A" />
      </TouchableOpacity>

      {/* Circular Timer Display */}
      <View style={[
        styles.timerCircle,
        mode.startsWith('break') && styles.breakTimerCircle
      ]}>
        <Text style={styles.timerText}>{timeString}</Text>
        <Text style={[
          styles.statusLabel,
          mode.startsWith('break') && styles.breakStatusLabel
        ]}>
          {isActive ? 'SESSION IN PROGRESS' : 'PAUSED'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={resetTimer} style={styles.secondaryButton}>
          <Ionicons name="refresh" size={20} color="#A1A1AA" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleTimer}
          style={[
            styles.primaryButton,
            isActive ? styles.pauseButton : styles.playButton,
          ]}
        >
          <Ionicons name={isActive ? "pause" : "play"} size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            const sounds: ('none' | 'rain' | 'whitenoise' | 'cafe')[] = [
              'none',
              'rain',
              'whitenoise',
              'cafe',
            ];
            const next = sounds[(sounds.indexOf(ambientSound) + 1) % sounds.length];
            setAmbientSound(next);
          }}
          style={styles.secondaryButton}
        >
          <Ionicons
            name={ambientSound === 'none' ? "volume-mute-outline" : "volume-high"}
            size={20}
            color={ambientSound === 'none' ? "#71717A" : "#60A5FA"}
          />
        </TouchableOpacity>
      </View>

      {ambientSound !== 'none' && (
        <Text style={styles.soundIndicator}>
          Ambient Audio: {ambientSound.toUpperCase()}
        </Text>
      )}

      {/* Task Picker Modal */}
      <Modal
        visible={taskPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTaskPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Task to Focus On</Text>
            <TouchableOpacity onPress={() => setTaskPickerVisible(false)}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={availableTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.taskList}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => {
                  setSelectedTask(null);
                  setTaskPickerVisible(false);
                }}
                style={[
                  styles.taskRow,
                  selectedTask === null && styles.selectedTaskRow,
                ]}
              >
                <Ionicons name="sparkles-outline" size={18} color="#3B82F6" />
                <Text style={styles.taskRowText}>Unlinked General Focus</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedTask(item);
                  setTaskPickerVisible(false);
                }}
                style={[
                  styles.taskRow,
                  selectedTask?.id === item.id && styles.selectedTaskRow,
                ]}
              >
                <View style={styles.taskRowInfo}>
                  <Text style={styles.taskRowText}>{item.title}</Text>
                  {item.project && (
                    <Text style={styles.taskRowProject}>#{item.project}</Text>
                  )}
                </View>
                {selectedTask?.id === item.id && (
                  <Ionicons name="checkmark" size={18} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    alignItems: 'center',
    margin: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeModeTab: {
    backgroundColor: '#3B82F6',
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  activeModeText: {
    color: '#FFFFFF',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272A80',
    borderWidth: 1,
    borderColor: '#3F3F4650',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    maxWidth: '95%',
  },
  taskTitle: {
    fontSize: 13,
    color: '#E4E4E7',
    fontWeight: '500',
    flex: 1,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: '#1E3A8A10',
  },
  breakTimerCircle: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B10',
  },
  timerText: {
    fontSize: 46,
    fontWeight: '700',
    color: '#FAFAFA',
    fontFamily: 'monospace',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 1,
    marginTop: 4,
  },
  breakStatusLabel: {
    color: '#34D399',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 18,
  },
  primaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playButton: {
    backgroundColor: '#2563EB',
  },
  pauseButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIndicator: {
    fontSize: 11,
    color: '#60A5FA',
    marginTop: 14,
    fontFamily: 'monospace',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#09090B',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  taskList: {
    paddingVertical: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  selectedTaskRow: {
    backgroundColor: '#3B82F615',
  },
  taskRowInfo: {
    flex: 1,
  },
  taskRowText: {
    fontSize: 14,
    color: '#FAFAFA',
    fontWeight: '500',
  },
  taskRowProject: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
});

