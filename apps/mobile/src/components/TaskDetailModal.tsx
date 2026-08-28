import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { TaskRow, ProjectRow } from '@app/core';

export interface TaskDetailModalProps {
  visible: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    description?: string | null;
    completed: boolean;
    priority: 1 | 2 | 3 | 4;
    project: string;
    project_id?: string | null;
    dueDate: string | null;
    dueTime: string | null;
    estimatedMinutes: number | null;
    tags: string[];
    orderIndex: string;
  } | null;
  projects: Array<{ id: string; name: string; color?: string | null }>;
  onUpdateTask: (id: string, updates: any) => void;
  onDeleteTask: (id: string) => void;
  onStartFocus?: (taskId: string, taskTitle: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  visible,
  onClose,
  task,
  projects,
  onUpdateTask,
  onDeleteTask,
  onStartFocus,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4);
  const [projectId, setProjectId] = useState<string>('proj-core-arch');
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 4);
      setProjectId(task.project_id || projects[0]?.id || 'proj-core-arch');
      setDueDate(task.dueDate || '');
      setDueTime(task.dueTime ? task.dueTime.slice(0, 5) : '');
      setEstimatedMinutes(task.estimatedMinutes || null);
    }
  }, [task, visible]);

  if (!task) return null;

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      project_id: projectId,
      dueDate: dueDate || null,
      dueTime: dueTime ? dueTime + ':00' : null,
      estimatedMinutes,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDeleteTask(task.id);
            onClose();
          },
        },
      ]
    );
  };

  const priorityColors = {
    1: '#EF4444',
    2: '#F97316',
    3: '#3B82F6',
    4: '#71717A',
  };

  const durationOptions = [15, 30, 45, 60, 90, 120];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={24} color="#A1A1AA" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Task Details</Text>

          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title input */}
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Task Title"
            placeholderTextColor="#52525B"
            multiline
          />

          {/* Priority Row */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {([1, 2, 3, 4] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => {
                      triggerHaptic();
                      setPriority(p);
                    }}
                    style={[
                      styles.priorityButton,
                      isSelected && {
                        borderColor: priorityColors[p],
                        backgroundColor: priorityColors[p] + '20',
                      },
                    ]}
                  >
                    <Ionicons
                      name="flag"
                      size={14}
                      color={isSelected ? priorityColors[p] : '#71717A'}
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        { color: isSelected ? priorityColors[p] : '#71717A' },
                      ]}
                    >
                      P{p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Project Picker Row */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {projects.map((proj) => {
                const isSelected = projectId === proj.id;
                return (
                  <TouchableOpacity
                    key={proj.id}
                    onPress={() => {
                      triggerHaptic();
                      setProjectId(proj.id);
                    }}
                    style={[
                      styles.projectChip,
                      isSelected && styles.selectedProjectChip,
                    ]}
                  >
                    <View
                      style={[
                        styles.projectDot,
                        { backgroundColor: proj.color || '#3B82F6' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.projectChipText,
                        isSelected && styles.selectedProjectChipText,
                      ]}
                    >
                      {proj.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Estimated Duration Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Duration</Text>
            <View style={styles.durationRow}>
              {durationOptions.map((d) => {
                const isSelected = estimatedMinutes === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      triggerHaptic();
                      setEstimatedMinutes(isSelected ? null : d);
                    }}
                    style={[
                      styles.durationChip,
                      isSelected && styles.selectedDurationChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        isSelected && styles.selectedDurationText,
                      ]}
                    >
                      {d}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes / Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes & Description</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details, subtasks, notes..."
              placeholderTextColor="#52525B"
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          {onStartFocus && (
            <TouchableOpacity
              style={styles.focusButton}
              onPress={() => {
                onStartFocus(task.id, task.title);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="timer-outline" size={18} color="#FB923C" />
              <Text style={styles.focusButtonText}>Start Focus</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  iconButton: {
    padding: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    lineHeight: 26,
    marginBottom: 20,
  },
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#18181B',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#18181B',
    marginRight: 8,
  },
  selectedProjectChip: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F620',
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectChipText: {
    fontSize: 13,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  selectedProjectChipText: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#18181B',
  },
  selectedDurationChip: {
    borderColor: '#A855F7',
    backgroundColor: '#A855F720',
  },
  durationText: {
    fontSize: 12,
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  selectedDurationText: {
    color: '#C084FC',
    fontWeight: '700',
  },
  descriptionInput: {
    minHeight: 100,
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    color: '#FAFAFA',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
    backgroundColor: '#09090B',
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C2D1225',
    borderWidth: 1,
    borderColor: '#EA580C50',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  focusButtonText: {
    color: '#FB923C',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

