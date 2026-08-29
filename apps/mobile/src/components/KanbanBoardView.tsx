import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  Alert
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
  onRenameSection?: (sectionId: string, newName: string) => void;
  onReorderSection?: (sectionId: string, direction: 'left' | 'right') => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  sections,
  tasks,
  onTaskPress,
  onMoveTaskToSection,
  onToggleComplete,
  onCreateSection,
  onDeleteSection,
  onRenameSection,
  onReorderSection,
}) => {
  const [newSectionModalVisible, setNewSectionModalVisible] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Selected Column Options Sheet State
  const [selectedColumn, setSelectedColumn] = useState<{ id: string; name: string; index: number } | null>(null);

  // Rename Section Modal State
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);
  const [renameSectionName, setRenameSectionName] = useState('');

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

  const handleOpenColumnOptions = (col: { id: string; name: string }, colIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColumn({ id: col.id, name: col.name, index: colIdx });
  };

  const handleStartRenameFromMenu = () => {
    if (!selectedColumn) return;
    const { id, name } = selectedColumn;
    setSelectedColumn(null);
    setRenameSectionId(id);
    setRenameSectionName(name);
    setRenameModalVisible(true);
  };

  const handleSaveRename = () => {
    if (!renameSectionName.trim() || !renameSectionId || !onRenameSection) return;
    onRenameSection(renameSectionId, renameSectionName.trim());
    setRenameModalVisible(false);
    setRenameSectionId(null);
    setRenameSectionName('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteFromMenu = () => {
    if (!selectedColumn || !onDeleteSection) return;
    const { id, name } = selectedColumn;
    setSelectedColumn(null);

    Alert.alert(
      'Delete Column',
      `Delete column "${name}"? Any tasks inside will be moved to Backlog.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDeleteSection(id);
          },
        },
      ]
    );
  };

  const handleMoveLeftFromMenu = () => {
    if (!selectedColumn || !onReorderSection) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReorderSection(selectedColumn.id, 'left');
    setSelectedColumn(null);
  };

  const handleMoveRightFromMenu = () => {
    if (!selectedColumn || !onReorderSection) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReorderSection(selectedColumn.id, 'right');
    setSelectedColumn(null);
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
        {allColumns.map((col, colIdx) => {
          const colTasks = tasks.filter((t) => {
            if (col.id === '__no_section__') {
              return !t.section_id || t.section_id === '__no_section__';
            }
            return t.section_id === col.id;
          });

          const isCustomSection = col.id !== '__no_section__';

          return (
            <View key={col.id} style={styles.column}>
              {/* Column Header */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!isCustomSection}
                onLongPress={() => isCustomSection && handleOpenColumnOptions(col, colIdx)}
                style={styles.columnHeader}
              >
                <View style={styles.columnTitleRow}>
                  <View style={styles.columnTitleContainer}>
                    <Text style={styles.columnTitle} numberOfLines={1}>
                      {col.name}
                    </Text>
                  </View>
                  
                  <View style={styles.headerRightGroup}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{colTasks.length}</Text>
                    </View>

                    {isCustomSection && (
                      <TouchableOpacity
                        onPress={() => handleOpenColumnOptions(col, colIdx)}
                        style={styles.menuButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#71717A" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

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

                    {/* Card Meta & Actions */}
                    <View style={styles.cardBottomRow}>
                      <View style={styles.cardMetaLeft}>
                        {task.dueDate && (
                          <View style={styles.metaBadge}>
                            <Ionicons name="calendar-outline" size={11} color="#A1A1AA" />
                            <Text style={styles.metaText}>{task.dueDate}</Text>
                          </View>
                        )}

                        {task.recurrenceRule && (
                          <View style={[styles.metaBadge, styles.recurrenceBadge]}>
                            <Ionicons name="repeat-outline" size={11} color="#22D3EE" />
                          </View>
                        )}

                        {task.estimatedMinutes && (
                          <View style={styles.metaBadge}>
                            <Ionicons name="hourglass-outline" size={11} color="#C084FC" />
                            <Text style={[styles.metaText, { color: '#C084FC' }]}>
                              {task.estimatedMinutes}m
                            </Text>
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

      {/* Column Options Bottom Action Sheet Modal */}
      <Modal
        visible={!!selectedColumn}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedColumn(null)}
      >
        <TouchableOpacity 
          style={styles.sheetOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedColumn(null)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Column: {selectedColumn?.name}</Text>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                onPress={handleStartRenameFromMenu}
                style={styles.sheetActionBtn}
              >
                <Ionicons name="pencil-outline" size={18} color="#60A5FA" />
                <Text style={styles.sheetActionText}>Rename Column</Text>
              </TouchableOpacity>

              {onReorderSection && selectedColumn && selectedColumn.index > 1 && (
                <TouchableOpacity
                  onPress={handleMoveLeftFromMenu}
                  style={styles.sheetActionBtn}
                >
                  <Ionicons name="arrow-back-outline" size={18} color="#A1A1AA" />
                  <Text style={styles.sheetActionText}>Move Left</Text>
                </TouchableOpacity>
              )}

              {onReorderSection && selectedColumn && selectedColumn.index < allColumns.length - 1 && (
                <TouchableOpacity
                  onPress={handleMoveRightFromMenu}
                  style={styles.sheetActionBtn}
                >
                  <Ionicons name="arrow-forward-outline" size={18} color="#A1A1AA" />
                  <Text style={styles.sheetActionText}>Move Right</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleDeleteFromMenu}
                style={[styles.sheetActionBtn, styles.deleteActionBtn]}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.sheetActionText, { color: '#EF4444' }]}>Delete Column</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* Rename Section Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Rename Kanban Column</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New column name..."
              placeholderTextColor="#52525B"
              value={renameSectionName}
              onChangeText={setRenameSectionName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setRenameModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRename}
                style={styles.createBtn}
              >
                <Text style={styles.createBtnText}>Save</Text>
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
    gap: 6,
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FAFAFA',
    flexShrink: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#27272A50',
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
  recurrenceBadge: {
    backgroundColor: '#083344',
    borderColor: '#06B6D440',
    borderWidth: 1,
  },
  metaText: {
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
    fontWeight: '800',
    color: '#FFFFFF',
  },
  moveButton: {
    backgroundColor: '#1E3A8A40',
    borderRadius: 6,
    padding: 4,
  },
  emptyColumn: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyColumnText: {
    fontSize: 12,
    color: '#52525B',
    fontStyle: 'italic',
  },
  addSectionColumn: {
    width: COLUMN_WIDTH,
    borderWidth: 2,
    borderColor: '#27272A',
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
    gap: 8,
  },
  addSectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FAFAFA',
    marginBottom: 16,
  },
  sheetActions: {
    gap: 8,
  },
  sheetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#27272A50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  deleteActionBtn: {
    backgroundColor: '#450A0A30',
    borderColor: '#EF444430',
    borderWidth: 1,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    gap: 16,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  modalInput: {
    backgroundColor: '#09090B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 12,
    color: '#FAFAFA',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

