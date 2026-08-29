import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type TaskItemProps } from './SwipeableTaskItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);

export interface KanbanSection {
  id: string;
  name: string;
  orderIndex: string;
}

export interface KanbanBoardViewProps {
  sections: KanbanSection[];
  tasks: (TaskItemProps & { section_id?: string | null })[];
  onTaskPress: (taskId: string) => void;
  onMoveTaskToSection: (taskId: string, targetSectionId: string | null) => void;
  onToggleComplete: (taskId: string) => void;
  onCreateSection?: (name: string) => void;
  onDeleteSection?: (sectionId: string) => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  sections,
  tasks,
  onTaskPress,
  onMoveTaskToSection,
  onToggleComplete,
  onCreateSection,
}) => {
  const [newSectionModalVisible, setNewSectionModalVisible] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const priorityColors = {
    1: '#EF4444',
    2: '#F97316',
    3: '#3B82F6',
    4: '#71717A',
  };

  // Ensure there is always a "No Section / Backlog" virtual column if there are unassigned tasks
  const allColumns = [
    { id: '__no_section__', name: 'Backlog / To Do', orderIndex: '0' },
    ...sections,
  ];

  const handleCreateSection = () => {
    if (!newSectionName.trim()) return;
    if (onCreateSection) {
      onCreateSection(newSectionName.trim());
    }
    setNewSectionName('');
    setNewSectionModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsContainer}
        snapToInterval={COLUMN_WIDTH + 14}
        decelerationRate="fast"
      >
        {allColumns.map((col) => {
          const colTasks = tasks.filter((t) => {
            if (col.id === '__no_section__') {
              return !t.section_id || t.section_id === '__no_section__';
            }
            return t.section_id === col.id;
          });

          return (
            <View key={col.id} style={styles.column}>
              {/* Column Header */}
              <View style={styles.columnHeader}>
                <View style={styles.columnTitleRow}>
                  <Text style={styles.columnTitle} numberOfLines={1}>
                    {col.name}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{colTasks.length}</Text>
                  </View>
                </View>
              </View>

              {/* Tasks in this column */}
              <ScrollView style={styles.cardList} showsVerticalScrollIndicator={false}>
                {colTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => onTaskPress(task.id)}
                    style={styles.card}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cardTopRow}>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onToggleComplete(task.id);
                        }}
                        style={styles.checkbox}
                      >
                        <Ionicons
                          name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={task.completed ? '#10B981' : priorityColors[task.priority]}
                        />
                      </TouchableOpacity>

                      <Text
                        style={[
                          styles.cardTitle,
                          task.completed && styles.completedTitle,
                        ]}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>

                      <View
                        style={[
                          styles.priorityPill,
                          { borderColor: priorityColors[task.priority] + '50' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityPillText,
                            { color: priorityColors[task.priority] },
                          ]}
                        >
                          P{task.priority}
                        </Text>
                      </View>
                    </View>

                    {/* Metadata & Next Column Action */}
                    <View style={styles.cardBottomRow}>
                      <View style={styles.cardMetaLeft}>
                        {task.dueDate && (
                          <View style={styles.metaBadge}>
                            <Ionicons name="time-outline" size={11} color="#A1A1AA" />
                            <Text style={styles.metaBadgeText}>{task.dueDate}</Text>
                          </View>
                        )}
                        {task.recurrenceRule && (
                          <View style={styles.metaBadge}>
                            <Ionicons name="repeat" size={11} color="#38BDF8" />
                          </View>
                        )}
                        {task.assignedTo && (
                          <View
                            style={[
                              styles.assigneeDot,
                              { backgroundColor: task.assignedTo.color || '#3B82F6' },
                            ]}
                          >
                            <Text style={styles.assigneeDotText}>
                              {task.assignedTo.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Move to next column quick button */}
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.selectionAsync();
                          const currentIndex = allColumns.findIndex((c) => c.id === col.id);
                          const nextColumn = allColumns[(currentIndex + 1) % allColumns.length];
                          onMoveTaskToSection(
                            task.id,
                            nextColumn.id === '__no_section__' ? null : nextColumn.id
                          );
                        }}
                        style={styles.moveButton}
                      >
                        <Ionicons name="arrow-forward" size={12} color="#60A5FA" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}

                {colTasks.length === 0 && (
                  <View style={styles.emptyColumn}>
                    <Text style={styles.emptyColumnText}>No tasks in this section</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })}

        {/* Add Section Column Button */}
        {onCreateSection && (
          <TouchableOpacity
            onPress={() => setNewSectionModalVisible(true)}
            style={styles.addSectionColumn}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color="#71717A" />
            <Text style={styles.addSectionText}>Add Column</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* New Section Modal */}
      <Modal
        visible={newSectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewSectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>New Kanban Column</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Column name (e.g. In Progress, Review)..."
              placeholderTextColor="#52525B"
              value={newSectionName}
              onChangeText={setNewSectionName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setNewSectionModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateSection}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Create Column</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  columnsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  column: {
    width: COLUMN_WIDTH,
    backgroundColor: '#18181B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 12,
    maxHeight: '96%',
  },
  columnHeader: {
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FAFAFA',
    flex: 1,
  },
  badge: {
    backgroundColor: '#27272A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  cardList: {
    flex: 1,
  },
  card: {
    backgroundColor: '#27272A60',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F4650',
    padding: 10,
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    paddingTop: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FAFAFA',
    flex: 1,
    lineHeight: 18,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#71717A',
  },
  priorityPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: '#18181B',
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#27272A50',
  },
  cardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#18181B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 10,
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  assigneeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeDotText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moveButton: {
    backgroundColor: '#1E3A8A30',
    borderWidth: 1,
    borderColor: '#3B82F640',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  emptyColumn: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyColumnText: {
    fontSize: 12,
    color: '#52525B',
    fontStyle: 'italic',
  },
  addSectionColumn: {
    width: 140,
    backgroundColor: '#18181B40',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#27272A80',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addSectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#09090B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FAFAFA',
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

