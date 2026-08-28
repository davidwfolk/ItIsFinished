import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface MobileMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface ProjectMembersModalProps {
  visible: boolean;
  onClose: () => void;
  projectName: string;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  visible,
  onClose,
  projectName,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [members, setMembers] = useState<MobileMember[]>([
    { id: '1', email: 'you@workspace.com', name: 'You (Owner)', role: 'admin' },
    { id: '2', email: 'sarah.dev@company.com', name: 'Sarah Lin', role: 'editor' },
    { id: '3', email: 'alex.design@company.com', name: 'Alex Rivera', role: 'viewer' },
  ]);

  const handleInvite = () => {
    if (!email.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newMember: MobileMember = {
      id: String(Date.now()),
      email: email.trim(),
      name: email.split('@')[0],
      role,
    };
    setMembers([...members, newMember]);
    setEmail('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Project Members</Text>
            <Text style={styles.headerSubtitle}>#{projectName} • Role-Based RLS</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#A1A1AA" />
          </TouchableOpacity>
        </View>

        {/* Invite Bar */}
        <View style={styles.inviteCard}>
          <Text style={styles.sectionHeading}>Invite Team Member</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="colleague@company.com"
              placeholderTextColor="#71717A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={handleInvite} style={styles.inviteButton}>
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionHeading}>Active Collaborators ({members.length})</Text>
          <FlatList
            data={members}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                </View>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#18181B',
  },
  inviteCard: {
    padding: 20,
    backgroundColor: '#18181B',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#09090B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FAFAFA',
  },
  inviteButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#E4E4E7',
    fontWeight: '700',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  memberEmail: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#1E3A8A30',
    borderColor: '#2563EB40',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    color: '#60A5FA',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
