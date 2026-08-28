import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type TaskItemProps } from './SwipeableTaskItem';

export interface PlanMyDayModalProps {
  visible: boolean;
  onClose: () => void;
  overdueTasks: TaskItemProps[];
  todayTasks: TaskItemProps[];
  onRescheduleTask: (id: string, newDate: string) => void;
  onCompleteTask: (id: string) => void;
}

export const PlanMyDayModal: React.FC<PlanMyDayModalProps> = ({
  visible,
  onClose,
  overdueTasks,
  todayTasks,
  onRescheduleTask,
  onCompleteTask,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFocusIds, setSelectedFocusIds] = useState<string[]>([]);

  const totalMinutes = todayTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const toggleFocusTask = (id: string) => {
    Haptics.selectionAsync();
    if (selectedFocusIds.includes(id)) {
      setSelectedFocusIds(selectedFocusIds.filter(i => i !== id));
    } else {
      if (selectedFocusIds.length < 3) {
        setSelectedFocusIds([...selectedFocusIds, id]);
      }
    }
  };

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep(1);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sunny" size={20} color="#F59E0B" />
            <Text style={styles.headerTitle}>Plan My Day</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#A1A1AA" />
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
        </View>

        {/* STEP 1: Overdue Task Triage */}
        {step === 1 && (
          <View style={styles.content}>
            <Text style={styles.stepHeading}>1. Triage Overdue Tasks</Text>
            <Text style={styles.stepSubtitle}>
              {overdueTasks.length > 0
                ? `You have ${overdueTasks.length} tasks from earlier. What would you like to do?`
                : 'No overdue tasks! You are all caught up.'}
            </Text>

            <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
              {overdueTasks.map(task => (
                <View key={task.id} style={styles.triageCard}>
                  <Text style={styles.triageTitle}>{task.title}</Text>
                  <View style={styles.triageActions}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        onRescheduleTask(task.id, 'today');
                      }}
                      style={styles.actionBtnToday}
                    >
                      <Ionicons name="today-outline" size={14} color="#3B82F6" />
                      <Text style={styles.actionBtnTodayText}>Move to Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        onCompleteTask(task.id);
                      }}
                      style={styles.actionBtnDone}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                      <Text style={styles.actionBtnDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync();
                setStep(2);
              }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Review Today's Capacity</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Workload & Capacity Review */}
        {step === 2 && (
          <View style={styles.content}>
            <Text style={styles.stepHeading}>2. Review Workload Capacity</Text>
            <Text style={styles.stepSubtitle}>
              Check total estimated hours against your daily focus limit.
            </Text>

            <View style={styles.capacityCard}>
              <View style={styles.capacityMetric}>
                <Text style={styles.metricValue}>{todayTasks.length}</Text>
                <Text style={styles.metricLabel}>Tasks Scheduled</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.capacityMetric}>
                <Text style={[styles.metricValue, { color: '#C084FC' }]}>{totalHours} hrs</Text>
                <Text style={styles.metricLabel}>Estimated Work</Text>
              </View>
            </View>

            <Text style={styles.capacityAdvice}>
              {parseFloat(totalHours) > 6 
                ? '⚠️ You have over 6 hours scheduled. Consider delegating or rescheduling low-priority items.'
                : '✅ Realistic workload. You have buffer time for deep work.'}
            </Text>

            <TouchableOpacity 
              onPress={() => {
                Haptics.selectionAsync();
                setStep(3);
              }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Pick Top 3 Focus Tasks</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Top 3 Focus Commitments */}
        {step === 3 && (
          <View style={styles.content}>
            <Text style={styles.stepHeading}>3. Select Top 3 Focus Priorities</Text>
            <Text style={styles.stepSubtitle}>
              Choose up to 3 non-negotiable tasks to accomplish today ({selectedFocusIds.length}/3 selected).
            </Text>

            <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
              {todayTasks.map(task => {
                const isSelected = selectedFocusIds.includes(task.id);
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => toggleFocusTask(task.id)}
                    style={[styles.focusSelectCard, isSelected && styles.focusSelectCardActive]}
                  >
                    <Ionicons 
                      name={isSelected ? "star" : "star-outline"} 
                      size={20} 
                      color={isSelected ? "#F59E0B" : "#71717A"} 
                    />
                    <Text style={[styles.focusSelectTitle, isSelected && { color: '#FAFAFA' }]}>
                      {task.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TouchableOpacity onPress={handleFinish} style={styles.finishButton}>
              <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
              <Text style={styles.finishButtonText}>Lock In & Start Day</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#18181B',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#27272A',
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#27272A',
  },
  stepLineActive: {
    backgroundColor: '#3B82F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  taskList: {
    flex: 1,
    marginBottom: 16,
  },
  triageCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginBottom: 8,
  },
  triageTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAFA',
    marginBottom: 10,
  },
  triageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E3A8A30',
    borderWidth: 1,
    borderColor: '#2563EB50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnTodayText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  actionBtnDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B30',
    borderWidth: 1,
    borderColor: '#05966950',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnDoneText: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
  },
  capacityCard: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    marginVertical: 16,
    alignItems: 'center',
  },
  capacityMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#27272A',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  metricLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
  },
  capacityAdvice: {
    fontSize: 13,
    color: '#A1A1AA',
    backgroundColor: '#18181B',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    marginBottom: 20,
  },
  focusSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginBottom: 8,
  },
  focusSelectCardActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#78350F20',
  },
  focusSelectTitle: {
    fontSize: 14,
    color: '#A1A1AA',
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  finishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
