import { supabase } from '../lib/powersync';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  parseQuickAdd, 
  getOrderIndexBetween, 
  
  formatRecurrenceLabel,
  DEFAULT_SMART_FILTERS, 
  evaluateFilterRule,
  type ParsedTaskInput, 
  type SavedSmartFilter, 
  type TaskRow, 
  type ProjectRow,
  type SectionRow,
  createProject,
  updateProject,
  deleteProject,
  
  createTask,
  
  deleteTask as coreDeleteTask,
  toggleTask as coreToggleTask
} from '@app/core';
import { usePowerSync, useQuery } from '@powersync/react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  Tag, 
  Folder, 
  Plus, 
  Sparkles, 
  Zap, 
  GripVertical,
  Trash2,
  MessageSquare,
  LogIn,
  TrendingUp,
  ListTree,
  Grid,
  Edit2,
  Timer,
  Flame,
  Trophy,
  LayoutGrid,
  List,
  Repeat,
  LogOut,
  Menu,
  Settings,
  Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { CalendarTimeGrid } from '../components/CalendarTimeGrid';
import { AuthModal } from '../components/AuthModal';
import { TaskCommentsDrawer } from '../components/TaskCommentsDrawer';
import { SmartFilterModal } from '../components/SmartFilterModal';
import { SubtaskTree } from '../components/SubtaskTree';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { EisenhowerMatrixView } from '../components/EisenhowerMatrixView';
import { ProjectModal } from '../components/ProjectModal';
import { TaskDetailDrawer } from '../components/TaskDetailDrawer';
import { FocusTimerView } from '../components/FocusTimerView';
import { WeeklyReviewModal } from '../components/WeeklyReviewModal';
import { KanbanBoardView } from '../components/KanbanBoardView';
import { HabitsTrackerView } from '../components/HabitsTrackerView';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { UpgradePromptModal } from '../components/UpgradePromptModal';
import { DowngradeGraceBanner } from '../components/DowngradeGraceBanner';
import { EmergencyWrapUpBanner } from '../components/EmergencyWrapUpBanner';
import { DownsizingWizardModal } from '../components/DownsizingWizardModal';

export interface ViewTask {
  id: string;
  title: string;
  order_index: string;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  priority: 1 | 2 | 3 | 4;
  project: string;
  project_id?: string | null;
  projectName?: string;
  projectColor?: string;
  section_id?: string | null;
  description?: string | null;
  recurrence_rule?: string | null;
  assigned_to?: string | null;
  assignedTo?: { id: string; name: string; color: string; role?: string } | null;
  tags: string[];
  completed: boolean;
  completed_at: string | null;
  hasSubtasks?: boolean;
}




