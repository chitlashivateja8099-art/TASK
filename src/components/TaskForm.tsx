import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { Priority, TaskInput } from '../types/todo';
import { MAX_TITLE_LENGTH } from '../utils/storage';

interface TaskFormProps {
  onAddTask: (input: TaskInput) => void;
}

/**
 * Task creation form supporting Enter-to-add, 200-character limit enforcement,
 * empty-input validation feedback, priority selection, due date, and optional description.
 */
export function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const remainingChars = MAX_TITLE_LENGTH - title.length;
  const isNearLimit = remainingChars <= 25;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a task title before adding.');
      titleInputRef.current?.focus();
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(`Task title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
      titleInputRef.current?.focus();
      return;
    }

    onAddTask({
      title: trimmedTitle,
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    });

    // Reset form fields after creation
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setDueDate('');
    setShowDetails(false);
    setError(null);
    titleInputRef.current?.focus();
  };

  return (
    <section
      aria-label="Create a new task"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative flex-1">
            <label htmlFor="new-task-title" className="sr-only">
              New task title
            </label>
            <input
              ref={titleInputRef}
              id="new-task-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="What needs to be done?"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'new-task-error' : 'new-task-counter'}
              className={`min-h-[44px] w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 pr-16 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:bg-white focus:outline-none focus-visible:ring-2 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-950 ${
                error
                  ? 'border-red-500 focus-visible:ring-red-500/30 dark:border-red-500'
                  : 'border-slate-200 focus:border-blue-600 focus-visible:ring-blue-600/20 dark:border-slate-700 dark:focus:border-blue-500'
              }`}
            />
            <span
              id="new-task-counter"
              aria-live="polite"
              className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] tabular-nums ${
                isNearLimit
                  ? 'font-medium text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {title.length}/{MAX_TITLE_LENGTH}
            </span>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add</span>
          </button>
        </div>

        {error && (
          <p
            id="new-task-error"
            role="alert"
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {/* Secondary metadata controls: Priority, Due Date, and optional Description toggle */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="new-task-priority"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Priority
              </label>
              <select
                id="new-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="min-h-[36px] rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="new-task-due-date"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Due date
              </label>
              <input
                id="new-task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-[36px] rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-800 transition-colors hover:border-slate-300 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
            aria-controls="new-task-description-panel"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 whitespace-nowrap shrink-0"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Hide description</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add description</span>
              </>
            )}
          </button>
        </div>

        {showDetails && (
          <div id="new-task-description-panel" className="mt-3">
            <label
              htmlFor="new-task-description"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Description (optional)
            </label>
            <textarea
              id="new-task-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes, context, or subtasks..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-950"
            />
          </div>
        )}
      </form>
    </section>
  );
}
