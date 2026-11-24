import { CheckCircle2, Info, Trash2, X } from 'lucide-react';
import type { ToastMessage, ToastTone } from '../types/todo';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TONE_STYLES: Record<ToastTone, { icon: typeof CheckCircle2; iconColor: string }> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  danger: {
    icon: Trash2,
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

/**
 * Accessible toast stack announcing CRUD confirmations via aria-live="polite".
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-40 flex flex-col items-end gap-2 sm:left-auto sm:w-full sm:max-w-sm"
    >
      {toasts.map((toast) => {
        const meta = TONE_STYLES[toast.tone];
        const Icon = meta.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Icon className={`h-4 w-4 shrink-0 ${meta.iconColor}`} aria-hidden="true" />
              <span className="truncate text-xs font-medium sm:text-sm">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
