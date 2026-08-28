import * as chrono from 'chrono-node';

export interface ParsedTaskInput {
  title: string;
  dueDate: string | null; // YYYY-MM-DD
  dueTime: string | null; // HH:mm:ss
  estimatedMinutes: number | null;
  priority: 1 | 2 | 3 | 4;
  projectName: string | null;
  sectionName: string | null;
  tags: string[];
  recurrenceRule: string | null;
}

/**
 * Parses user quick-add text into structured task fields with zero network latency.
 *
 * Example:
 * "Client demo every tuesday at 3pm for 45m #Work /Q3Roadmap @urgent p1"
 */
export function parseQuickAdd(input: string, referenceDate: Date = new Date()): ParsedTaskInput {
  let workingText = input.trim();

  let priority: 1 | 2 | 3 | 4 = 4;
  let projectName: string | null = null;
  let sectionName: string | null = null;
  const tags: string[] = [];
  let estimatedMinutes: number | null = null;
  let recurrenceRule: string | null = null;

  // 1. Extract Priority (p1, p2, p3, p4, !p1, etc.)
  const priorityMatch = workingText.match(/\b(?:p|!p|priority:)([1-4])\b/i);
  if (priorityMatch) {
    priority = parseInt(priorityMatch[1], 10) as 1 | 2 | 3 | 4;
    workingText = workingText.replace(priorityMatch[0], ' ');
  }

  // 2. Extract Duration (e.g., "for 45m", "for 1h", "30min", "90m")
  const durationMatch = workingText.match(/\b(?:for\s+)?(\d+)\s*(m|min|mins|minutes|h|hr|hrs|hours)\b/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('h')) {
      estimatedMinutes = value * 60;
    } else {
      estimatedMinutes = value;
    }
    workingText = workingText.replace(durationMatch[0], ' ');
  }

  // 3. Extract Project (e.g., "#Work", "#Personal-Tasks")
  const projectMatch = workingText.match(/#([\w-]+)/);
  if (projectMatch) {
    projectName = projectMatch[1];
    workingText = workingText.replace(projectMatch[0], ' ');
  }

  // 4. Extract Section (e.g., "/Sprint1", "/Backlog")
  const sectionMatch = workingText.match(/\/([\w-]+)/);
  if (sectionMatch) {
    sectionName = sectionMatch[1];
    workingText = workingText.replace(sectionMatch[0], ' ');
  }

  // 5. Extract Tags (e.g., "@urgent", "@shopping")
  const tagMatches = workingText.matchAll(/@([\w-]+)/g);
  for (const match of tagMatches) {
    tags.push(match[1]);
    workingText = workingText.replace(match[0], ' ');
  }

  // 6. Extract Recurrence keywords
  const recurrenceMatch = workingText.match(/\b(every\s+(?:day|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday|weekend|\d+\s*(?:days|weeks|months)))\b/i);
  if (recurrenceMatch) {
    const recText = recurrenceMatch[1].toLowerCase();
    if (recText.includes('day') || recText === 'daily') {
      recurrenceRule = 'FREQ=DAILY';
    } else if (recText.includes('week')) {
      recurrenceRule = 'FREQ=WEEKLY';
    } else if (recText.includes('month')) {
      recurrenceRule = 'FREQ=MONTHLY';
    } else if (recText.includes('monday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=MO';
    } else if (recText.includes('tuesday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=TU';
    } else if (recText.includes('wednesday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=WE';
    } else if (recText.includes('thursday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=TH';
    } else if (recText.includes('friday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=FR';
    } else if (recText.includes('saturday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=SA';
    } else if (recText.includes('sunday')) {
      recurrenceRule = 'FREQ=WEEKLY;BYDAY=SU';
    }
    workingText = workingText.replace(recurrenceMatch[0], ' ');
  }

  // 7. Parse Natural Language Date and Time via Chrono
  let dueDate: string | null = null;
  let dueTime: string | null = null;

  const parsedResults = chrono.parse(workingText, referenceDate);
  if (parsedResults.length > 0) {
    const result = parsedResults[0];
    const dateObj = result.start.date();

    // Format YYYY-MM-DD
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    dueDate = `${y}-${m}-${d}`;

    // Check if time was explicitly specified
    if (result.start.isCertain('hour')) {
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      const ss = String(dateObj.getSeconds()).padStart(2, '0');
      dueTime = `${hh}:${mm}:${ss}`;
    }

    workingText = workingText.replace(result.text, ' ');
  }

  // Clean remaining text for the clean task title
  const title = workingText.replace(/\s+/g, ' ').trim();

  return {
    title: title.length > 0 ? title : input.trim(),
    dueDate,
    dueTime,
    estimatedMinutes,
    priority,
    projectName,
    sectionName,
    tags,
    recurrenceRule
  };
}
