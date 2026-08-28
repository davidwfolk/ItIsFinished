import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema, SupabasePowerSyncConnector } from '@app/core';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hyrffgsjmobdffpgoalw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';
const POWERSYNC_URL = import.meta.env.VITE_POWERSYNC_URL || 'https://hyrffgsjmobdffpgoalw.powersync.journeyapps.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'finished_tasks_web.db'
  }
});

export const connector = new SupabasePowerSyncConnector({
  supabase,
  powersyncUrl: POWERSYNC_URL
});

/**
 * Initializes PowerSync and seeds initial demo data if the local SQLite database is empty.
 */
export async function initDatabase() {
  await powersync.init();
  
  // Connect to backend sync stream (non-blocking)
  powersync.connect(connector).catch(err => {
    console.warn('PowerSync sync stream offline/waiting for credentials:', err.message);
  });

  // Seed sample tasks into local SQLite if table is completely empty
  const countRes = await powersync.get<{ count: number }>('SELECT count(*) as count FROM tasks WHERE deleted_at IS NULL');
  if (countRes.count === 0) {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    
    // Seed core project
    const projectId = 'proj-core-arch';
    await powersync.execute(
      `INSERT OR IGNORE INTO projects (id, owner_id, name, color, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, 'demo-user', 'Core Architecture', '#3B82F6', 'a0', now, now]
    );

    // Seed initial tasks
    const initialTasks = [
      {
        id: 't-1',
        title: 'Review Supabase RLS security policies',
        priority: 1,
        due_date: today,
        due_time: '10:00:00',
        estimated_minutes: 30,
        order_index: 'a0',
        completed: 1,
        completed_at: now,
      },
      {
        id: 't-2',
        title: 'Verify lexicographical string indexing reorders',
        priority: 2,
        due_date: today,
        due_time: '14:00:00',
        estimated_minutes: 45,
        order_index: 'a1',
        completed: 1,
        completed_at: now,
      },
      {
        id: 't-3',
        title: 'Test 120 FPS swipe gestures with tactile haptics',
        priority: 1,
        due_date: today,
        due_time: '18:00:00',
        estimated_minutes: 20,
        order_index: 'a2',
        completed: 0,
        completed_at: null,
      },
      {
        id: 't-4',
        title: 'Integrate client image compression (~350KB target)',
        priority: 3,
        due_date: today,
        due_time: null,
        estimated_minutes: 60,
        order_index: 'a3',
        completed: 0,
        completed_at: null,
      },
      {
        id: 't-5',
        title: 'Schedule weekly review meeting with core team',
        priority: 4,
        due_date: today,
        due_time: '16:00:00',
        estimated_minutes: 15,
        order_index: 'a4',
        completed: 0,
        completed_at: null,
      }
    ];

    for (const t of initialTasks) {
      await powersync.execute(
        `INSERT INTO tasks (id, project_id, title, priority, due_date, due_time, estimated_minutes, order_index, status, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          projectId,
          t.title,
          t.priority,
          t.due_date,
          t.due_time,
          t.estimated_minutes,
          t.order_index,
          t.completed ? 'done' : 'todo',
          t.completed_at,
          now,
          now
        ]
      );
    }
  }
}

