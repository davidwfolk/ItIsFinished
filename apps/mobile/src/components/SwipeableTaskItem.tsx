import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { formatRecurrenceLabel } from '@app/core';

export interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  priority: 1 | 2 | 3 | 4;
  project: string;
  dueDate: string | null;
  dueTime: string | null;
  estimatedMinutes: number | null;
  tags: string[];
  orderIndex: string;
  recurrenceRule?: string | null;
  onToggleComplete: (id: string) => void;
  onReschedule?: (id: string) => void;
  onPress?: (id: string) => void;
}

export const SwipeableTaskItem: React.FC<TaskItemProps> = ({
  id,
  title,
  completed,
  priority,
  project,
  dueDate,
  dueTime,
  estimatedMinutes,
  tags,
  orderIndex,
  recurrenceRule,
  onToggleComplete,
  onReschedule,
  onPress,
}) => {
  const translateX = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleComplete = () => {
    triggerHaptic();
    onToggleComplete(id);
  };

  const handleReschedule = () => {
    triggerHaptic();
    if (onReschedule) onReschedule(id);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > 100) {
        // Swiped right -> Complete
        runOnJS(handleComplete)();
      } else if (event.translationX < -100) {
        // Swiped left -> Reschedule
        runOnJS(handleReschedule)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const priorityColors = {
    1: '#EF4444', // P1 Red
    2: '#F97316', // P2 Orange
    3: '#3B82F6', // P3 Blue
    4: '#71717A', // P4 Zinc
  };

  return (
    <View style={styles.container}>
      {/* Background action layers */}
      <View style={[styles.backgroundAction, styles.completeAction]}>
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        <Text style={styles.actionText}>Complete</Text>
      </View>
      <View style={[styles.backgroundAction, styles.rescheduleAction]}>
        <Text style={styles.actionText}>Reschedule</Text>
        <Ionicons name="calendar" size={24} color="#F59E0B" />
      </View>

      {/* Foreground gesture card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animatedCardStyle]}>
          <Pressable onPress={() => handleComplete()} style={styles.checkboxContainer}>
            <Ionicons
              name={completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={completed ? '#10B981' : priorityColors[priority]}
            />
          </Pressable>

          <Pressable 
            onPress={() => onPress && onPress(id)}
            style={styles.contentContainer}
          >
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  completed && styles.completedTitle,
                ]}
                numberOfLines={2}
              >
                {title}
              </Text>
              <View style={[styles.priorityBadge, { borderColor: priorityColors[priority] + '40' }]}>
                <Text style={[styles.priorityText, { color: priorityColors[priority] }]}>
                  P{priority}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.projectPill}>
                <Ionicons name="folder-outline" size={12} color="#A1A1AA" />
                <Text style={styles.projectText}>{project}</Text>
              </View>

              {dueDate && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#A1A1AA" />
                  <Text style={styles.metaText}>
                    {dueDate} {dueTime ? dueTime.slice(0, 5) : ''}
                  </Text>
                </View>
              )}

              {recurrenceRule && (
                <View style={[styles.metaItem, styles.recurrencePill]}>
                  <Ionicons name="repeat" size={12} color="#38BDF8" />
                  <Text style={[styles.metaText, { color: '#38BDF8' }]}>
                    {formatRecurrenceLabel(recurrenceRule)}
                  </Text>
                </View>
              )}

              {estimatedMinutes && (
                <View style={styles.metaItem}>
                  <Ionicons name="hourglass-outline" size={12} color="#C084FC" />
                  <Text style={[styles.metaText, { color: '#C084FC' }]}>
                    {estimatedMinutes}m
                  </Text>
                </View>
              )}

              {tags.map((tag) => (
                <Text key={tag} style={styles.tagText}>
                  #{tag}
                </Text>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
    position: 'relative',
  },
  backgroundAction: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completeAction: {
    backgroundColor: '#064E3B',
    justifyContent: 'flex-start',
  },
  rescheduleAction: {
    backgroundColor: '#78350F',
    justifyContent: 'flex-end',
  },
  actionText: {
    color: '#F4F4F5',
    fontWeight: '600',
    fontSize: 13,
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAFA',
    flex: 1,
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#71717A',
  },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#27272A80',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectText: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  tagText: {
    fontSize: 11,
    color: '#93C5FD',
    fontFamily: 'monospace',
  },
  recurrencePill: {
    backgroundColor: '#0284C715',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284C730',
  },
});
