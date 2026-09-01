import { AbstractPowerSyncDatabase } from '@powersync/common';
import { z } from 'zod';
import { getOrderIndexBetween } from './indexing';
import { calculateNextRecurrence } from './recurrence';
import { TaskRow } from './types/database';

// ----------------------------------------------------------------------------
// ZOD SCHEMAS FOR BOUNDARY VALIDATION
// ----------------------------------------------------------------------------
const UUID_NULLABLE = z.string().uuid().nullable().optional();
const UUID_DEFAULT = z.string().uuid().default(() => '00000000-0000-0000-0000-000000000000');

export const CreateTaskSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  project_id: UUID_DEFAULT,
  section_id: UUID_NULLABLE,
  priority: z.number().int().min(1).max(4).default(4),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  estimated_minutes: z.number().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  order_index: z.string()
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  project_id: UUID_NULLABLE,
  section_id: UUID_NULLABLE,
  priority: z.number().int().min(1).max(4).optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  estimated_minutes: z.number().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  status: z.string().optional(),
  order_index: z.string().optional()
});

export const CreateTimeBlockSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  task_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD local logical date"),
  start_time: z.string(),
  end_time: z.string()
});

export const CreateProjectSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  color: z.string(),
  icon: z.string().optional(),
  order_index: z.string()
});

export const CreateSectionSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  order_index: z.string()
});

// ----------------------------------------------------------------------------
// PURE MUTATION FUNCTIONS (DEPENDENCY INJECTION)
// ----------------------------------------------------------------------------

export async function createTask(
  db: AbstractPowerSyncDatabase, 
  workspaceId: string, 
  input: Omit<z.infer<typeof CreateTaskSchema>, 'id' | 'workspace_id'>
) {
  const id = crypto.randomUUID();
  const data = CreateTaskSchema.parse({
    ...input,
    id,
    workspace_id: workspaceId
  });

  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO tasks (id, workspace_id, project_id, section_id, title, priority, due_date, due_time, estimated_minutes, recurrence_rule, order_index, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)`,
    [
      data.id, data.workspace_id, data.project_id, data.section_id || null, data.title, data.priority,
      data.due_date || null, data.due_time || null, data.estimated_minutes || null, data.recurrence_rule || null,
      data.order_index, now, now
    ]
  );
  return id;
}

export async function updateTask(
  db: AbstractPowerSyncDatabase,
  workspaceId: string, // Kept for consistency/auth if needed, though ID is primary
  taskId: string,
  updates: z.infer<typeof UpdateTaskSchema>
) {
  const data = UpdateTaskSchema.parse(updates);
  const keys = Object.keys(data);
  if (keys.length === 0) return;

  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as any)[k]);
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE tasks SET ${setClauses}, updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [...values, now, taskId, workspaceId]
  );
}

export async function deleteTask(db: AbstractPowerSyncDatabase, workspaceId: string, taskId: string) {
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [now, now, taskId, workspaceId]
  );
}

export async function toggleTask(db: AbstractPowerSyncDatabase, workspaceId: string, task: TaskRow) {
  const isCompleted = !task.completed_at && task.status !== 'done';
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE tasks SET completed_at = ?, status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [isCompleted ? now : null, isCompleted ? 'done' : 'todo', now, task.id, workspaceId]
  );

  // Auto-Roll Recurrence Engine in SQLite
  if (isCompleted && task.recurrence_rule) {
    const next = calculateNextRecurrence(task.due_date, task.due_time, task.recurrence_rule);
    
    // Get highest index
    const maxResult = await db.getAll<{ order_index: string }>(
      `SELECT order_index FROM tasks WHERE workspace_id = ? AND deleted_at IS NULL ORDER BY order_index DESC LIMIT 1`, 
      [workspaceId]
    );
    const lastIndex = maxResult.length > 0 ? maxResult[0].order_index : null;
    const newIndex = getOrderIndexBetween(lastIndex, null);
    const nextId = crypto.randomUUID();

    await db.execute(
      `INSERT INTO tasks (id, workspace_id, project_id, title, priority, due_date, due_time, estimated_minutes, recurrence_rule, order_index, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)`,
      [
        nextId,
        workspaceId,
        task.project_id || '00000000-0000-0000-0000-000000000000',
        task.title,
        task.priority,
        next.nextDueDate,
        next.nextDueTime,
        task.estimated_minutes,
        task.recurrence_rule,
        newIndex,
        now,
        now
      ]
    );
  }
}

export async function removeAttachment(db: AbstractPowerSyncDatabase, workspaceId: string, attachmentId: string) {
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [now, now, attachmentId, workspaceId]
  );
}

// ----------------------------------------------------------------------------
// PROJECT & SECTION MUTATIONS
// ----------------------------------------------------------------------------

export async function createProject(
  db: AbstractPowerSyncDatabase,
  workspaceId: string,
  input: Omit<z.infer<typeof CreateProjectSchema>, 'id' | 'workspace_id'>
) {
  const id = crypto.randomUUID();
  const data = CreateProjectSchema.parse({ ...input, id, workspace_id: workspaceId });
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO projects (id, workspace_id, name, color, icon, order_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.workspace_id, data.name, data.color, data.icon || null, data.order_index, now, now]
  );
  return id;
}

export async function updateProject(
  db: AbstractPowerSyncDatabase,
  workspaceId: string,
  projectId: string,
  updates: { name?: string; color?: string; icon?: string; }
) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  
  const setClauses = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (updates as any)[k]);
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE projects SET ${setClauses}, updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [...values, now, projectId, workspaceId]
  );
}

export async function deleteProject(db: AbstractPowerSyncDatabase, workspaceId: string, projectId: string) {
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
    [now, now, projectId, workspaceId]
  );
}

export async function createSection(
  db: AbstractPowerSyncDatabase,
  workspaceId: string,
  input: Omit<z.infer<typeof CreateSectionSchema>, 'id' | 'workspace_id'>
) {
  const id = crypto.randomUUID();
  const data = CreateSectionSchema.parse({ ...input, id, workspace_id: workspaceId });
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO sections (id, workspace_id, project_id, name, order_index, is_collapsed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    [data.id, data.workspace_id, data.project_id, data.name, data.order_index, now, now]
  );
  return id;
}

// ----------------------------------------------------------------------------
// LOGICAL DATE MUTATIONS
// ----------------------------------------------------------------------------

export async function createTimeBlock(
  db: AbstractPowerSyncDatabase,
  workspaceId: string,
  input: Omit<z.infer<typeof CreateTimeBlockSchema>, 'id' | 'workspace_id'>
) {
  const id = crypto.randomUUID();
  const data = CreateTimeBlockSchema.parse({ ...input, id, workspace_id: workspaceId });
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO time_blocks (id, workspace_id, task_id, date, start_time, end_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.workspace_id, data.task_id, data.date, data.start_time, data.end_time, now, now]
  );
  return id;
}
