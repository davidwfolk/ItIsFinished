import React, { useState, useMemo } from 'react';
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
import { WorkspacePickerModal, type WorkspaceItem } from '../../src/components/WorkspacePickerModal';
import { 
  getOrderIndexBetween, 
  type ParsedTaskInput,
  createTask,
  updateTask,
  deleteTask as coreDeleteTask,
  toggleTask as coreToggleTask,
  createProject,
  deleteProject as coreDeleteProject,
  createSection,
  createWorkspace,
  type TaskRow,
  type ProjectRow,
  type SectionRow
} from '@app/core';
import { usePowerSync, useQuery } from '@powersync/react';
import { useWorkspace } from '../../src/lib/WorkspaceContext';
import { supabase } from '../../src/lib/powersync';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { type CompressedAttachment } from '../../src/lib/imageCompressor';

export default function TodayScreen() {
  const router = useRouter();
  const powersync = usePowerSync();
  const { activeWorkspaceId, switchWorkspace } = useWorkspace();

  const [workspacePickerVisible, setWorkspacePickerVisible] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [weeklyReviewVisible, setWeeklyReviewVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ---------------------------------------------------------------------------
  // LIVE POWERSYNC SQLITE QUERIES
  // ---------------------------------------------------------------------------

  // Live Reactive Workspaces Query
  const { data: rawWorkspaces = [] } = useQuery<WorkspaceItem>(
    `SELECT id, name, is_personal FROM workspaces WHERE deleted_at IS NULL ORDER BY is_personal DESC, name ASC`
  );
  const activeWorkspace = rawWorkspaces.find(w => w.id === activeWorkspaceId);

  const handleCreateWorkspace = async (name: string, isPersonal: boolean) => {
    if (!powersync) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user?.id) return;

    const newId = await createWorkspace(powersync, authData.user.id, {
      name,
      is_personal: isPersonal
    });
    await switchWorkspace(newId);
  };

  // Live Reactive Tasks Query
  const { data: rawTasks = [] } = useQuery<TaskRow & { 
    project_name?: string; 
    project_color?: string;
    assigned_name?: string;
  }>(
    `SELECT t.*, p.name as project_name, p.color as project_color, prof.display_name as assigned_name
     FROM tasks t 
     LEFT JOIN projects p ON t.project_id = p.id 
     LEFT JOIN profiles prof ON t.assigned_to = prof.id
     WHERE t.deleted_at IS NULL AND t.workspace_id = ? AND t.parent_id IS NULL
     ORDER BY t.order_index ASC`,
    [activeWorkspaceId]
  );

  // Live Reactive Projects Query with Task Counts
  const { data: rawProjects = [] } = useQuery<ProjectRow & { task_count: number }>(
    `SELECT p.*, count(t.id) as task_count 
     FROM projects p 
     LEFT JOIN tasks t ON t.project_id = p.id AND t.completed_at IS NULL AND t.deleted_at IS NULL AND t.parent_id IS NULL
     WHERE p.deleted_at IS NULL AND p.workspace_id = ?
     GROUP BY p.id 
     ORDER BY p.order_index ASC, p.created_at ASC`,
    [activeWorkspaceId]
  );

  // Live Reactive Sections Query
  const { data: rawSections = [] } = useQuery<SectionRow>(
    `SELECT * FROM sections WHERE deleted_at IS NULL AND workspace_id = ? ORDER BY order_index ASC`,
    [activeWorkspaceId]
  );

  // Live Reactive Workspace Members Query
  const { data: rawMembers = [] } = useQuery<{ id: string; name: string; email: string; role: string }>(
    `SELECT p.id, p.display_name as name, p.email, wm.role 
     FROM workspace_members wm 
     JOIN profiles p ON p.id = wm.user_id 
     WHERE wm.workspace_id = ?`,
    [activeWorkspaceId]
  );

  // ---------------------------------------------------------------------------
  // MEMOIZED VIEW MODELS
  // ---------------------------------------------------------------------------

  const projects: ProjectItem[] = useMemo(() => {
    return rawProjects.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color || '#3B82F6',
      taskCount: p.task_count || 0,
    }));
  }, [rawProjects]);

  const sections: KanbanSection[] = useMemo(() => {
    if (rawSections.length === 0) {
      return [
        { id: 'sec-todo', name: 'To Do', orderIndex: 'a0' },
        { id: 'sec-inprog', name: 'In Progress', orderIndex: 'a1' },
        { id: 'sec-done', name: 'Done', orderIndex: 'a2' },
      ];
    }
    return rawSections.map(s => ({
      id: s.id,
      name: s.name,
      orderIndex: s.order_index,
    }));
  }, [rawSections]);

  const members: ProjectMember[] = useMemo(() => {
    return rawMembers.map((m, i) => ({
      id: m.id,
      name: m.name || m.email?.split('@')[0] || 'Member',
      email: m.email || '',
      role: (m.role as any) || 'editor',
      color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5],
      isOnline: true,
    }));
  }, [rawMembers]);

  const tasks: (TaskItemProps & { description?: string | null; project_id?: string | null })[] = useMemo(() => {
    return rawTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || null,
      completed: !!t.completed_at || t.status === 'done',
      priority: (t.priority || 4) as 1 | 2 | 3 | 4,
      project: t.project_name || 'Inbox',
      project_id: t.project_id || null,
      dueDate: t.due_date || null,
      dueTime: t.due_time || null,
      estimatedMinutes: t.estimated_minutes || null,
      recurrenceRule: t.recurrence_rule || null,
      recurrence_rule: t.recurrence_rule || null,
      assigned_to: t.assigned_to || null,
      assignedTo: t.assigned_to ? {
        id: t.assigned_to,
        name: t.assigned_name || 'Assignee',
        color: '#3B82F6',
      } : null,
      tags: [],
      orderIndex: t.order_index,
      section_id: t.section_id || null,
      onToggleComplete: () => toggleTask(t.id),
    }));
  }, [rawTasks]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // ---------------------------------------------------------------------------
  // LIVE DATABASE MUTATIONS
  // ---------------------------------------------------------------------------

  const toggleTask = async (id: string) => {
    const target = rawTasks.find(t => t.id === id);
    if (!target || !powersync || !activeWorkspaceId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await coreToggleTask(powersync, activeWorkspaceId, target);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleAddTask = async (parsed: ParsedTaskInput, _attachment: CompressedAttachment | null) => {
    if (!powersync || !activeWorkspaceId) return;

    const lastIndex = rawTasks.length > 0 ? rawTasks[rawTasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);

    const targetProjectId = selectedProjectId || (projects[0]?.id) || '00000000-0000-0000-0000-000000000000';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createTask(powersync, activeWorkspaceId, {
        title: parsed.title,
        project_id: targetProjectId,
        priority: parsed.priority || 4,
        due_date: parsed.dueDate || null,
        due_time: parsed.dueTime || null,
        estimated_minutes: parsed.estimatedMinutes || null,
        recurrence_rule: parsed.recurrenceRule || null,
        order_index: newIndex,
      });
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleUpdateTask = async (id: string, updates: any) => {
    if (!powersync || !activeWorkspaceId) return;
    try {
      await updateTask(powersync, activeWorkspaceId, id, updates);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!powersync || !activeWorkspaceId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await coreDeleteTask(powersync, activeWorkspaceId, id);
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
        setDetailModalVisible(false);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateProject = async (name: string, color: string) => {
    if (!powersync || !activeWorkspaceId) return;
    const newIndex = getOrderIndexBetween(null, null);
    try {
      const newId = await createProject(powersync, activeWorkspaceId, {
        name,
        color,
        order_index: newIndex,
      });
      setSelectedProjectId(newId);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!powersync || !activeWorkspaceId) return;
    try {
      await coreDeleteProject(powersync, activeWorkspaceId, id);
      if (selectedProjectId === id) setSelectedProjectId(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleMoveTaskToSection = async (taskId: string, targetSectionId: string | null) => {
    if (!powersync || !activeWorkspaceId) return;
    try {
      await updateTask(powersync, activeWorkspaceId, taskId, {
        section_id: targetSectionId,
      });
    } catch (err) {
      console.error('Failed to move task to section:', err);
    }
  };

  const handleCreateSection = async (name: string) => {
    if (!powersync || !activeWorkspaceId) return;
    const targetProjId = selectedProjectId || (projects[0]?.id) || '00000000-0000-0000-0000-000000000000';
    const lastIndex = sections.length > 0 ? sections[sections.length - 1].orderIndex : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    try {
      await createSection(powersync, activeWorkspaceId, {
        name,
        project_id: targetProjId,
        order_index: newIndex,
      });
    } catch (err) {
      console.error('Failed to create section:', err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!powersync || !activeWorkspaceId) return;
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE sections SET deleted_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
        [now, now, sectionId, activeWorkspaceId]
      );
    } catch (err) {
      console.error('Failed to delete section:', err);
    }
  };

  const handleRenameSection = async (sectionId: string, newName: string) => {
    if (!powersync || !activeWorkspaceId) return;
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE sections SET name = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
        [newName, now, sectionId, activeWorkspaceId]
      );
    } catch (err) {
      console.error('Failed to rename section:', err);
    }
  };

  const handleReorderSection = async (sectionId: string, direction: 'left' | 'right') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1 || !powersync || !activeWorkspaceId) return;
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const prevOrder = targetIndex > 0 ? sections[targetIndex - 1]?.orderIndex : null;
    const nextOrder = targetIndex < sections.length - 1 ? sections[targetIndex + 1]?.orderIndex : null;
    const newOrderIndex = getOrderIndexBetween(prevOrder, nextOrder);

    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE sections SET order_index = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
        [newOrderIndex, now, sectionId, activeWorkspaceId]
      );
    } catch (err) {
      console.error('Failed to reorder section:', err);
    }
  };

  const handleOpenDetail = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTaskId(id);
    setDetailModalVisible(true);
  };

  const handleInviteMember = (_email: string, _role: 'editor' | 'viewer') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveMember = (_memberId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleChangeRole = (_memberId: string, _newRole: 'editor' | 'viewer') => {
    Haptics.selectionAsync();
  };

  const currentProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const filteredTasks = currentProject ? tasks.filter(t => t.project_id === currentProject.id) : tasks;
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
              {activeWorkspace?.name ? `${activeWorkspace.name} • ` : ''}{activeCount} tasks remaining • 0ms Local SQLite
            </Text>
          </TouchableOpacity>

          {/* Top Right Action Controls */}
          <View style={styles.headerRightActions}>
            {/* Workspace Selector Trigger */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWorkspacePickerVisible(true);
              }}
              style={styles.workspaceBtn}
            >
              <Ionicons name="briefcase-outline" size={16} color="#60A5FA" />
            </TouchableOpacity>

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

        {/* Workspace Picker Modal */}
        <WorkspacePickerModal
          visible={workspacePickerVisible}
          onClose={() => setWorkspacePickerVisible(false)}
          workspaces={rawWorkspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={(id) => switchWorkspace(id)}
          onCreateWorkspace={handleCreateWorkspace}
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
  workspaceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A25',
    borderWidth: 1,
    borderColor: '#3B82F640',
    alignItems: 'center',
    justifyContent: 'center',
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
