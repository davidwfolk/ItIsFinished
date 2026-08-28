import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Modal, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity
} from 'react-native';
import { parseQuickAdd, type ParsedTaskInput } from '@app/core';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { pickAndCompressImage, type CompressedAttachment } from '../lib/imageCompressor';

export interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  onAddTask: (parsed: ParsedTaskInput, attachment: CompressedAttachment | null) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  onAddTask,
}) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<CompressedAttachment | null>(null);

  const parsed: ParsedTaskInput = useMemo(() => {
    return parseQuickAdd(text);
  }, [text]);

  const handlePickPhoto = async () => {
    try {
      Haptics.selectionAsync();
      const photo = await pickAndCompressImage(false);
      if (photo) setAttachment(photo);
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleCamera = async () => {
    try {
      Haptics.selectionAsync();
      const photo = await pickAndCompressImage(true);
      if (photo) setAttachment(photo);
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAddTask(parsed, attachment);
    setText('');
    setAttachment(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header handle */}
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={16} color="#60A5FA" />
              <Text style={styles.headerTitle}>NLP Quick Add</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={22} color="#71717A" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="e.g. Finish client pitch tomorrow 3pm for 45m #Work @urgent p1"
            placeholderTextColor="#71717A"
            value={text}
            onChangeText={setText}
            autoFocus
            multiline
          />

          {/* Live NLP Token Pills */}
          {text.trim().length > 0 && (
            <View style={styles.tokensRow}>
              {parsed.dueDate && (
                <View style={styles.tokenPill}>
                  <Ionicons name="calendar-outline" size={12} color="#60A5FA" />
                  <Text style={styles.tokenText}>{parsed.dueDate} {parsed.dueTime || ''}</Text>
                </View>
              )}
              {parsed.estimatedMinutes && (
                <View style={[styles.tokenPill, { backgroundColor: '#581C8740', borderColor: '#7E22CE' }]}>
                  <Ionicons name="hourglass-outline" size={12} color="#C084FC" />
                  <Text style={[styles.tokenText, { color: '#C084FC' }]}>{parsed.estimatedMinutes}m</Text>
                </View>
              )}
              {parsed.projectName && (
                <View style={[styles.tokenPill, { backgroundColor: '#064E3B40', borderColor: '#059669' }]}>
                  <Ionicons name="folder-outline" size={12} color="#34D399" />
                  <Text style={[styles.tokenText, { color: '#34D399' }]}>#{parsed.projectName}</Text>
                </View>
              )}
              {parsed.tags.map(t => (
                <View key={t} style={[styles.tokenPill, { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
                  <Text style={styles.tokenText}>@{t}</Text>
                </View>
              ))}
              <View style={[styles.tokenPill, { borderColor: '#EF4444' }]}>
                <Text style={[styles.tokenText, { color: '#F87171' }]}>P{parsed.priority}</Text>
              </View>
            </View>
          )}

          {/* Attachment Preview Pill */}
          {attachment && (
            <View style={styles.attachmentPreview}>
              <Ionicons name="image" size={14} color="#34D399" />
              <Text style={styles.attachmentText} numberOfLines={1}>
                {attachment.fileName} (Compressed ~{(attachment.fileSizeBytes / 1024).toFixed(0)}KB)
              </Text>
              <TouchableOpacity onPress={() => setAttachment(null)}>
                <Ionicons name="close" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Toolbar & Submit Button */}
          <View style={styles.toolbar}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity onPress={handleCamera} style={styles.iconButton}>
                <Ionicons name="camera-outline" size={20} color="#A1A1AA" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickPhoto} style={styles.iconButton}>
                <Ionicons name="images-outline" size={20} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!text.trim()}
              style={[styles.submitButton, !text.trim() && styles.submitButtonDisabled]}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetContainer: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  input: {
    fontSize: 16,
    color: '#FAFAFA',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  tokensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 10,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#1E3A8A30',
  },
  tokenText: {
    fontSize: 11,
    color: '#93C5FD',
    fontFamily: 'monospace',
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B20',
    borderWidth: 1,
    borderColor: '#05966940',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 8,
  },
  attachmentText: {
    flex: 1,
    fontSize: 11,
    color: '#34D399',
    fontFamily: 'monospace',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#27272A',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.3,
  },
});
