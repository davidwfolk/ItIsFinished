import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { SwipeableTaskItem, type TaskItemProps } from '../../src/components/SwipeableTaskItem';
import { QuickAddModal } from '../../src/components/QuickAddModal';
import { TaskDetailModal } from '../../src/components/TaskDetailModal';
import { ProjectPickerModal, type ProjectItem } from '../../src/components/ProjectPickerModal';
import { ProjectMembersModal, type ProjectMember } from '../../src/components/ProjectMembersModal';
import { KanbanBoardView, type KanbanSection } from '../../src/components/KanbanBoardView';
import { WeeklyReviewModal } from '../../src/components/WeeklyReviewModal';
import { getOrderIndexBetween, calculateNextRecurrence, type ParsedTaskInput } from '@app/core';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { type CompressedAttachment } from '../../src/lib/imageCompressor';

export default function TodayScreen() {
  const router = useRouter();
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [weeklyReviewVisible, setWeeklyReviewVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItemProps | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [members, setMembers] = useState<ProjectMember[]>([
    { id: 'user-alex', name: 'Alex M.', email: 'alex@finished.app', role: 'owner', color: '#3B82F6', isOnline: true },
    { id: 'user-sarah', name: 'Sarah K.', email: 'sarah@finished.app', role: 'editor', color: '#8B5CF6', isOnline: true },
    { id: 'user-david', name: 'David W.', email: 'david@finished.app', role: 'editor', color: '#10B981', isOnline: false },
  ]);

  const [sections, setSections] = useState<KanbanSection[]>([
    { id: 'sec-todo', name: 'To Do', orderIndex: 'a0' },
    { id: 'sec-inprog', name: 'In Progress', orderIndex: 'a1' },
    { id: 'sec-done', name: 'Done', orderIndex: 'a2' },
  ]);

  const [projects, setProjects] = useState<ProjectItem[]>([
    { id: 'proj-core-arch', name: 'Core Architecture', color: '#3B82F6', taskCount: 2 },
    { id: 'proj-mobile-ux', name: 'Mobile UX', color: '#8B5CF6', taskCount: 1 },
    { id: 'proj-media', name: 'Media Storage', color: '#10B981', taskCount: 1 },
  ]);

  const [tasks, setTasks] = useState<TaskItemProps[]>([
    {
      id: '1',
      title: 'Review Supabase RLS security policies',
      completed: true,
      priority: 1,
      project: 'Core Architecture',
      dueDate: '2026-08-28',
      dueTime: '10:00:00',
      estimatedMinutes: 30,
      tags: ['security', 'db'],
      orderIndex: 'a0',
      onToggleComplete: () => {},
    },
    {
      id: '2',
      title: 'Verify lexicographical string indexing reorders',
      completed: true,
      priority: 2,
      project: 'Core Architecture',
      dueDate: '2026-08-28',
      dueTime: '14:00:00',
      estimatedMinutes: 45,
      tags: ['sqlite', 'sync'],
      orderIndex: 'a1',
      onToggleComplete: () => {},
    },
    {
      id: '3',
      title: 'Test 120 FPS swipe gestures with tactile haptics',
      completed: false,
      priority: 1,
      project: 'Mobile UX',
      dueDate: '2026-08-28',
      dueTime: '18:00:00',
      estimatedMinutes: 20,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
      tags: ['gestures', 'haptics'],
      orderIndex: 'a2',
      onToggleComplete: () => {},
    },
    {
      id: '4',
      title: 'Integrate client image compression (~350KB target)',
      completed: false,
      priority: 3,
      project: 'Media Storage',
      dueDate: '2026-08-29',
      dueTime: null,
      estimatedMinutes: 60,
      tags: ['uploads'],
      orderIndex: 'a3',
      onToggleComplete: () => {},
    },
    {
      id: '5',
      title: 'Daily engineering sync and architecture review',
      completed: false,
      priority: 2,
      project: 'Core Architecture',
      dueDate: '2026-08-28',
      dueTime: '09:00:00',
      estimatedMinutes: 15,
      recurrenceRule: 'FREQ=DAILY',
      tags: ['sync', 'daily'],
      orderIndex: 'a4',
      onToggleComplete: () => {},
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      const isNowCompleted = !target.completed;

      // If completing a task that has a recurrence rule, spawn the next occurrence
      if (isNowCompleted && target.recurrenceRule) {
        const nextRecurrence = calculateNextRecurrence(
          target.dueDate,
          target.dueTime,
          target.recurrenceRule
        );

        const nextTask: TaskItemProps = {
          ...target,
          id: `rec-${Date.now()}`,
          completed: false,
          dueDate: nextRecurrence.nextDueDate,
          dueTime: nextRecurrence.nextDueTime,
          orderIndex: getOrderIndexBetween(prev[prev.length - 1]?.orderIndex, null),
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return [
          ...prev.map(t => t.id === id ? { ...t, completed: true } : t),
          nextTask,
        ];
      }

      return prev.map(t => t.id === id ? { ...t, completed: isNowCompleted } : t);
    });
  };

  const handleMoveTaskToSection = (taskId: string, targetSectionId: string | null) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, section_id: targetSectionId } : t))
    );
  };

  const handleCreateSection = (name: string) => {
    const newSec: KanbanSection = {
      id: `sec-${Date.now()}`,
      name,
      orderIndex: getOrderIndexBetween(sections[sections.length - 1]?.orderIndex, null),
    };
    setSections(prev => [...prev, newSec]);
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setTasks(prev =>
      prev.map(t => (t.section_id === sectionId ? { ...t, section_id: null } : t))
    );
  };

  const handleRenameSection = (sectionId: string, newName: string) => {
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, name: newName } : s))
    );
  };

  const handleReorderSection = (sectionId: string, direction: 'left' | 'right') => {
    setSections(prev => {
      const index = prev.findIndex(s => s.id === sectionId);
      if (index === -1) return prev;
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const nextList = [...prev];
      const temp = nextList[index];
      nextList[index] = nextList[targetIndex];
      nextList[targetIndex] = temp;
      return nextList;
    });
  };

  const handleOpenDetail = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = tasks.find(t => t.id === id) || null;
    setSelectedTask(target);
    setDetailModalVisible(true);
  };

  const handleUpdateTask = (id: string, updates: any) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === id) {
          const matchingProj = projects.find(p => p.id === updates.project_id);
          const matchingMember = members.find(m => m.id === updates.assigned_to);
          return {
            ...t,
            ...updates,
            project: matchingProj ? matchingProj.name : t.project,
            assignedTo: updates.assigned_to !== undefined
              ? (matchingMember ? { id: matchingMember.id, name: matchingMember.name, color: matchingMember.color } : null)
              : t.assignedTo,
          };
        }
        return t;
      })
    );
  };

  const handleInviteMember = (email: string, role: 'editor' | 'viewer') => {
    const newMember: ProjectMember = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
      color: '#F59E0B',
      isOnline: false,
    };
    setMembers(prev => [...prev, newMember]);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleChangeRole = (memberId: string, newRole: 'editor' | 'viewer') => {
    setMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleCreateProject = (name: string, color: string) => {
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      name,
      color,
      taskCount: 0,
    };
    setProjects(prev => [...prev, newProj]);
    setSelectedProjectId(newProj.id);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
  };

  const handleAddTask = (parsed: ParsedTaskInput, _attachment: CompressedAttachment | null) => {
    const lastIndex = tasks.length > 0 ? tasks[tasks.length - 1].orderIndex : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);

    const activeProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
    const finalProjectName = parsed.projectName || (activeProject ? activeProject.name : 'Inbox');

    const newTask: TaskItemProps = {
      id: String(Date.now()),
      title: parsed.title,
      completed: false,
      priority: parsed.priority,
      project: finalProjectName,
      dueDate: parsed.dueDate,
      dueTime: parsed.dueTime,
      estimatedMinutes: parsed.estimatedMinutes,
      tags: parsed.tags,
      orderIndex: newIndex,
      onToggleComplete: () => {},
    };

    setTasks(prev => [...prev, newTask]);
  };

  const currentProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const filteredTasks = currentProject ? tasks.filter(t => t.project === currentProject.name) : tasks;
  const activeCount = filteredTasks.filter(t => !t.completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setProjectPickerVisible(true)}
            style={styles.headerTitleContainer}
            activeOpacity={0.7}
          >
            <View style={styles.headerTitleRow}>
              {currentProject && (
                <View style={[styles.projectDot, { backgroundColor: currentProject.color || '#3B82F6' }]} />
              )}
              <Text style={styles.headerTitle}>
                {currentProject ? currentProject.name : "Today's Focus"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#71717A" />
            </View>
            <Text style={styles.headerSubtitle}>
              {activeCount} tasks remaining • 0ms Local SQLite
            </Text>
          </TouchableOpacity>

          {/* Top Right Action Controls */}
          <View style={styles.headerRightActions}>
            {/* Team Collaboration Trigger */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMembersModalVisible(true);
              }}
              style={styles.teamBtn}
            >
              <Ionicons name="people-outline" size={16} color="#60A5FA" />
              <View style={styles.onlineStatusDot} />
            </TouchableOpacity>

            {/* Weekly Review Wizard Trigger */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setWeeklyReviewVisible(true);
              }}
              style={styles.reviewBtn}
            >
              <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
            </TouchableOpacity>

            {/* List / Kanban View Switcher */}
            <View style={styles.viewToggleGroup}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setViewMode('list');
                }}
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'list' && styles.activeViewToggleBtn,
                ]}
              >
                <Ionicons
                  name="list"
                  size={15}
                  color={viewMode === 'list' ? '#FFFFFF' : '#71717A'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setViewMode('board');
                }}
                style={[
                  styles.viewToggleBtn,
                  viewMode === 'board' && styles.activeViewToggleBtn,
                ]}
              >
                <Ionicons
                  name="grid"
                  size={14}
                  color={viewMode === 'board' ? '#FFFFFF' : '#71717A'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content: List or Kanban Board */}
        {viewMode === 'board' ? (
          <KanbanBoardView
            sections={sections}
            tasks={filteredTasks}
            onTaskPress={handleOpenDetail}
            onMoveTaskToSection={handleMoveTaskToSection}
            onToggleComplete={toggleTask}
            onCreateSection={handleCreateSection}
            onDeleteSection={handleDeleteSection}
            onRenameSection={handleRenameSection}
            onReorderSection={handleReorderSection}
          />
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <SwipeableTaskItem
                {...item}
                onToggleComplete={toggleTask}
                onPress={handleOpenDetail}
              />
            )}
          />
        )}

        {/* Floating Quick Add Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setQuickAddVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Quick Add Bottom Sheet Modal */}
        <QuickAddModal
          visible={quickAddVisible}
          onClose={() => setQuickAddVisible(false)}
          onAddTask={handleAddTask}
        />

        {/* Weekly Review Modal */}
        <WeeklyReviewModal
          visible={weeklyReviewVisible}
          onClose={() => setWeeklyReviewVisible(false)}
          tasks={tasks}
          projects={projects}
          onUpdateTask={handleUpdateTask}
        />

        {/* Project Members / Share Modal */}
        <ProjectMembersModal
          visible={membersModalVisible}
          onClose={() => setMembersModalVisible(false)}
          projectName={currentProject ? currentProject.name : "All Projects"}
          members={members}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onChangeRole={handleChangeRole}
        />

        {/* Task Detail Modal */}
        <TaskDetailModal
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          task={selectedTask}
          projects={projects}
          assignees={members}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onStartFocus={(_taskId, _taskTitle) => {
            setDetailModalVisible(false);
            router.push('/(tabs)/focus');
          }}
        />

        {/* Project Picker Modal */}
        <ProjectPickerModal
          visible={projectPickerVisible}
          onClose={() => setProjectPickerVisible(false)}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
        />
      </View>
    </SafeAreaView>
  );
}

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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A25',
    borderWidth: 1,
    borderColor: '#3B82F640',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineStatusDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  reviewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#78350F25',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  viewToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeViewToggleBtn: {
    backgroundColor: '#2563EB',
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
