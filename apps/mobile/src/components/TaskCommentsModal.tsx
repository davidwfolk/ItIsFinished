import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface MobileComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface TaskCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
}

export const TaskCommentsModal: React.FC<TaskCommentsModalProps> = ({
  visible,
  onClose,
  taskTitle,
}) => {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<MobileComment[]>([
    {
      id: '1',
      author: 'Sarah Lin',
      content: 'PowerSync stream definitions are tested and verified against PostgreSQL 17.',
      createdAt: '15m ago',
    },
    {
      id: '2',
      author: 'Alex Rivera',
      content: 'Added fractional indexing helpers in @app/core. Reordering is 100% collision-free.',
      createdAt: '5m ago',
    },
  ]);

  const handlePost = () => {
    if (!comment.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newComment: MobileComment = {
      id: String(Date.now()),
      author: 'You',
      content: comment.trim(),
      createdAt: 'Just now',
    };
    setComments([...comments, newComment]);
    setComment('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.keyboardContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#3B82F6" />
              <Text style={styles.headerTitle} numberOfLines={1}>{taskTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <FlatList
            data={comments}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{item.author}</Text>
                  <Text style={styles.commentTime}>{item.createdAt}</Text>
                </View>
                <Text style={styles.commentBody}>{item.content}</Text>
              </View>
            )}
          />

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#71717A"
              value={comment}
              onChangeText={setComment}
            />
            <TouchableOpacity 
              onPress={handlePost} 
              disabled={!comment.trim()}
              style={[styles.sendButton, !comment.trim() && styles.sendButtonDisabled]}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  keyboardContainer: {
    flex: 1,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#18181B',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  commentCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  commentTime: {
    fontSize: 10,
    color: '#71717A',
    fontFamily: 'monospace',
  },
  commentBody: {
    fontSize: 13,
    color: '#E4E4E7',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
    backgroundColor: '#09090B',
  },
  input: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#FAFAFA',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
});
