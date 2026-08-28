import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ProjectItem {
  id: string;
  name: string;
  color?: string | null;
  taskCount?: number;
}

export interface ProjectPickerModalProps {
  visible: boolean;
  onClose: () => void;
  projects: ProjectItem[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: (name: string, color: string) => void;
  onDeleteProject: (id: string) => void;
}

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4',
  '#6366F1', '#F97316', '#EC4899', '#84CC16', '#14B8A6', '#71717A'
];

export const ProjectPickerModal: React.FC<ProjectPickerModalProps> = ({
  visible,
  onClose,
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3B82F6');

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSelect = (id: string | null) => {
    triggerHaptic();
    onSelectProject(id);
    onClose();
  };

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreateProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
    setIsCreating(false);
  };

  const handleDelete = (project: ProjectItem) => {
    Alert.alert(
      'Delete Project',
      `Delete "${project.name}"? Tasks inside will remain in archive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDeleteProject(project.id);
          },
        },
      ]
    );
  };

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
          <Text style={styles.headerTitle}>Projects</Text>
          <TouchableOpacity
            onPress={() => setIsCreating(!isCreating)}
            style={styles.iconButton}
          >
            <Ionicons
              name={isCreating ? "list" : "add"}
              size={24}
              color="#3B82F6"
            />
          </TouchableOpacity>
        </View>

        {isCreating ? (
          /* Create Form */
          <View style={styles.createContainer}>
            <Text style={styles.sectionLabel}>New Project Name</Text>
            <TextInput
              style={styles.input}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="e.g. Marketing, Personal, UX Sprint"
              placeholderTextColor="#52525B"
              autoFocus
            />

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
              Theme Color
            </Text>
            <View style={styles.colorsGrid}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewProjectColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    newProjectColor === c && styles.selectedColorCircle,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreate}
              disabled={!newProjectName.trim()}
            >
              <Text style={styles.createButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Project List */
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <TouchableOpacity
                onPress={() => handleSelect(null)}
                style={[
                  styles.projectRow,
                  selectedProjectId === null && styles.selectedProjectRow,
                ]}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="layers-outline" size={20} color="#3B82F6" />
                  <Text
                    style={[
                      styles.projectName,
                      selectedProjectId === null && styles.selectedProjectText,
                    ]}
                  >
                    All Tasks
                  </Text>
                </View>
                {selectedProjectId === null && (
                  <Ionicons name="checkmark" size={18} color="#3B82F6" />
                )}
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = selectedProjectId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => handleSelect(item.id)}
                  style={[
                    styles.projectRow,
                    isSelected && styles.selectedProjectRow,
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.projectDot,
                        { backgroundColor: item.color || '#3B82F6' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.projectName,
                        isSelected && styles.selectedProjectText,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>

                  <View style={styles.rowRight}>
                    {item.taskCount !== undefined && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{item.taskCount}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={styles.deleteButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#71717A"
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
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
  list: {
    paddingVertical: 12,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  selectedProjectRow: {
    backgroundColor: '#3B82F610',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  projectName: {
    fontSize: 15,
    color: '#FAFAFA',
    fontWeight: '500',
  },
  selectedProjectText: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#27272A',
  },
  countText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  createContainer: {
    padding: 20,
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
  input: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    color: '#FAFAFA',
    fontSize: 15,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  createButton: {
    marginTop: 28,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

