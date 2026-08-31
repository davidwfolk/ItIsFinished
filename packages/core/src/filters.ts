/**
 * Smart Filters Query Compiler
 * Compiles user filter rules into SQLite / PostgreSQL WHERE clauses for 0ms smart list evaluation.
 */

export interface FilterRule {
  priority?: (1 | 2 | 3 | 4)[];
  dueBefore?: string; // 'today' | 'tomorrow' | '7days' | 'overdue'
  projectId?: string;
  tags?: string[];
  includeCompleted?: boolean;
}

export interface SavedSmartFilter {
  id: string;
  name: string;
  color: string;
  icon: string;
  rule: FilterRule;
}

/**
 * Compiles a structured FilterRule into an SQL WHERE query string.
 */
export function compileFilterToSql(rule: FilterRule): { sql: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];

  // 1. Completion status
  if (!rule.includeCompleted) {
    clauses.push("status != 'done' AND status != 'canceled'");
  }

  // 2. Soft deletes
  clauses.push('deleted_at IS NULL');

  // 3. Priorities
  if (rule.priority && rule.priority.length > 0) {
    const placeholders = rule.priority.map(() => '?').join(', ');
    clauses.push(`priority IN (${placeholders})`);
    params.push(...rule.priority);
  }

  // 4. Due Date logic
  if (rule.dueBefore) {
    if (rule.dueBefore === 'today') {
      clauses.push("due_date <= date('now')");
    } else if (rule.dueBefore === 'tomorrow') {
      clauses.push("due_date <= date('now', '+1 day')");
    } else if (rule.dueBefore === '7days') {
      clauses.push("due_date <= date('now', '+7 days')");
    } else if (rule.dueBefore === 'overdue') {
      clauses.push("due_date < date('now')");
    }
  }

  // 5. Project ID
  if (rule.projectId) {
    clauses.push('project_id = ?');
    params.push(rule.projectId);
  }

  const sql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return { sql, params };
}

/**
 * Default starter smart filters for every new user.
 */
export const DEFAULT_SMART_FILTERS: SavedSmartFilter[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'High Priority (P1 & P2)',
    color: '#EF4444',
    icon: 'flame',
    rule: {
      priority: [1, 2],
      includeCompleted: false,
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Overdue Tasks',
    color: '#F97316',
    icon: 'alert-circle',
    rule: {
      dueBefore: 'overdue',
      includeCompleted: false,
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Next 7 Days Agenda',
    color: '#3B82F6',
    icon: 'calendar',
    rule: {
      dueBefore: '7days',
      includeCompleted: false,
    },
  },
];

/**
 * Evaluates a FilterRule against an in-memory task object.
 * This is used for instantaneous UI updates while maintaining complex rules.
 */
export function evaluateFilterRule(task: any, rule: FilterRule): boolean {
  // 1. Completion status
  if (!rule.includeCompleted) {
    if (task.completed || task.status === 'done' || task.status === 'canceled') {
      return false;
    }
  }

  // 2. Priority
  if (rule.priority && Array.isArray(rule.priority) && rule.priority.length > 0) {
    const stringPriorities = rule.priority.map(p => String(p));
    if (!stringPriorities.includes(String(task.priority))) {
      return false;
    }
  }

  // 3. Due Date logic
  if (rule.dueBefore) {
    if (!task.due_date) return false;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (rule.dueBefore === 'today') {
      if (task.due_date > todayStr) return false;
    } else if (rule.dueBefore === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      if (task.due_date > tomorrowStr) return false;
    } else if (rule.dueBefore === '7days') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      if (task.due_date > nextWeekStr) return false;
    } else if (rule.dueBefore === 'overdue') {
      if (task.due_date >= todayStr) return false;
    }
  }

  // 4. Project ID
  if (rule.projectId) {
    if (task.project_id !== rule.projectId) {
      return false;
    }
  }

  // 5. Tags (not implemented in compileFilterToSql yet, but just in case)
  if (rule.tags && rule.tags.length > 0) {
    const taskTags = task.tags || [];
    const hasTag = rule.tags.some(tag => taskTags.includes(tag));
    if (!hasTag) return false;
  }

  return true;
}