export function Workspace() {
  const navigate = useNavigate();
  const powersync = usePowerSync();
  const { user, signOut, refreshAuth } = useAuth();
  
  // Initialize from session to avoid resetting to default on reload
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    return user?.user_metadata?.active_workspace_id || null;
  });

  // Sync state if user loads later
  useEffect(() => {
    if (!activeWorkspaceId && user?.user_metadata?.active_workspace_id) {
      setActiveWorkspaceId(user.user_metadata.active_workspace_id);
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<'today' | 'all' | 'calendar' | 'matrix' | 'analytics' | 'focus' | 'habits'>('today');
  const [showCompleted, setShowCompleted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const [focusLinkedTaskId, setFocusLinkedTaskId] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);

  // Project & Task Selection State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Modals & Drawers State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedSmartFilter | null>(null);

  const [activeCommentTask, setActiveCommentTask] = useState<ViewTask | null>(null);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);

  const handleSwitchWorkspace = async (id: string) => {
    if (activeWorkspaceId === id) return; // Prevent redundant updates
    setActiveWorkspaceId(id);
    setSelectedProjectId(null);
    setSelectedFilterId(null);
    try {
      if (user?.user_metadata?.active_workspace_id !== id) {
        await supabase.auth.updateUser({
          data: { active_workspace_id: id }
        });
      }
    } catch (e) {
      console.warn('Could not update active_workspace_id in auth metadata:', e);
    }
  };

  // User Entitlement & Tier Governance State
  const [userProfile, setUserProfile] = useState<{
    entitlement_tier: 'free' | 'pro';
    is_early_adopter: boolean;
    is_vip: boolean;
    grandfathered_limits: any;
    vip_custom_perks: any;
  } | null>(null);
  const [tierConfigs, setTierConfigs] = useState<Record<string, any>>({});
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<any[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<any[]>([]);
  const [workspaceMembersList, setWorkspaceMembersList] = useState<any[]>([]);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<{ name: string; desc: string } | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!user) return;
    try {
      const [pRes, tcRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('tier_configurations').select('*'),
      ]);

      if (pRes.data) setUserProfile(pRes.data);
      if (tcRes.data) {
        const map: Record<string, any> = {};
        tcRes.data.forEach((r: any) => { map[r.tier] = r; });
        setTierConfigs(map);
      }
    } catch (err) {
      console.error('Failed to fetch entitlements:', err);
    }
  }, [user]);

  const fetchWorkspaceMeta = useCallback(async () => {
    if (!activeWorkspaceId || !user) return;
    try {
      const [wsRes, allWsRes, projRes, memRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', activeWorkspaceId).single(),
        supabase.from('workspaces').select('id, name').is('deleted_at', null),
        supabase.from('projects').select('id, name, color').eq('workspace_id', activeWorkspaceId).eq('is_archived', false).is('deleted_at', null),
        supabase.from('workspace_members').select('id, user_id, role').eq('workspace_id', activeWorkspaceId),
      ]);

      if (wsRes.data) setWorkspaceData(wsRes.data);
      if (allWsRes.data) setUserWorkspaces(allWsRes.data);
      if (projRes.data) setWorkspaceProjects(projRes.data);
      if (memRes.data) setWorkspaceMembersList(memRes.data);
    } catch (err) {
      console.error('Failed to fetch workspace metadata:', err);
    }
  }, [activeWorkspaceId, user]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  useEffect(() => {
    fetchWorkspaceMeta();
  }, [fetchWorkspaceMeta]);

  const isPro = userProfile?.entitlement_tier === 'pro';
  const effectiveLimits = userProfile?.is_vip
    ? userProfile.vip_custom_perks
    : (userProfile?.is_early_adopter && userProfile?.grandfathered_limits)
    ? userProfile.grandfathered_limits
    : tierConfigs['free'] || {};

  const hasTimeBlocking = isPro || !!effectiveLimits.has_time_blocking;
  const hasEisenhowerMatrix = isPro || !!effectiveLimits.has_eisenhower_matrix;
  const hasFocusEngine = isPro || (effectiveLimits.has_focus_engine ?? true);
  const hasDailyHabits = isPro || (effectiveLimits.has_daily_habits ?? true);
  const hasStats = isPro || (effectiveLimits.has_workspace_aggregate_stats ?? true);

  // Live Reactive SQLite Saved Filters Query (Including deleted ones for tombstones)
  const { data: rawAllSavedFilters = [] } = useQuery<any>(
    `SELECT * FROM saved_filters WHERE workspace_id = ? ORDER BY order_index ASC`, [activeWorkspaceId]
  );

  const smartFilters = useMemo(() => {
    const dbMap = new Map(rawAllSavedFilters.map(f => [f.id, f]));
    
    // 1. Process defaults (override with DB version, or remove if tombstoned)
    const processedDefaults = DEFAULT_SMART_FILTERS.map(df => {
      if (dbMap.has(df.id)) {
        const dbRow = dbMap.get(df.id);
        if (dbRow.deleted_at) return null; // Tombstoned by user
        let parsedRule = dbRow.query_rules;
        try {
          while (typeof parsedRule === 'string') {
            parsedRule = JSON.parse(parsedRule);
          }
        } catch (e) {
          console.error("Failed to parse default rule:", dbRow.query_rules);
        }
        return {
          id: dbRow.id,
          name: dbRow.name,
          color: dbRow.color,
          icon: dbRow.icon,
          rule: parsedRule
        };
      }
      return df;
    }).filter(Boolean) as SavedSmartFilter[];

    // 2. Add purely custom filters (not in defaults, not deleted)
    const customDbFilters = rawAllSavedFilters
      .filter(f => !f.deleted_at && !DEFAULT_SMART_FILTERS.some(df => df.id === f.id))
      .map(f => {
        let parsedRule = f.query_rules;
        try {
          while (typeof parsedRule === 'string') {
            parsedRule = JSON.parse(parsedRule);
          }
        } catch (e) {
          console.error("Failed to parse rule:", f.query_rules);
        }
        return {
          id: f.id,
          name: f.name,
          color: f.color,
          icon: f.icon,
          rule: parsedRule
        };
      });

    return [...processedDefaults, ...customDbFilters];
  }, [rawAllSavedFilters]);

  // Live Reactive SQLite Projects Query with Task Counts
  const { data: rawProjects = [] } = useQuery<ProjectRow & { task_count: number }>(
    `SELECT p.*, count(t.id) as task_count 
     FROM projects p 
     LEFT JOIN tasks t ON t.project_id = p.id AND t.completed_at IS NULL AND t.deleted_at IS NULL AND t.parent_id IS NULL
     WHERE p.deleted_at IS NULL AND p.workspace_id = ?
     GROUP BY p.id 
     ORDER BY p.order_index ASC, p.created_at ASC`, [activeWorkspaceId]
  );

  // Live Reactive SQLite Sections Query
  const { data: rawSections = [] } = useQuery<SectionRow>(
    `SELECT * FROM sections WHERE deleted_at IS NULL AND workspace_id = ? ORDER BY order_index ASC`, [activeWorkspaceId]
  );

  // Live Reactive SQLite Workspace Members Query
  const { data: rawMembers = [] } = useQuery<{ id: string; name: string; role: string }>(
    `SELECT p.id, p.display_name as name, wm.role 
     FROM workspace_members wm 
     JOIN profiles p ON p.id = wm.user_id 
     WHERE wm.workspace_id = ?`,
    [activeWorkspaceId]
  );

  const workspaceMembers = useMemo(() => {
    return rawMembers.map((m, i) => ({
      ...m,
      color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][i % 5] // Assign random deterministic colors
    }));
  }, [rawMembers]);

  // Live Reactive SQLite Tasks Query
  const { data: rawTasks = [] } = useQuery<TaskRow & { project_name?: string; project_color?: string }>(
    `SELECT t.*, p.name as project_name, p.color as project_color 
     FROM tasks t 
     LEFT JOIN projects p ON t.project_id = p.id 
     WHERE t.deleted_at IS NULL AND t.workspace_id = ? AND t.parent_id IS NULL
     ORDER BY t.order_index ASC`, [activeWorkspaceId]
  );

  // Map raw database rows to UI Task models
  const tasks: ViewTask[] = useMemo(() => {
    return rawTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      order_index: t.order_index,
      due_date: t.due_date,
      due_time: t.due_time,
      estimated_minutes: t.estimated_minutes,
      priority: (t.priority || 4) as 1 | 2 | 3 | 4,
      project: t.project_name || 'Inbox',
      project_id: t.project_id,
      projectColor: t.project_color,
      section_id: t.section_id,
      recurrence_rule: t.recurrence_rule,
      assigned_to: t.assigned_to,
      assignedTo: workspaceMembers.find(m => m.id === t.assigned_to) || null,
      tags: [],
      completed: !!t.completed_at || t.status === 'done',
      completed_at: t.completed_at || null,
      hasSubtasks: false,
    }));
  }, [rawTasks, workspaceMembers]);

  // Selected Task for TaskDetailDrawer
  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Selected Project Details
  const selectedProject = useMemo(() => {
    return rawProjects.find(p => p.id === selectedProjectId) || null;
  }, [rawProjects, selectedProjectId]);

  // Filtered Task List based on active selection (Project vs Today vs Filter)
  const displayTasks = useMemo(() => {
    if (selectedFilterId) {
      const filter = smartFilters.find(f => f.id === selectedFilterId);
      if (filter) {
        return tasks.filter(t => evaluateFilterRule(t, filter.rule));
      }
    }
    if (selectedProjectId) {
      return tasks.filter(t => t.project_id === selectedProjectId);
    }
    if (activeTab === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.due_date && t.due_date <= today);
    }
    return tasks;
  }, [tasks, selectedProjectId, activeTab, selectedFilterId, smartFilters]);

  const activeDisplayTasks = useMemo(() => displayTasks.filter(t => !t.completed), [displayTasks]);
  const completedDisplayTasks = useMemo(() => displayTasks.filter(t => t.completed), [displayTasks]);

  // Real-time live NLP extraction as user types
  const parsedPreview: ParsedTaskInput = useMemo(() => {
    return parseQuickAdd(quickAddText);
  }, [quickAddText]);

  const handleSaveProject = async (name: string, color: string, icon: string) => {
    if (!activeWorkspaceId) return;
    try {
      if (editingProject) {
        await updateProject(powersync, activeWorkspaceId, editingProject.id, { name, color, icon });
      } else {
        const newId = await createProject(powersync, activeWorkspaceId, { name, color, icon, order_index: 'a0' });
        setSelectedProjectId(newId);
        setActiveTab('today');
      }
      setEditingProject(null);
    } catch (err) {
      console.error('Failed to save project in SQLite:', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!activeWorkspaceId) return;
    try {
      await deleteProject(powersync, activeWorkspaceId, id);
      if (selectedProjectId === id) setSelectedProjectId(null);
    } catch (err) {
      console.error('Failed to delete project in SQLite:', err);
    }
  };

  const handleSaveFilter = async (filter: SavedSmartFilter) => {
    const now = new Date().toISOString();

    
    try {
      // Check if it exists
      const existing = await powersync.getOptional(`SELECT id FROM saved_filters WHERE id = ?`, [filter.id]);
      
      if (existing) {
        await powersync.execute(
          `UPDATE saved_filters SET name = ?, color = ?, icon = ?, query_rules = ?, updated_at = ?, deleted_at = NULL WHERE id = ?`,
          [filter.name, filter.color, filter.icon, JSON.stringify(filter.rule), now, filter.id]
        );
      } else {
        const lastIndex = rawAllSavedFilters.length > 0 ? rawAllSavedFilters[rawAllSavedFilters.length - 1].order_index : null;
        const newIndex = getOrderIndexBetween(lastIndex, null);
        
        await powersync.execute(
          `INSERT INTO saved_filters (id, workspace_id, name, color, icon, query_rules, order_index, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [filter.id, activeWorkspaceId, filter.name, filter.color, filter.icon, JSON.stringify(filter.rule), newIndex, now, now]
        );
      }
      setSelectedFilterId(filter.id);
      setSelectedProjectId(null);
    } catch (err) {
      console.error('Failed to save smart filter in SQLite:', err);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    const now = new Date().toISOString();

    try {
      const existing = await powersync.getOptional(`SELECT id FROM saved_filters WHERE id = ?`, [id]);
      if (existing) {
        await powersync.execute(`UPDATE saved_filters SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
      } else {
        // Tombstone for default filter
        const lastIndex = rawAllSavedFilters.length > 0 ? rawAllSavedFilters[rawAllSavedFilters.length - 1].order_index : null;
        const newIndex = getOrderIndexBetween(lastIndex, null);
        await powersync.execute(
          `INSERT INTO saved_filters (id, workspace_id, name, query_rules, order_index, deleted_at, created_at, updated_at) 
           VALUES (?, ?, ?, '{}', ?, ?, ?, ?)`, 
          [id, activeWorkspaceId, 'default-tombstone', newIndex, now, now, now]
        );
      }
      if (selectedFilterId === id) setSelectedFilterId(null);
    } catch (err) {
      console.error('Failed to delete smart filter in SQLite:', err);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<TaskRow>) => {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updates as any)[k]);
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `UPDATE tasks SET ${setClauses}, updated_at = ? WHERE id = ?`,
        [...values, now, id]
      );
    } catch (err) {
      console.error('Failed to update task in SQLite:', err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim() || !activeWorkspaceId) return;

    const parsed = parseQuickAdd(quickAddText);
    const lastIndex = tasks.length > 0 ? tasks[tasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);

    const projectName = parsed.projectName || 'Inbox';
    let targetProjectId = null;

    try {
      // Find or auto-create project
      if (projectName !== 'Inbox') {
        const existing = await powersync.getOptional<{ id: string }>(
          `SELECT id FROM projects WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
          [projectName]
        );

        if (existing?.id) {
          targetProjectId = existing.id;
        } else {
          targetProjectId = await createProject(powersync, activeWorkspaceId, {
            name: projectName,
            color: '#3B82F6',
            order_index: 'a0'
          });
        }
      }

      await createTask(powersync, activeWorkspaceId, {
        title: parsed.title,
        project_id: targetProjectId as string,
        priority: parsed.priority || 4,
        due_date: parsed.dueDate || null,
        due_time: parsed.dueTime || null,
        estimated_minutes: parsed.estimatedMinutes || null,
        order_index: newIndex
      });
      setQuickAddText('');
    } catch (err) {
      console.error('Failed to insert task into SQLite:', err);
    }
  };

  const toggleTask = async (id: string) => {
    if (!activeWorkspaceId) return;
    const task = rawTasks.find(t => t.id === id);
    if (!task) return;
    try {
      await coreToggleTask(powersync, activeWorkspaceId, task);
    } catch (err) {
      console.error('Failed to toggle task in SQLite:', err);
    }
  };

  const handleMoveTaskToSection = async (taskId: string, sectionId: string | null) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(`UPDATE tasks SET section_id = ?, updated_at = ? WHERE id = ?`, [sectionId, now, taskId]);
    } catch (err) {
      console.error('Failed to move task to section in SQLite:', err);
    }
  };

  const handleCreateTaskInSection = async (title: string, sectionId: string | null) => {
    const lastIndex = tasks.length > 0 ? tasks[tasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    try {
      await powersync.execute(
        `INSERT INTO tasks (id, workspace_id, project_id, section_id, title, priority, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, activeWorkspaceId, selectedProjectId || '00000000-0000-0000-0000-000000000000', sectionId, title, 4, newIndex, 'todo', now, now]
      );
    } catch (err) {
      console.error('Failed to insert section task in SQLite:', err);
    }
  };

  const handleCreateSection = async (name: string) => {
    const lastIndex = rawSections.length > 0 ? rawSections[rawSections.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    try {
      await powersync.execute(
        `INSERT INTO sections (id, workspace_id, project_id, name, order_index, is_collapsed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, activeWorkspaceId, selectedProjectId || '00000000-0000-0000-0000-000000000000', name, newIndex, 0, now, now]
      );
    } catch (err) {
      console.error('Failed to create section in SQLite:', err);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const now = new Date().toISOString();
    try {
      // Reassign all tasks in this section to Backlog (section_id = null)
      await powersync.execute(`UPDATE tasks SET section_id = NULL, updated_at = ? WHERE section_id = ?`, [now, sectionId]);
      // Soft delete section
      await powersync.execute(`UPDATE sections SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, sectionId]);
    } catch (err) {
      console.error('Failed to delete section in SQLite:', err);
    }
  };

  const handleRenameSection = async (sectionId: string, newName: string) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(`UPDATE sections SET name = ?, updated_at = ? WHERE id = ?`, [newName, now, sectionId]);
    } catch (err) {
      console.error('Failed to rename section in SQLite:', err);
    }
  };

  const handleReorderSection = async (sourceId: string, targetId: string) => {
    const sourceIndex = rawSections.findIndex(s => s.id === sourceId);
    const targetIndex = rawSections.findIndex(s => s.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    let newOrder: string;
    if (sourceIndex < targetIndex) {
      // Moving right: insert after target
      const prevOrder = rawSections[targetIndex].order_index;
      const nextOrder = targetIndex === rawSections.length - 1 ? null : rawSections[targetIndex + 1].order_index;
      newOrder = getOrderIndexBetween(prevOrder, nextOrder);
    } else {
      // Moving left: insert before target
      const prevOrder = targetIndex === 0 ? null : rawSections[targetIndex - 1].order_index;
      const nextOrder = rawSections[targetIndex].order_index;
      newOrder = getOrderIndexBetween(prevOrder, nextOrder);
    }

    const now = new Date().toISOString();
    try {
      await powersync.execute(`UPDATE sections SET order_index = ?, updated_at = ? WHERE id = ?`, [newOrder, now, sourceId]);
    } catch (err) {
      console.error('Failed to reorder section in SQLite:', err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!activeWorkspaceId) return;
    try {
      await coreDeleteTask(powersync, activeWorkspaceId, id);
    } catch (err) {
      console.error('Failed to soft delete task in SQLite:', err);
    }
  };

  const updateTaskPriority = async (id: string, newPriority: 1 | 2 | 3 | 4) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET priority = ?, updated_at = ? WHERE id = ?`,
        [newPriority, now, id]
      );
    } catch (err) {
      console.error('Failed to update task priority in SQLite:', err);
    }
  };

  const addTaskToQuadrant = async (priority: 1 | 2 | 3 | 4, title: string) => {
    const lastIndex = tasks.length > 0 ? tasks[tasks.length - 1].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const now = new Date().toISOString();

    try {
      await powersync.execute(
        `INSERT INTO tasks (id, workspace_id, project_id, title, priority, due_date, order_index, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          activeWorkspaceId,
          '00000000-0000-0000-0000-000000000000',
          title,
          priority,
          now.slice(0, 10),
          newIndex,
          'todo',
          now,
          now
        ]
      );
    } catch (err) {
      console.error('Failed to add quadrant task to SQLite:', err);
    }
  };

  // Drag-and-Drop Reordering using Fractional Lexicographical Indexing
  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTask = async (targetTaskId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const currentIdx = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex(t => t.id === targetTaskId);
    if (currentIdx === -1 || targetIdx === -1) return;

    let newOrderIndex: string;
    if (targetIdx === 0) {
      newOrderIndex = getOrderIndexBetween(null, tasks[0].order_index);
    } else if (targetIdx === tasks.length - 1) {
      newOrderIndex = getOrderIndexBetween(tasks[tasks.length - 1].order_index, null);
    } else {
      const prev = targetIdx > currentIdx ? tasks[targetIdx].order_index : tasks[targetIdx - 1].order_index;
      const next = targetIdx > currentIdx ? tasks[targetIdx + 1]?.order_index : tasks[targetIdx].order_index;
      newOrderIndex = getOrderIndexBetween(prev, next);
    }

    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE tasks SET order_index = ?, updated_at = ? WHERE id = ?`,
        [newOrderIndex, now, draggedTaskId]
      );
    } catch (err) {
      console.error('Failed to reorder task in SQLite:', err);
    }
    setDraggedTaskId(null);
  };

  const priorityColors = {
    1: 'text-red-400 border-red-500/30 bg-red-500/10',
    2: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    3: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    4: 'text-zinc-400 border-zinc-700 bg-zinc-800/40',
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 antialiased overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-800/80 bg-zinc-950 md:bg-zinc-900/40 flex flex-col p-4 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Workspace Switcher */}
        <div className="flex flex-col gap-3 px-2 py-3 mb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
                F
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-tight text-zinc-100">It Is Finished</h1>
              </div>
            </div>

            {!user && (
              <button
                onClick={() => setAuthModalOpen(true)}
                title="Sign In / Register"
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {user && (
            <WorkspaceSwitcher 
              activeWorkspaceId={activeWorkspaceId} 
              onSwitch={handleSwitchWorkspace} 
              isPro={isPro}
              maxWorkspaces={isPro ? (tierConfigs['pro']?.max_workspaces ?? 3) : (effectiveLimits?.max_workspaces ?? 1)}
              onOpenUpgrade={() => {
                setUpgradeModalFeature({
                  name: 'Multiple Workspaces',
                  desc: 'Free accounts include 1 workspace. Upgrade to Pro to create and manage up to 3 separate workspaces for work, personal, and side projects.',
                });
              }}
            />
          )}
        </div>


        <nav className="space-y-1 flex-1 text-sm font-medium overflow-y-auto pr-1">
          <button
            onClick={() => { setActiveTab('today'); setSelectedProjectId(null); setSelectedFilterId(null); }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              activeTab === 'today' && !selectedProjectId && !selectedFilterId
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Today
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
              {tasks.filter(t => !t.completed && t.due_date && t.due_date <= new Date().toISOString().split('T')[0]).length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('all'); setSelectedProjectId(null); setSelectedFilterId(null); }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              activeTab === 'all' && !selectedProjectId && !selectedFilterId
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Inbox
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {tasks.filter(t => !t.completed).length}
            </span>
          </button>

          <button
            onClick={() => {
              if (!hasTimeBlocking) {
                setUpgradeModalFeature({
                  name: 'Time-Blocking (Calendar Grid)',
                  desc: 'Visually schedule tasks, drag time-blocks, and prevent over-commitment with the calendar grid.',
                });
                return;
              }
              setActiveTab('calendar');
              setSelectedProjectId(null);
              setSelectedFilterId(null);
            }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              !hasTimeBlocking
                ? 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                : activeTab === 'calendar'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Time-Blocking
            </span>
            {!hasTimeBlocking ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 flex items-center gap-1 border border-zinc-800">
                <Lock className="h-2.5 w-2.5" /> PRO
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                Grid
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!hasEisenhowerMatrix) {
                setUpgradeModalFeature({
                  name: 'Eisenhower Matrix',
                  desc: 'Prioritize tasks by urgency and importance in a dynamic 2×2 decision matrix.',
                });
                return;
              }
              setActiveTab('matrix');
              setSelectedProjectId(null);
              setSelectedFilterId(null);
            }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              !hasEisenhowerMatrix
                ? 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                : activeTab === 'matrix'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Grid className="h-4 w-4" /> Eisenhower Matrix
            </span>
            {!hasEisenhowerMatrix ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 flex items-center gap-1 border border-zinc-800">
                <Lock className="h-2.5 w-2.5" /> PRO
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                2×2
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!hasFocusEngine) {
                setUpgradeModalFeature({
                  name: 'Focus Engine',
                  desc: 'Stay in flow with the built-in Pomodoro timer and focus analytics.',
                });
                return;
              }
              setActiveTab('focus');
              setSelectedProjectId(null);
              setSelectedFilterId(null);
            }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              !hasFocusEngine
                ? 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                : activeTab === 'focus'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4" /> Focus Engine
            </span>
            {!hasFocusEngine ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 flex items-center gap-1 border border-zinc-800">
                <Lock className="h-2.5 w-2.5" /> PRO
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                25m
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!hasDailyHabits) {
                setUpgradeModalFeature({
                  name: 'Daily Habits Tracker',
                  desc: 'Build consistency with daily habit streaks and streak flame counters.',
                });
                return;
              }
              setActiveTab('habits');
              setSelectedProjectId(null);
              setSelectedFilterId(null);
            }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              !hasDailyHabits
                ? 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                : activeTab === 'habits'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" /> Daily Habits
            </span>
            {!hasDailyHabits && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 flex items-center gap-1 border border-zinc-800">
                <Lock className="h-2.5 w-2.5" /> PRO
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!hasStats) {
                setUpgradeModalFeature({
                  name: 'Productivity Stats',
                  desc: 'Analyze completion trends, weekly velocity, and team workload distribution.',
                });
                return;
              }
              setActiveTab('analytics');
              setSelectedProjectId(null);
              setSelectedFilterId(null);
            }}
            className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between transition ${
              !hasStats
                ? 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                : activeTab === 'analytics'
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Productivity Stats
            </span>
            {!hasStats && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 flex items-center gap-1 border border-zinc-800">
                <Lock className="h-2.5 w-2.5" /> PRO
              </span>
            )}
          </button>





          {/* Projects Section */}
          <div className="pt-4 pb-1">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              <span>Projects</span>
              <button
                onClick={() => {
                  const activeProjCount = rawProjects.filter(p => !p.deleted_at).length;
                  const maxAllowedProjects = effectiveLimits?.max_projects_per_workspace ?? 1;
                  if (!isPro && maxAllowedProjects !== -1 && activeProjCount >= maxAllowedProjects) {
                    setUpgradeModalFeature({
                      name: 'Unlimited Projects',
                      desc: `You have reached the Free plan limit of ${maxAllowedProjects} project. Upgrade to Pro to create unlimited projects.`,
                    });
                    return;
                  }
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                title="Create Project"
                className="hover:text-blue-400 p-0.5 rounded hover:bg-zinc-800 transition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-0.5 mt-1.5">
              {rawProjects.map(project => (
                <div
                  key={project.id}
                  className={`group w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                    selectedProjectId === project.id
                      ? 'bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/20'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                  }`}
                >
                  <div
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setSelectedFilterId(null);
                      setActiveTab('today');
                    }}
                    className="flex items-center gap-2 truncate flex-1 min-w-0"
                  >
                    <span style={{ backgroundColor: project.color || '#3B82F6' }} className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" />
                    <span className="truncate">{project.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-semibold">
                      {project.task_count || 0}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject(project);
                        setProjectModalOpen(true);
                      }}
                      title="Edit Project"
                      className="opacity-50 group-hover:opacity-100 hover:text-blue-400 p-0.5 transition"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {rawProjects.length === 0 && (
                <div className="px-2 py-2 text-xs text-zinc-500 italic">No projects yet</div>
              )}
            </div>
          </div>

          {/* Smart Filters Section */}
          <div className="pt-3 pb-1">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              <span>Saved Filters</span>
              <button
                onClick={() => {
                  const activeFilterCount = rawAllSavedFilters.filter((f: any) => !f.deleted_at).length;
                  const maxAllowedFilters = effectiveLimits?.max_saved_filters ?? 1;
                  if (!isPro && maxAllowedFilters !== -1 && activeFilterCount >= maxAllowedFilters) {
                    setUpgradeModalFeature({
                      name: 'Unlimited Saved Filters',
                      desc: `You have reached the Free plan limit of ${maxAllowedFilters} saved filter. Upgrade to Pro for unlimited smart filters.`,
                    });
                    return;
                  }
                  setFilterModalOpen(true);
                }}
                title="Create Smart Filter"
                className="hover:text-blue-400 transition"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1 mt-1.5">
              {smartFilters.map(filter => {
                return (
                  <div
                    key={filter.id}
                    onClick={() => {
                      setSelectedFilterId(filter.id);
                      setSelectedProjectId(null);
                      setActiveTab('today');
                    }}
                    className={`group w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                      selectedFilterId === filter.id
                        ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                        : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span style={{ backgroundColor: filter.color }} className="w-2 h-2 rounded-full shrink-0" />
                      <span className="truncate">{filter.name}</span>
                    </span>
                    
                    <div className="flex items-center gap-1.5 shrink-0 opacity-50 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFilter(filter);
                          setFilterModalOpen(true);
                        }}
                        title="Edit Filter"
                        className="hover:text-blue-400 p-0.5 transition"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFilter(filter.id);
                        }}
                        title="Delete Filter"
                        className="hover:text-red-400 p-0.5 transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Account / Guest Badge */}
        {user ? (
          <div className="px-2.5 py-2.5 mt-auto shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-zinc-200 truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {userProfile?.is_early_adopter && (
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⭐ EARLY
                  </span>
                )}
                {userProfile?.is_vip && (
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    👑 VIP
                  </span>
                )}
                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${
                  isPro ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-850 text-zinc-300 border-zinc-700'
                }`}>
                  {userProfile?.entitlement_tier?.toUpperCase() || 'FREE'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-zinc-900 text-[11px]">
              <button
                onClick={() => navigate('/app/settings')}
                title="Settings"
                className="text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1"
              >
                <Settings className="h-5 w-5" />
              </button>
              
              <button
                onClick={signOut}

                title="Sign Out"
                className="text-zinc-500 hover:text-red-400 transition flex items-center gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2.5 mt-auto shrink-0 rounded-xl bg-zinc-950/80 border border-dashed border-zinc-800 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-400">Guest Mode (Local)</span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Offline
              </span>
            </div>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-1 px-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[11px] font-medium transition text-center"
            >
              Sign In to Cloud Sync
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950/80 sticky top-0 z-30">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-semibold text-sm text-zinc-100">It Is Finished</div>
          <div className="w-9" /> {/* spacer for center alignment */}
        </div>

        {/* Downgrade Grace Countdown Banner */}
        {workspaceData?.downgrade_status === 'in_grace_period' && (
          <DowngradeGraceBanner
            expiresAt={workspaceData.downgrade_grace_expires_at}
            onUpgrade={() =>
              setUpgradeModalFeature({
                name: 'Pro Tier',
                desc: 'Restore unlimited projects, workspaces, and collaborators to keep your team running.',
              })
            }
          />
        )}

        {/* 15-Minute Emergency Wrap-Up Banner */}
        {workspaceData?.downgrade_status === 'emergency_wrap_up' && (
          <EmergencyWrapUpBanner
            expiresAt={workspaceData.downgrade_emergency_expires_at}
            onExpire={fetchWorkspaceMeta}
          />
        )}
                {activeTab === 'calendar' ? (
          <CalendarTimeGrid onTaskClick={(id: string) => setSelectedTaskId(id)} members={workspaceMembers} />
        ) : activeTab === 'matrix' ? (
          <EisenhowerMatrixView
            tasks={tasks.map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              project: t.project,
                  projectColor: t.projectColor,
              dueDate: t.due_date,
              dueTime: t.due_time,
              estimatedMinutes: t.estimated_minutes,
              completed: t.completed,
            }))}
            onToggleComplete={toggleTask}
            onUpdatePriority={updateTaskPriority}
            onAddTaskToQuadrant={addTaskToQuadrant}
            onDeleteTask={deleteTask}
          />
        ) : activeTab === 'analytics' ? (
          <AnalyticsDashboard />
        ) : activeTab === 'focus' ? (
          <FocusTimerView initialTaskId={focusLinkedTaskId} />
        ) : activeTab === 'habits' ? (
          <HabitsTrackerView />
        ) : (
          <>
            {/* Header */}
            <header className="border-b border-zinc-800/80 px-8 py-3 bg-zinc-950 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedProject ? (
                    <div className="flex items-center gap-2.5">
                      <span style={{ backgroundColor: selectedProject.color || '#3B82F6' }} className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" />
                      <h2 className="text-lg font-bold tracking-tight text-zinc-100">{selectedProject.name}</h2>
                      <button
                        onClick={() => { setEditingProject(selectedProject); setProjectModalOpen(true); }}
                        title="Edit Project"
                        className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
                      {selectedFilterId 
                        ? smartFilters.find(f => f.id === selectedFilterId)?.name 
                        : activeTab === 'all' ? "Inbox" : "Today"}
                    </h2>
                  )}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    {activeDisplayTasks.length} {activeDisplayTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sunday Weekly Review Trigger */}
                  <button
                    onClick={() => setWeeklyReviewOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-400 flex items-center gap-1.5 transition font-semibold"
                  >
                    <Trophy className="h-3.5 w-3.5" /> Weekly Review
                  </button>

                  {/* List / Kanban View Switcher */}
                  <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition ${
                        viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="List View"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('board')}
                      className={`p-1.5 rounded-md transition ${
                        viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Kanban Board View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {selectedProject && (
                    <button
                      onClick={() => { setEditingProject(selectedProject); setProjectModalOpen(true); }}
                      className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5 transition font-medium"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-zinc-400" /> Project Settings
                    </button>
                  )}
                </div>
              </div>

              {/* Project Progress Bar */}
              {selectedProject && displayTasks.length > 0 && (
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      style={{ 
                        width: `${Math.round((displayTasks.filter(t => t.completed).length / displayTasks.length) * 100)}%`,
                        backgroundColor: selectedProject.color || '#3B82F6'
                      }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                    {displayTasks.filter(t => t.completed).length}/{displayTasks.length} ({Math.round((displayTasks.filter(t => t.completed).length / displayTasks.length) * 100)}%)
                  </span>
                </div>
              )}
            </header>

            {/* Tasks Container or Kanban Board */}
            {viewMode === 'board' ? (
              <KanbanBoardView
                sections={rawSections}
                tasks={displayTasks}
                onTaskClick={(id: string) => setSelectedTaskId(id)}
                onToggleComplete={toggleTask}
                onMoveTaskToSection={handleMoveTaskToSection}
                onCreateTaskInSection={handleCreateTaskInSection}
                onCreateSection={handleCreateSection}
                onDeleteSection={handleDeleteSection}
                onRenameSection={handleRenameSection}
                onReorderSection={handleReorderSection}
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-8 max-w-4xl w-full mx-auto space-y-6">
                {/* NLP Quick Add Bar */}
                <form onSubmit={handleAddTask} className="relative">
                  <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 shadow-2xl focus-within:border-blue-500/60 transition focus-within:ring-1 focus-within:ring-blue-500/30">
                    <div className="flex items-center px-3 py-1.5 gap-2">
                      <Sparkles className="h-4 w-4 text-blue-400 shrink-0 animate-pulse" />
                      <input
                        type="text"
                        value={quickAddText}
                        onChange={(e) => setQuickAddText(e.target.value)}
                        placeholder={selectedProject ? `Quick add to #${selectedProject.name}: 'Review specs tomorrow 30m p1'` : "Quick add: 'Ship MVP tomorrow at 3pm for 45m #Core @urgent p1'"}
                        className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!quickAddText.trim()}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>

                    {/* Live NLP Tokenizer Preview */}
                    {quickAddText.trim() && (
                      <div className="border-t border-zinc-800/80 px-3 py-2 bg-zinc-900/90 rounded-b-lg flex flex-wrap gap-2 text-xs items-center">
                        <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-mono">Parsed:</span>
                        {parsedPreview.dueDate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                            <Calendar className="h-3 w-3" /> {parsedPreview.dueDate} {parsedPreview.dueTime || ''}
                          </span>
                        )}
                        {parsedPreview.estimatedMinutes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                            <Clock className="h-3 w-3" /> {parsedPreview.estimatedMinutes}m
                          </span>
                        )}
                        {parsedPreview.projectName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Folder className="h-3 w-3" /> #{parsedPreview.projectName}
                          </span>
                        )}
                        {parsedPreview.tags.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            <Tag className="h-3 w-3" /> @{t}
                          </span>
                        ))}
                        {parsedPreview.priority && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono ${priorityColors[parsedPreview.priority]}`}>
                            P{parsedPreview.priority}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {activeDisplayTasks.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mt-12 animate-in fade-in duration-500">
                      <div className="h-20 w-20 mb-4 rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-zinc-800/80 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 opacity-80" />
                      </div>
                      <h3 className="text-xl font-bold text-zinc-200 mb-2 tracking-tight">Nothing to do here!</h3>
                      <p className="text-sm text-zinc-500 max-w-[280px] leading-relaxed">
                        You're all caught up. Kick back, relax, or add a new task to get started.
                      </p>
                    </div>
                  )}
                  {activeDisplayTasks.map((task) => (
                    <div key={task.id} className="space-y-2">
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(task.id, e)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnTask(task.id, e)}
                        className="group flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-blue-500/40 transition cursor-grab active:cursor-grabbing shadow-sm"
                      >
                        <GripVertical className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 mt-0.5 shrink-0" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTask(task.id);
                          }}
                          className="mt-0.5 text-zinc-500 hover:text-blue-400 transition shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>

                        {/* Task Body (Click to open TaskDetailDrawer) */}
                        <div 
                          onClick={() => setSelectedTaskId(task.id)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium hover:text-blue-300 transition ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                              {task.title}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${priorityColors[task.priority]}`}>
                              P{task.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                            <span className="flex items-center gap-1" style={{ color: task.projectColor || '#a1a1aa' }}>
                              <Folder className="h-3 w-3" /> {task.project}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-zinc-400 font-mono">
                                <Calendar className="h-3 w-3" /> {task.due_date} {task.due_time ? task.due_time.slice(0, 5) : ''}
                              </span>
                            )}
                            {task.recurrence_rule && (
                              <span className="flex items-center gap-1 text-cyan-400 font-mono" title={formatRecurrenceLabel(task.recurrence_rule)}>
                                <Repeat className="h-3 w-3" /> {formatRecurrenceLabel(task.recurrence_rule)}
                              </span>
                            )}
                            {task.estimated_minutes && (
                              <span className="flex items-center gap-1 text-purple-400/80 font-mono">
                                <Clock className="h-3 w-3" /> {task.estimated_minutes}m
                              </span>
                            )}
                            {task.assignedTo && (
                              <span
                                style={{ backgroundColor: task.assignedTo.color }}
                                className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0 shadow-sm"
                                title={task.assignedTo.name}
                              >
                                {task.assignedTo.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            {task.tags.map(tag => (
                              <span key={tag} className="text-zinc-400 font-mono">
                                #{tag}
                              </span>
                            ))}
                            <span className="ml-auto font-mono text-[10px] text-zinc-500 font-bold">
                              idx: {task.order_index}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Subtask Expander Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSubtaskId(expandedSubtaskId === task.id ? null : task.id);
                            }}
                            title="Toggle Subtask Tree"
                            className={`p-1 transition ${expandedSubtaskId === task.id ? 'text-purple-400' : 'text-zinc-500 hover:text-purple-400'}`}
                          >
                            <ListTree className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCommentTask(task);
                            }}
                            title="Discussion & Comments"
                            className="p-1 hover:text-blue-400 text-zinc-500 transition"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            title="Delete Task"
                            className="p-1 hover:text-red-400 text-zinc-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Render Expanded Subtask Tree */}
                      {expandedSubtaskId === task.id && (
                        <div className="pl-6 pt-1">
                          <SubtaskTree taskId={task.id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {completedDisplayTasks.length > 0 && (
                  <div className="mt-8 pt-4 border-t border-zinc-800/60">
                    <button
                      onClick={() => setShowCompleted(!showCompleted)}
                      className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition"
                    >
                      <span>Completed ({completedDisplayTasks.length})</span>
                      <svg className={`w-3 h-3 transition-transform ${showCompleted ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showCompleted && (
                      <div className="mt-4 space-y-2">
                        {completedDisplayTasks.map((task) => (
                          <div key={task.id} className="group flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800/40 bg-zinc-950/40 opacity-75 hover:opacity-100 transition shadow-sm">
                            <button onClick={() => handleUpdateTask(task.id, { completed_at: null, status: 'todo' })} className="text-emerald-500 hover:text-zinc-500 transition mt-0.5 shrink-0">
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-zinc-500 line-through truncate cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                                  {task.title}
                                </h3>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteTask(task.id)}
                              title="Delete Task"
                              className="p-1 hover:text-red-400 text-zinc-600 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal
        isOpen={weeklyReviewOpen}
        onClose={() => setWeeklyReviewOpen(false)}
        tasks={rawTasks}
        projects={rawProjects}
        onUpdateTask={handleUpdateTask}
      />

      {/* Task Detail & Edit Slide-Over Drawer */}
      <TaskDetailDrawer
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        taskId={selectedTaskId}
        task={selectedTask}
        projects={rawProjects}
        members={workspaceMembers}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={deleteTask}
        onStartFocus={(taskId: string) => {
          setFocusLinkedTaskId(taskId);
          setSelectedTaskId(null);
          setActiveTab('focus');
        }}
      />

      {/* Create / Edit Project Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={editingProject}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
      />

      
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async () => {
          await refreshAuth();
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            setAuthModalOpen(false);
          }
        }}
      />
      
      {/* Smart Filter Builder Modal */}
      <SmartFilterModal
        isOpen={filterModalOpen}
        onClose={() => {
          setFilterModalOpen(false);
          setEditingFilter(null);
        }}
        initialFilter={editingFilter}
        onSaveFilter={handleSaveFilter}
      />

      {/* Task Comments Drawer */}
      {activeCommentTask && (
        <TaskCommentsDrawer
          isOpen={!!activeCommentTask}
          onClose={() => setActiveCommentTask(null)}
          taskTitle={activeCommentTask.title}
          taskId={activeCommentTask.id}
        />
      )}

      {/* Downsizing Wizard Modal (Mandatory gauntlet when grace ends) */}
      <DownsizingWizardModal
        isOpen={workspaceData?.downgrade_status === 'resolution_required'}
        activeWorkspaceId={activeWorkspaceId || ''}
        workspaces={userWorkspaces}
        projects={workspaceProjects}
        members={workspaceMembersList}
        emergencyUsed={!!workspaceData?.downgrade_emergency_used}
        onSuccess={fetchWorkspaceMeta}
        onStartEmergencyPass={fetchWorkspaceMeta}
        onUpgrade={() =>
          setUpgradeModalFeature({
            name: 'Pro Tier',
            desc: 'Restore unlimited projects, workspaces, and collaborators.',
          })
        }
      />

      {/* Feature Gating Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={!!upgradeModalFeature}
        onClose={() => setUpgradeModalFeature(null)}
        featureName={upgradeModalFeature?.name || ''}
        featureDescription={upgradeModalFeature?.desc}
        onUpgrade={() => {
          alert('Redirecting to Stripe checkout to upgrade to Pro...');
          setUpgradeModalFeature(null);
        }}
      />
    </div>
  );
}
