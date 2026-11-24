/**
 * Domain types for the TaskLedger To-Do application.
 */

export type Priority = 'Low' | 'Medium' | 'High';

export type FilterStatus = 'all' | 'active' | 'completed';

export type SortOption = 'newest' | 'oldest' | 'priority' | 'dueDate';

export type ThemeMode = 'light' | 'dark';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  /** Optional ISO local date string in YYYY-MM-DD format */
  dueDate?: string;
  /** Epoch timestamp in milliseconds */
  createdAt: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
}

export type ToastTone = 'success' | 'info' | 'danger';

export interface ToastMessage {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}
