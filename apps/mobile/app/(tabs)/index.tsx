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
import { getOrderIndexBetween, type ParsedTaskInput } from '@app/core';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type CompressedAttachment } from '../../src/lib/imageCompressor';

export default function TodayScreen() {
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [projectPickerVisible, setProjectPickerVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItemProps | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
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
          return {
            ...t,
            ...updates,
            project: matchingProj ? matchingProj.name : t.project,
          };
        }
        return t;
      })
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

          <View style={styles.cloudBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.cloudText}>Local-First</Text>
          </View>
        </View>

        {/* Task List */}
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

        {/* Task Detail Modal */}
        <TaskDetailModal
          visible={detailModalVisible}
          onClose={() => setDetailModalVisible(false)}
          task={selectedTask}
          projects={projects}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
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
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B30',
    borderWidth: 1,
    borderColor: '#05966940',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cloudText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
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
