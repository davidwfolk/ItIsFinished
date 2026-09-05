import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface WorkspaceItem {
  id: string;
  name: string;
  is_personal: number;
}

export interface WorkspacePickerModalProps {
  visible: boolean;
  onClose: () => void;
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (name: string, isPersonal: boolean) => Promise<void>;
}

export const WorkspacePickerModal: React.FC<WorkspacePickerModalProps> = ({
  visible,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [isPersonal, setIsPersonal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectWorkspace(id);
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onCreateWorkspace(trimmed, isPersonal);
      setName('');
      setIsCreating(false);
      onClose();
    } catch (err) {
      console.error('Failed to create workspace in mobile modal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.title}>Workspaces</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Creation Form or List */}
          {isCreating ? (
            <View style={styles.createContainer}>
              <Text style={styles.sectionLabel}>Workspace Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Acme Corp, Side Project"
                placeholderTextColor="#71717A"
                autoFocus
              />

              <Text style={styles.sectionLabel}>Workspace Type</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeOption, !isPersonal && styles.typeOptionSelected]}
                  onPress={() => setIsPersonal(false)}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={!isPersonal ? '#3B82F6' : '#71717A'}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      !isPersonal && styles.typeTextSelected,
                    ]}
                  >
                    Team
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeOption, isPersonal && styles.typeOptionSelected]}
                  onPress={() => setIsPersonal(true)}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={isPersonal ? '#3B82F6' : '#71717A'}
                  />
                  <Text
                    style={[
                      styles.typeText,
                      isPersonal && styles.typeTextSelected,
                    ]}
                  >
                    Personal
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.createActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsCreating(false)}
                >
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, !name.trim() && styles.submitBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!name.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <FlatList
                data={workspaces}
                keyExtractor={(item) => item.id}
                style={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item.id === activeWorkspaceId;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.workspaceItem,
                        isSelected && styles.workspaceItemSelected,
                      ]}
                      onPress={() => handleSelect(item.id)}
                    >
                      <View style={styles.workspaceItemLeft}>
                        <View style={styles.workspaceDot}>
                          <Ionicons
                            name={item.is_personal === 1 ? 'person-outline' : 'briefcase-outline'}
                            size={16}
                            color="#93C5FD"
                          />
                        </View>
                        <View>
                          <Text style={styles.workspaceName}>{item.name}</Text>
                          <Text style={styles.workspaceSub}>
                            {item.is_personal === 1 ? 'Personal Workspace' : 'Team Workspace'}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Add Workspace Button */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsCreating(true);
                }}
              >
                <Ionicons name="add" size={18} color="#3B82F6" />
                <Text style={styles.addBtnText}>New Workspace</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    width: '100%',
    maxHeight: 500,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F4F4F5',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#27272A',
  },
  list: {
    marginBottom: 12,
  },
  workspaceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 8,
  },
  workspaceItemSelected: {
    borderColor: 'rgba(59, 130, 246, 0.5)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  workspaceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  workspaceDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceName: {
    color: '#F4F4F5',
    fontSize: 14,
    fontWeight: '600',
  },
  workspaceSub: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  addBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  createContainer: {
    paddingTop: 4,
  },
  sectionLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#09090B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    color: '#F4F4F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#09090B',
  },
  typeOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  typeText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: '#3B82F6',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#27272A',
  },
  cancelBtnText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
