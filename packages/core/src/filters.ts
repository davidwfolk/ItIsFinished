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
    id: 'filter-urgent',
    name: 'High Priority (P1 & P2)',
    color: '#EF4444',
    icon: 'flame',
    rule: {
      priority: [1, 2],
      includeCompleted: false,
    },
  },
  {
    id: 'filter-overdue',
    name: 'Overdue Tasks',
    color: '#F97316',
    icon: 'alert-circle',
    rule: {
      dueBefore: 'overdue',
      includeCompleted: false,
    },
  },
  {
    id: 'filter-week',
    name: 'Next 7 Days Agenda',
    color: '#3B82F6',
    icon: 'calendar',
    rule: {
      dueBefore: '7days',
      includeCompleted: false,
    },
  },
];
