/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, ClipboardList, SearchX, X } from 'lucide-react';
import { ConfirmModal } from './components/ConfirmModal';
import { EditTaskModal } from './components/EditTaskModal';
import { Header } from './components/Header';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { TaskToolbar } from './components/TaskToolbar';
import { ToastContainer } from './components/ToastContainer';
import { useAuth } from './contexts/AuthContext';
import type {
  ConfirmDialogState,
  FilterStatus,
  Priority,
  SortOption,
  Task,
  TaskInput,
  ThemeMode,
  ToastMessage,
  ToastTone,
} from './types/todo';
import {
  clearCompletedTasksInApi,
  createTaskInApi,
  deleteTaskInApi,
  fetchTasksFromApi,
  syncLocalTasksToApi,
  updateTaskInApi,
} from './utils/api';
import {
  TASKS_STORAGE_KEY,
  createTaskId,
  isTaskOverdue,
  loadTasks,
  loadTheme,
  saveTasks,
  saveTheme,
} from './utils/storage';

const PRIORITY_WEIGHT: Record<Priority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const TOAST_DURATION_MS = 3200;

export default function App() {
  const {
    user,
    loading: authLoading,
    authError,
    clearAuthError,
    signInWithGoogle,
    signOut,
    getIdToken,
  } = useAuth();

  // Task & theme state
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Transient view state: search, status filter, sort order
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Modal & notification state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const previousUidRef = useRef<string | null>(null);

  // Sync tasks with localStorage when signed out, or with PostgreSQL API when signed in
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    if (!user) {
      if (previousUidRef.current !== null) {
        previousUidRef.current = null;
        setTasks(loadTasks());
      }
      setIsLoadingTasks(false);
      return;
    }

    previousUidRef.current = user.uid;
    setIsLoadingTasks(true);
    setApiError(null);

    (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;

        const guestTasks = loadTasks();
        let loadedTasks: Task[];

        if (guestTasks.length > 0) {
          loadedTasks = await syncLocalTasksToApi(token, guestTasks);
          try {
            localStorage.removeItem(TASKS_STORAGE_KEY);
          } catch {
            // Ignore storage cleanup errors
          }
        } else {
          loadedTasks = await fetchTasksFromApi(token);
        }

        if (!cancelled) {
          setTasks(loadedTasks);
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            error instanceof Error
              ? error.message
              : 'Unable to load your tasks right now.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTasks(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, getIdToken]);

  // Persist tasks to localStorage only while in guest mode
  useEffect(() => {
    if (!authLoading && !user) {
      saveTasks(tasks);
    }
  }, [tasks, user, authLoading]);

  // Apply and persist theme preference on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Clean up any active toast timers on unmount
  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const existingTimer = toastTimersRef.current.get(id);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone) => {
    const id = createTaskId();
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);

    const timerId = window.setTimeout(() => {
      toastTimersRef.current.delete(id);
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);

    toastTimersRef.current.set(id, timerId);
  }, []);

  // CRUD: Create
  const handleAddTask = useCallback(
    async (input: TaskInput) => {
      setApiError(null);

      if (!user) {
        const newTask: Task = {
          id: createTaskId(),
          title: input.title,
          description: input.description,
          completed: false,
          priority: input.priority,
          dueDate: input.dueDate,
          createdAt: Date.now(),
        };
        setTasks((prev) => [newTask, ...prev]);
        showToast('Task created', 'success');
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) throw new Error('Your session expired. Please sign in again.');
        const created = await createTaskInApi(token, input);
        setTasks((prev) => [created, ...prev]);
        showToast('Task created', 'success');
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : 'Unable to create task.'
        );
      }
    },
    [user, getIdToken, showToast]
  );

  // CRUD: Update (completion toggle)
  const handleToggleComplete = useCallback(
    async (id: string) => {
      setApiError(null);
      const target = tasks.find((t) => t.id === id);
      if (!target) return;

      const nextCompleted = !target.completed;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id ? { ...task, completed: nextCompleted } : task
        )
      );

      if (!user) {
        showToast(
          nextCompleted ? 'Task marked as completed' : 'Task marked as active',
          'info'
        );
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) throw new Error('Your session expired. Please sign in again.');
        const updated = await updateTaskInApi(token, id, {
          completed: nextCompleted,
        });
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        showToast(
          nextCompleted ? 'Task marked as completed' : 'Task marked as active',
          'info'
        );
      } catch (error) {
        // Revert optimistic toggle on failure
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id ? { ...task, completed: target.completed } : task
          )
        );
        setApiError(
          error instanceof Error ? error.message : 'Unable to update task.'
        );
      }
    },
    [tasks, user, getIdToken, showToast]
  );

  // CRUD: Update (edit modal save)
  const handleSaveEdit = useCallback(
    async (id: string, updates: TaskInput) => {
      setApiError(null);

      if (!user) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === id
              ? {
                  ...task,
                  title: updates.title,
                  description: updates.description,
                  priority: updates.priority,
                  dueDate: updates.dueDate,
                }
              : task
          )
        );
        setEditingTask(null);
        showToast('Task updated', 'success');
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) throw new Error('Your session expired. Please sign in again.');
        const updated = await updateTaskInApi(token, id, {
          title: updates.title,
          description: updates.description ?? null,
          priority: updates.priority,
          dueDate: updates.dueDate ?? null,
        });
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        setEditingTask(null);
        showToast('Task updated', 'success');
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : 'Unable to save task changes.'
        );
      }
    },
    [user, getIdToken, showToast]
  );

  // CRUD: Delete single task (with confirmation)
  const handleRequestDeleteTask = useCallback(
    (task: Task) => {
      setConfirmDialog({
        title: 'Delete task',
        message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
        confirmLabel: 'Delete task',
        onConfirm: async () => {
          setConfirmDialog(null);
          setApiError(null);

          if (!user) {
            setTasks((prev) => prev.filter((item) => item.id !== task.id));
            showToast('Task deleted', 'danger');
            return;
          }

          try {
            const token = await getIdToken();
            if (!token) throw new Error('Your session expired. Please sign in again.');
            await deleteTaskInApi(token, task.id);
            setTasks((prev) => prev.filter((item) => item.id !== task.id));
            showToast('Task deleted', 'danger');
          } catch (error) {
            setApiError(
              error instanceof Error ? error.message : 'Unable to delete task.'
            );
          }
        },
      });
    },
    [user, getIdToken, showToast]
  );

  // Derived counts
  const counts = useMemo(() => {
    let completed = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (task.completed) {
        completed += 1;
      } else if (isTaskOverdue(task)) {
        overdue += 1;
      }
    }

    return {
      all: tasks.length,
      active: tasks.length - completed,
      completed,
      overdue,
    };
  }, [tasks]);

  // CRUD: Delete all completed tasks (with confirmation)
  const handleRequestClearCompleted = useCallback(() => {
    if (counts.completed === 0) return;

    const countLabel =
      counts.completed === 1
        ? '1 completed task'
        : `${counts.completed} completed tasks`;

    setConfirmDialog({
      title: 'Clear completed tasks',
      message: `Remove ${countLabel}? This action cannot be undone.`,
      confirmLabel: 'Clear completed',
      onConfirm: async () => {
        setConfirmDialog(null);
        setApiError(null);

        if (!user) {
          setTasks((prev) => prev.filter((task) => !task.completed));
          showToast(`Cleared ${countLabel}`, 'danger');
          return;
        }

        try {
          const token = await getIdToken();
          if (!token) throw new Error('Your session expired. Please sign in again.');
          await clearCompletedTasksInApi(token);
          setTasks((prev) => prev.filter((task) => !task.completed));
          showToast(`Cleared ${countLabel}`, 'danger');
        } catch (error) {
          setApiError(
            error instanceof Error
              ? error.message
              : 'Unable to clear completed tasks.'
          );
        }
      },
    });
  }, [counts.completed, user, getIdToken, showToast]);

  // Derived filtered & sorted tasks for display
  const visibleTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (filter === 'active' && task.completed) return false;
      if (filter === 'completed' && !task.completed) return false;

      if (normalizedQuery) {
        const matchesTitle = task.title.toLowerCase().includes(normalizedQuery);
        const matchesDesc =
          task.description?.toLowerCase().includes(normalizedQuery) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'priority': {
          const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
          return diff !== 0 ? diff : b.createdAt - a.createdAt;
        }
        case 'dueDate': {
          if (a.dueDate && b.dueDate) {
            const cmp = a.dueDate.localeCompare(b.dueDate);
            return cmp !== 0 ? cmp : b.createdAt - a.createdAt;
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return b.createdAt - a.createdAt;
        }
      }
    });

    return sorted;
  }, [tasks, filter, searchQuery, sortBy]);

  const completionPercentage =
    counts.all === 0 ? 0 : Math.round((counts.completed / counts.all) * 100);

  const hasActiveFilters = searchQuery.trim().length > 0 || filter !== 'all';
  const activeError = apiError || authError;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        user={user}
        authLoading={authLoading}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Localized Error Banner */}
        {activeError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{activeError}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setApiError(null);
                clearAuthError();
              }}
              aria-label="Dismiss error"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Progress & Summary Bar */}
        <section
          aria-label="Task progress summary"
          className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              My Tasks
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-600 tabular-nums sm:text-sm dark:text-slate-400">
              {counts.completed} of {counts.all} {counts.all === 1 ? 'task' : 'tasks'} completed
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:justify-end">
            {counts.overdue > 0 && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-red-600 tabular-nums dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{counts.overdue} overdue</span>
              </span>
            )}

            <div className="flex items-center gap-2.5">
              <div
                aria-hidden="true"
                className="h-2 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-200 dark:bg-blue-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="font-mono text-xs font-medium text-slate-600 tabular-nums dark:text-slate-400">
                {completionPercentage}%
              </span>
            </div>
          </div>
        </section>

        {/* Create Task Composer */}
        <TaskForm onAddTask={handleAddTask} />

        {/* Search, Filter & Sort Controls */}
        <TaskToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          counts={counts}
          onRequestClearCompleted={handleRequestClearCompleted}
        />

        {/* Task List / Loading / Empty State */}
        <section
          aria-label="Task list"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          {isLoadingTasks ? (
            <ul className="divide-y divide-slate-200/80 dark:divide-slate-800/80" aria-busy="true">
              {[0, 1, 2].map((idx) => (
                <li key={idx} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                  <div className="mt-0.5 h-5 w-5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                  </div>
                </li>
              ))}
            </ul>
          ) : visibleTasks.length > 0 ? (
            <ul className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
              {visibleTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onEdit={setEditingTask}
                  onDelete={handleRequestDeleteTask}
                />
              ))}
            </ul>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                No tasks yet
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
                Add your first task using the field above to start organizing your work.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <SearchX className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-3.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                No matching tasks
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
                {searchQuery.trim()
                  ? `No tasks match "${searchQuery.trim()}" in the ${filter} view.`
                  : `There are no ${filter} tasks right now.`}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                  }}
                  className="mt-4 inline-flex min-h-[36px] items-center rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={handleSaveEdit}
          onCancel={() => setEditingTask(null)}
        />
      )}

      {/* Delete / Clear Completed Confirmation Modal */}
      {confirmDialog && (
        <ConfirmModal
          dialog={confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
