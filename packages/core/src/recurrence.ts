/**
 * Recurrence calculation engine for local-first tasks.
 * Evaluates standard RRULE strings and computes next occurrence dates with 0ms lag.
 */

export interface RecurrenceResult {
  nextDueDate: string; // YYYY-MM-DD
  nextDueTime: string | null; // HH:mm:ss
}

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

/**
 * Calculates the next due date/time based on an RRULE string.
 */
export function calculateNextRecurrence(
  currentDueDateStr: string | null,
  currentDueTimeStr: string | null,
  rrule: string,
  completionDate: Date = new Date()
): RecurrenceResult {
  // Base date is either the current task's due date (if in future) or today
  let baseDate: Date;
  if (currentDueDateStr) {
    const [y, m, d] = currentDueDateStr.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  } else {
    baseDate = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
  }

  // Parse RRULE components
  const parts = rrule.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key.toUpperCase()] = val.toUpperCase();
    return acc;
  }, {});

  const freq = parts['FREQ'] || 'DAILY';
  const interval = parseInt(parts['INTERVAL'] || '1', 10);
  const byDay = parts['BYDAY'] ? parts['BYDAY'].split(',') : null;

  const nextDate = new Date(baseDate);

  if (freq === 'DAILY') {
    nextDate.setDate(nextDate.getDate() + interval);
    // If calculated next date is still in the past compared to completion date, advance to tomorrow
    const todayMidnight = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
    if (nextDate <= todayMidnight) {
      nextDate.setTime(todayMidnight.getTime());
      nextDate.setDate(nextDate.getDate() + 1);
    }
  } else if (freq === 'WEEKLY') {
    if (byDay && byDay.length > 0) {
      // Check for 'Every Weekday' (MO,TU,WE,TH,FR)
      const targetDayIndices = byDay.map((d) => DAY_MAP[d]).filter((d) => d !== undefined);
      
      let found = false;
      // Search forward up to 14 days for the next matching day
      for (let i = 1; i <= 14; i++) {
        const candidate = new Date(baseDate);
        candidate.setDate(candidate.getDate() + i);
        if (targetDayIndices.includes(candidate.getDay())) {
          const todayMidnight = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
          if (candidate > todayMidnight) {
            nextDate.setTime(candidate.getTime());
            found = true;
            break;
          }
        }
      }

      if (!found) {
        nextDate.setDate(nextDate.getDate() + 7 * interval);
      }
    } else {
      nextDate.setDate(nextDate.getDate() + 7 * interval);
    }
  } else if (freq === 'MONTHLY') {
    nextDate.setMonth(nextDate.getMonth() + interval);
  } else if (freq === 'YEARLY') {
    nextDate.setFullYear(nextDate.getFullYear() + interval);
  }

  const y = nextDate.getFullYear();
  const m = String(nextDate.getMonth() + 1).padStart(2, '0');
  const d = String(nextDate.getDate()).padStart(2, '0');

  return {
    nextDueDate: `${y}-${m}-${d}`,
    nextDueTime: currentDueTimeStr,
  };
}

/**
 * Returns a human-friendly label for a given RRULE string.
 */
export function formatRecurrenceLabel(rrule: string | null): string {
  if (!rrule) return 'Does not repeat';

  const parts = rrule.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, val] = part.split('=');
    if (key && val) acc[key.toUpperCase()] = val.toUpperCase();
    return acc;
  }, {});

  const freq = parts['FREQ'];
  const interval = parseInt(parts['INTERVAL'] || '1', 10);
  const byDay = parts['BYDAY'];

  if (freq === 'DAILY') {
    return interval === 1 ? 'Every day' : `Every ${interval} days`;
  }

  if (freq === 'WEEKLY') {
    if (byDay === 'MO,TU,WE,TH,FR') {
      return 'Every weekday (Mon–Fri)';
    }
    if (byDay === 'SA,SU') {
      return 'Every weekend';
    }
    if (byDay && byDay.split(',').length === 1) {
      const names: Record<string, string> = {
        MO: 'Monday',
        TU: 'Tuesday',
        WE: 'Wednesday',
        TH: 'Thursday',
        FR: 'Friday',
        SA: 'Saturday',
        SU: 'Sunday',
      };
      return `Every ${names[byDay] || byDay}`;
    }
    return interval === 1 ? 'Every week' : `Every ${interval} weeks`;
  }

  if (freq === 'MONTHLY') {
    return interval === 1 ? 'Every month' : `Every ${interval} months`;
  }

  if (freq === 'YEARLY') {
    return interval === 1 ? 'Every year' : `Every ${interval} years`;
  }

  return 'Repeats custom';
}

