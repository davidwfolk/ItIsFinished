import { column, Schema, Table } from '@powersync/common';

export const profiles = new Table({
  email: column.text,
  display_name: column.text,
  avatar_url: column.text,
  timezone: column.text,
  default_view: column.text,
  start_of_week: column.integer,
  created_at: column.text,
  updated_at: column.text
});

export const projects = new Table({
  workspace_id: column.text,
  owner_id: column.text,
  name: column.text,
  color: column.text,
  icon: column.text,
  view_mode: column.text,
  is_archived: column.integer,
  order_index: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const project_members = new Table({
  project_id: column.text,
  user_id: column.text,
  role: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const sections = new Table({
  workspace_id: column.text,
  project_id: column.text,
  name: column.text,
  order_index: column.text,
  is_collapsed: column.integer,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const tasks = new Table({
  workspace_id: column.text,
  project_id: column.text,
  section_id: column.text,
  parent_id: column.text,
  created_by: column.text,
  assigned_to: column.text,
  title: column.text,
  description: column.text,
  status: column.text,
  priority: column.integer,
  due_date: column.text,
  due_time: column.text,
  timezone: column.text,
  estimated_minutes: column.integer,
  recurrence_rule: column.text,
  recurrence_parent_id: column.text,
  order_index: column.text,
  completed_at: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const tags = new Table({
  workspace_id: column.text,
  user_id: column.text,
  name: column.text,
  color: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const task_tags = new Table({
  task_id: column.text,
  tag_id: column.text,
  created_at: column.text
});

export const habits = new Table({
  workspace_id: column.text,
  user_id: column.text,
  title: column.text,
  icon: column.text,
  color: column.text,
  frequency_type: column.text,
  target_count: column.integer,
  is_archived: column.integer,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const habit_logs = new Table({
  habit_id: column.text,
  log_date: column.text,
  count: column.integer,
  created_at: column.text
});

export const comments = new Table({
  task_id: column.text,
  user_id: column.text,
  content: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const attachments = new Table({
  task_id: column.text,
  file_name: column.text,
  file_size_bytes: column.integer,
  mime_type: column.text,
  storage_path: column.text,
  thumbnail_url: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const focus_sessions = new Table({
  user_id: column.text,
  task_id: column.text,
  duration_minutes: column.integer,
  started_at: column.text,
  completed_at: column.text,
  created_at: column.text
});

export const saved_filters = new Table({
  workspace_id: column.text,
  user_id: column.text,
  name: column.text,
  icon: column.text,
  color: column.text,
  query_rules: column.text,
  order_index: column.text,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const workspaces = new Table({
  name: column.text,
  is_personal: column.integer,
  deleted_at: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const workspace_members = new Table({
  workspace_id: column.text,
  user_id: column.text,
  role: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const time_blocks = new Table({
  user_id: column.text,
  task_id: column.text,
  date: column.text,
  start_time: column.text,
  end_time: column.text,
  created_at: column.text,
  updated_at: column.text
});

export const AppSchema = new Schema({
  profiles,
  workspaces,
  workspace_members,
  projects,
  project_members,
  sections,
  tasks,
  tags,
  task_tags,
  habits,
  habit_logs,
  comments,
  attachments,
  focus_sessions,
  saved_filters,
  time_blocks
});

export type DatabaseSchema = typeof AppSchema;
