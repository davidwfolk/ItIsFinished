import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type TaskItemProps } from './SwipeableTaskItem';

export interface WeeklyReviewModalProps {
  visible: boolean;
  onClose: () => void;
  tasks: TaskItemProps[];
  projects: Array<{ id: string; name: string; color?: string | null }>;
  onUpdateTask: (taskId: string, updates: any) => void;
}

export const WeeklyReviewModal: React.FC<WeeklyReviewModalProps> = ({
  visible,
  onClose,
  tasks,
  projects,
  onUpdateTask,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const unscheduledTasks = tasks.filter((t) => !t.dueDate && !t.completed);
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && !t.completed);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNextStep = () => {
    Haptics.selectionAsync();
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
      setCurrentStep(1);
    }
  };

  const handleRescheduleTask = (taskId: string, targetDate: string) => {
    triggerHaptic();
    onUpdateTask(taskId, { dueDate: targetDate });
  };

  const handleCompleteTask = (taskId: string) => {
    triggerHaptic();
    onUpdateTask(taskId, { completed: true });
  };

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextMondayDate = new Date();
  nextMondayDate.setDate(nextMondayDate.getDate() + ((1 + 7 - nextMondayDate.getDay()) % 7 || 7));
  const nextMondayStr = nextMondayDate.toISOString().slice(0, 10);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Top Progress Bar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#A1A1AA" />
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              {[1, 2, 3, 4].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressBarSegment,
                    step <= currentStep && styles.progressBarActive,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.stepIndicator}>Step {currentStep} of 4</Text>
          </View>

          {/* Step 1: Inbox Zero */}
          {currentStep === 1 && (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroSection}>
                <View style={styles.heroIconBg}>
                  <Ionicons name="mail-unread-outline" size={32} color="#3B82F6" />
                </View>
                <Text style={styles.stepTitle}>Clear the Inbox</Text>
                <Text style={styles.stepSubtitle}>
                  Give every unscheduled thought a due date, or check it off if already done.
                </Text>
              </View>

              <View style={styles.cardList}>
                {unscheduledTasks.map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskCardTitle}>{task.title}</Text>
                      <Text style={styles.taskCardProject}>#{task.project}</Text>
                    </View>

                    <View style={styles.quickActionRow}>
                      <TouchableOpacity
                        onPress={() => handleRescheduleTask(task.id, todayStr)}
                        style={styles.quickActionBtn}
                      >
                        <Text style={styles.quickActionText}>Today</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRescheduleTask(task.id, tomorrowStr)}
                        style={styles.quickActionBtn}
                      >
                        <Text style={styles.quickActionText}>Tomorrow</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRescheduleTask(task.id, nextMondayStr)}
                        style={styles.quickActionBtn}
                      >
                        <Text style={styles.quickActionText}>Next Week</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleCompleteTask(task.id)}
                        style={[styles.quickActionBtn, styles.doneActionBtn]}
                      >
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {unscheduledTasks.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Ionicons name="sparkles" size={36} color="#10B981" />
                    <Text style={styles.emptyCardTitle}>Inbox is at Zero!</Text>
                    <Text style={styles.emptyCardSubtitle}>
                      All tasks have dates assigned. Outstanding work.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* Step 2: Clean Up Overdue */}
          {currentStep === 2 && (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroSection}>
                <View style={styles.heroIconBg}>
                  <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                </View>
                <Text style={styles.stepTitle}>Clean Up Overdue Tasks</Text>
                <Text style={styles.stepSubtitle}>
                  Reschedule past-due tasks so your mental slate is 100% clean.
                </Text>
              </View>

              <View style={styles.cardList}>
                {overdueTasks.map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskCardTitle}>{task.title}</Text>
                      <Text style={styles.overdueBadge}>Was due: {task.dueDate}</Text>
                    </View>

                    <View style={styles.quickActionRow}>
                      <TouchableOpacity
                        onPress={() => handleRescheduleTask(task.id, todayStr)}
                        style={styles.quickActionBtn}
                      >
                        <Text style={styles.quickActionText}>Move to Today</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRescheduleTask(task.id, tomorrowStr)}
                        style={styles.quickActionBtn}
                      >
                        <Text style={styles.quickActionText}>Tomorrow</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleCompleteTask(task.id)}
                        style={[styles.quickActionBtn, styles.doneActionBtn]}
                      >
                        <Ionicons name="checkmark" size={14} color="#10B981" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {overdueTasks.length === 0 && (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-done-circle" size={36} color="#10B981" />
                    <Text style={styles.emptyCardTitle}>No Overdue Tasks!</Text>
                    <Text style={styles.emptyCardSubtitle}>
                      You are completely caught up. Zero backlog lag.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* Step 3: Project Pulse */}
          {currentStep === 3 && (
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
              <View style={styles.heroSection}>
                <View style={styles.heroIconBg}>
                  <Ionicons name="pie-chart-outline" size={32} color="#8B5CF6" />
                </View>
                <Text style={styles.stepTitle}>Project Pulse Check</Text>
                <Text style={styles.stepSubtitle}>
                  Review the progress across all active projects.
                </Text>
              </View>

              <View style={styles.cardList}>
                {projects.map((proj) => {
                  const projTasks = tasks.filter((t) => t.project === proj.name);
                  const completed = projTasks.filter((t) => t.completed).length;
                  const total = projTasks.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <View key={proj.id} style={styles.projectCard}>
                      <View style={styles.projectHeaderRow}>
                        <View style={styles.projectLeft}>
                          <View
                            style={[
                              styles.projectColorDot,
                              { backgroundColor: proj.color || '#3B82F6' },
                            ]}
                          />
                          <Text style={styles.projectName}>{proj.name}</Text>
                        </View>
                        <Text style={styles.projectCountText}>
                          {completed}/{total} ({pct}%)
                        </Text>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.projectProgressBarBg}>
                        <View
                          style={[
                            styles.projectProgressBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: proj.color || '#3B82F6',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Step 4: Ready for the Week */}
          {currentStep === 4 && (
            <View style={[styles.stepContent, styles.finalStepContainer]}>
              <View style={styles.celebrationBox}>
                <View style={styles.trophyBg}>
                  <Ionicons name="trophy" size={48} color="#F59E0B" />
                </View>
                <Text style={styles.finalTitle}>Weekly Review Complete!</Text>
                <Text style={styles.finalSubtitle}>
                  Your inbox is cleared, overdue items are rescheduled, and your projects are primed for high execution.
                </Text>

                <View style={styles.statSummaryRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{tasks.filter((t) => t.completed).length}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{tasks.filter((t) => !t.completed).length}</Text>
                    <Text style={styles.statLabel}>Ready Ahead</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNum}>{projects.length}</Text>
                    <Text style={styles.statLabel}>Projects</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Footer Action Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleNextStep}
              style={styles.primaryBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {currentStep === 4 ? 'Finish Review 🎯' : 'Next Step →'}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  closeBtn: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    maxWidth: 160,
    marginHorizontal: 16,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272A',
  },
  progressBarActive: {
    backgroundColor: '#3B82F6',
  },
  stepIndicator: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
    marginBottom: 16,
  },
  heroIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: '85%',
    lineHeight: 18,
  },
  cardList: {
    gap: 10,
    paddingBottom: 24,
  },
  taskCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
  },
  taskInfo: {
    marginBottom: 10,
  },
  taskCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  taskCardProject: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  overdueBadge: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 11,
    color: '#D4D4D8',
    fontWeight: '600',
  },
  doneActionBtn: {
    backgroundColor: '#064E3B40',
    borderWidth: 1,
    borderColor: '#05966950',
    paddingHorizontal: 12,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FAFAFA',
    marginTop: 6,
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    maxWidth: '75%',
  },
  projectCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginBottom: 8,
  },
  projectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  projectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  projectCountText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: 'monospace',
  },
  projectProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27272A',
    overflow: 'hidden',
  },
  projectProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  finalStepContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  trophyBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#78350F20',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  finalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.5,
  },
  finalSubtitle: {
    fontSize: 13,
    color: '#71717A',
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 18,
  },
  statSummaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  statBox: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 80,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  statLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
    backgroundColor: '#09090B',
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

