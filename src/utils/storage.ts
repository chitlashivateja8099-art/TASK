import type { Priority, Task, ThemeMode } from '../types/todo';

export const TASKS_STORAGE_KEY = 'taskledger_tasks';
export const THEME_STORAGE_KEY = 'taskledger_theme';
export const MAX_TITLE_LENGTH = 200;

const VALID_PRIORITIES = new Set<Priority>(['Low', 'Medium', 'High']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Generates a collision-resistant unique task ID without external dependencies.
 */
export function createTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validates and normalizes an unknown value loaded from localStorage into a Task,
 * returning null if the record is malformed or corrupted.
 */
function sanitizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
  if (typeof candidate.title !== 'string') return null;

  const trimmedTitle = candidate.title.trim();
  if (!trimmedTitle || trimmedTitle.length > MAX_TITLE_LENGTH) return null;

  const completed = typeof candidate.completed === 'boolean' ? candidate.completed : false;

  const priority: Priority =
    typeof candidate.priority === 'string' && VALID_PRIORITIES.has(candidate.priority as Priority)
      ? (candidate.priority as Priority)
      : 'Medium';

  const createdAt =
    typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
      ? candidate.createdAt
      : Date.now();

  const description =
    typeof candidate.description === 'string' && candidate.description.trim().length > 0
      ? candidate.description.trim()
      : undefined;

  const dueDate =
    typeof candidate.dueDate === 'string' && DATE_PATTERN.test(candidate.dueDate)
      ? candidate.dueDate
      : undefined;

  return {
    id: candidate.id,
    title: trimmedTitle,
    description,
    completed,
    priority,
    dueDate,
    createdAt,
  };
}

/**
 * Loads tasks from localStorage.
 * Gracefully falls back to an empty list if data is missing or corrupted.
 */
export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized: Task[] = [];
    for (const item of parsed) {
      const valid = sanitizeTask(item);
      if (valid) sanitized.push(valid);
    }
    return sanitized;
  } catch {
    // Corrupted JSON or inaccessible storage safely degrades to an empty task list
    return [];
  }
}

/**
 * Persists tasks to localStorage, swallowing storage quota/security errors safely.
 */
export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore storage write failures in restricted browsing contexts
  }
}

/**
 * Loads the persisted theme preference, defaulting to system preference if unset.
 */
export function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage read errors
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Saves the selected theme preference to localStorage.
 */
export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Returns today's local calendar date in YYYY-MM-DD format so overdue checks
 * align with the user's local timezone rather than UTC.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if a task has a due date strictly before today and is not completed.
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.completed) return false;
  return task.dueDate < getTodayDateString();
}

/**
 * Returns true if a task is due today and not completed.
 */
export function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate || task.completed) return false;
  return task.dueDate === getTodayDateString();
}

/**
 * Formats a YYYY-MM-DD due date into a concise human-readable label.
 */
export function formatDueDate(dateStr: string): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  const currentYear = new Date().getFullYear();

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: year !== currentYear ? 'numeric' : undefined,
  });
}

/**
 * Formats a task creation timestamp concisely.
 */
export function formatCreatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
