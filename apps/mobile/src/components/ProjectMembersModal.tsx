import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  color?: string;
  isOnline?: boolean;
}

export interface ProjectMembersModalProps {
  visible: boolean;
  onClose: () => void;
  projectName: string;
  members: ProjectMember[];
  onInviteMember: (email: string, role: 'editor' | 'viewer') => void;
  onRemoveMember: (memberId: string) => void;
  onChangeRole: (memberId: string, newRole: 'editor' | 'viewer') => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  visible,
  onClose,
  projectName,
  members,
  onInviteMember,
  onRemoveMember,
  onChangeRole,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [copiedLink, setCopiedLink] = useState(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    triggerHaptic();
    onInviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Invitation Sent', `An invite link has been generated for ${inviteEmail.trim()}.`);
  };

  const handleCopyLink = () => {
    triggerHaptic();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const roleBadges: Record<ProjectMember['role'], { label: string; color: string; bg: string }> = {
    owner: { label: 'Owner', color: '#F59E0B', bg: '#78350F30' },
    editor: { label: 'Can Edit', color: '#3B82F6', bg: '#1E3A8A30' },
    viewer: { label: 'View Only', color: '#71717A', bg: '#27272A' },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Project Members</Text>
              <Text style={styles.subtitle}>#{projectName} • {members.length} collaborators</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Invite Form */}
            <View style={styles.inviteSection}>
              <Text style={styles.sectionHeading}>Invite Collaborator</Text>
              
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="name@company.com or family..."
                  placeholderTextColor="#52525B"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                {/* Role Switcher */}
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic();
                    setInviteRole((prev) => (prev === 'editor' ? 'viewer' : 'editor'));
                  }}
                  style={styles.roleToggleBtn}
                >
                  <Text style={styles.roleToggleText}>
                    {inviteRole === 'editor' ? 'Can Edit' : 'View Only'}
                  </Text>
                  <Ionicons name="swap-vertical" size={12} color="#60A5FA" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionButtonRow}>
                <TouchableOpacity
                  onPress={handleSendInvite}
                  style={styles.sendInviteBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
                  <Text style={styles.sendInviteBtnText}>Send Invite</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCopyLink}
                  style={styles.copyLinkBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={copiedLink ? 'checkmark' : 'link'}
                    size={14}
                    color={copiedLink ? '#10B981' : '#A1A1AA'}
                  />
                  <Text
                    style={[
                      styles.copyLinkBtnText,
                      copiedLink && { color: '#10B981' },
                    ]}
                  >
                    {copiedLink ? 'Link Copied!' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Current Members List */}
            <View style={styles.membersSection}>
              <Text style={styles.sectionHeading}>Current Collaborators</Text>

              <View style={styles.memberList}>
                {members.map((member) => {
                  const initials = member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const badge = roleBadges[member.role];

                  return (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={styles.memberLeft}>
                        {/* Avatar with live presence indicator */}
                        <View style={styles.avatarContainer}>
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: member.color || '#3B82F6' },
                            ]}
                          >
                            <Text style={styles.avatarText}>{initials}</Text>
                          </View>
                          {member.isOnline && <View style={styles.onlineDot} />}
                        </View>

                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberEmail}>{member.email}</Text>
                        </View>
                      </View>

                      {/* Right Role / Remove */}
                      <View style={styles.memberRight}>
                        <TouchableOpacity
                          onPress={() => {
                            if (member.role === 'owner') return;
                            triggerHaptic();
                            onChangeRole(
                              member.id,
                              member.role === 'editor' ? 'viewer' : 'editor'
                            );
                          }}
                          style={[styles.roleBadge, { backgroundColor: badge.bg }]}
                        >
                          <Text style={[styles.roleBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </Text>
                        </TouchableOpacity>

                        {member.role !== 'owner' && (
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                'Remove Member',
                                `Remove ${member.name} from #${projectName}?`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Remove',
                                    style: 'destructive',
                                    onPress: () => onRemoveMember(member.id),
                                  },
                                ]
                              );
                            }}
                            style={styles.removeBtn}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  subtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inviteSection: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 16,
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FAFAFA',
    fontSize: 13,
  },
  roleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'center',
  },
  roleToggleText: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sendInviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 10,
  },
  sendInviteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  copyLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#27272A',
    paddingVertical: 11,
    borderRadius: 10,
  },
  copyLinkBtnText: {
    color: '#D4D4D8',
    fontSize: 13,
    fontWeight: '600',
  },
  membersSection: {
    marginBottom: 30,
  },
  memberList: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A50',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#18181B',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  memberEmail: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
    fontFamily: 'monospace',
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  removeBtn: {
    padding: 6,
  },
});

