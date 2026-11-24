import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  Minus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Priority, Task } from '../types/todo';
import {
  formatCreatedAt,
  formatDueDate,
  isTaskDueToday,
  isTaskOverdue,
} from '../utils/storage';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const PRIORITY_STYLES: Record<
  Priority,
  { classes: string; icon: typeof ArrowUp; label: string }
> = {
  High: {
    classes:
      'border-red-200/90 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300',
    icon: ArrowUp,
    label: 'High',
  },
  Medium: {
    classes:
      'border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300',
    icon: Minus,
    label: 'Medium',
  },
  Low: {
    classes:
      'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: ArrowDown,
    label: 'Low',
  },
};

/**
 * Single task list row displaying completion checkbox, title, optional description,
 * priority badge, due date with overdue highlight, creation timestamp, and Edit/Delete actions.
 */
export function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}: TaskItemProps) {
  const overdue = isTaskOverdue(task);
  const dueToday = isTaskDueToday(task);
  const priorityMeta = PRIORITY_STYLES[task.priority];
  const PriorityIcon = priorityMeta.icon;

  return (
    <li
      className={`group flex items-start gap-3 px-4 py-3.5 transition-colors sm:px-5 ${
        overdue
          ? 'bg-red-50/70 hover:bg-red-50 dark:bg-red-950/25 dark:hover:bg-red-950/35'
          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* Completion checkbox with generous 40px interactive target */}
      <div className="pt-0.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={`Mark "${task.title}" as ${
            task.completed ? 'incomplete' : 'complete'
          }`}
          onClick={() => onToggleComplete(task.id)}
          className={`flex h-5 w-5 items-center justify-center rounded border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            task.completed
              ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
              : overdue
              ? 'border-red-400 bg-white hover:border-red-600 dark:border-red-600 dark:bg-slate-900 dark:hover:border-red-400'
              : 'border-slate-300 bg-white hover:border-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-blue-400'
          }`}
        >
          {task.completed && <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />}
        </button>
      </div>

      {/* Task content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p
            className={`text-sm font-medium leading-snug break-words sm:text-[15px] ${
              task.completed
                ? 'text-slate-400 line-through dark:text-slate-500'
                : overdue
                ? 'text-red-950 dark:text-red-100'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </p>
        </div>

        {task.description && (
          <p
            className={`mt-1 text-xs leading-relaxed whitespace-pre-wrap break-words sm:text-sm ${
              task.completed
                ? 'text-slate-400 line-through dark:text-slate-500'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {task.description}
          </p>
        )}

        {/* Metadata row: Priority badge, due date, and created date */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${priorityMeta.classes}`}
          >
            <PriorityIcon className="h-3 w-3" aria-hidden="true" />
            <span>{priorityMeta.label}</span>
          </span>

          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] tabular-nums whitespace-nowrap ${
                overdue
                  ? 'font-semibold text-red-700 dark:text-red-400'
                  : dueToday
                  ? 'font-medium text-amber-700 dark:text-amber-400'
                  : task.completed
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {overdue ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {overdue
                  ? `Overdue (${formatDueDate(task.dueDate)})`
                  : dueToday
                  ? `Due today (${formatDueDate(task.dueDate)})`
                  : `Due ${formatDueDate(task.dueDate)}`}
              </span>
            </span>
          )}

          <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Added {formatCreatedAt(task.createdAt)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Edit "${task.title}"`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task)}
          aria-label={`Delete "${task.title}"`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:text-slate-400 dark:hover:bg-red-950/60 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
