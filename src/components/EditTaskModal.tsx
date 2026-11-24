import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { Priority, Task, TaskInput } from '../types/todo';
import { MAX_TITLE_LENGTH } from '../utils/storage';

interface EditTaskModalProps {
  task: Task;
  onSave: (id: string, updates: TaskInput) => void;
  onCancel: () => void;
}

/**
 * Accessible modal dialog for editing a task's title, description, priority, and due date.
 * Pressing Escape cancels; pressing Enter saves (Shift+Enter inserts a newline in description).
 */
export function EditTaskModal({ task, onSave, onCancel }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const submitChanges = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title cannot be empty.');
      titleRef.current?.focus();
      return;
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      setError(`Task title cannot exceed ${MAX_TITLE_LENGTH} characters.`);
      titleRef.current?.focus();
      return;
    }

    onSave(task.id, {
      title: trimmedTitle,
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitChanges();
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitChanges();
    }
  };

  const handleSelectKeyDown = (e: KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitChanges();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-dialog-title"
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <h2
            id="edit-task-dialog-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Edit task
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close edit dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="edit-task-title"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Title
              </label>
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  MAX_TITLE_LENGTH - title.length <= 25
                    ? 'font-medium text-amber-600 dark:text-amber-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
            <input
              ref={titleRef}
              id="edit-task-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'edit-task-error' : undefined}
              className={`min-h-[42px] w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus-visible:ring-2 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:bg-slate-950 ${
                error
                  ? 'border-red-500 focus-visible:ring-red-500/30 dark:border-red-500'
                  : 'border-slate-200 focus:border-blue-600 focus-visible:ring-blue-600/20 dark:border-slate-700 dark:focus:border-blue-500'
              }`}
            />
            {error && (
              <p
                id="edit-task-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="edit-task-description"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Description (optional)
            </label>
            <textarea
              id="edit-task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Add notes or context..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-950"
            />
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Press Enter to save, Shift+Enter for a new line, or Esc to cancel.
            </p>
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-task-priority"
                className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Priority
              </label>
              <select
                id="edit-task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                onKeyDown={handleSelectKeyDown}
                className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="edit-task-due-date"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Due date
                </label>
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Clear date
                  </button>
                )}
              </div>
              <input
                id="edit-task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Dialog footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
