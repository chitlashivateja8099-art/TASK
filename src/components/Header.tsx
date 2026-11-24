import { CheckSquare, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ThemeMode } from '../types/todo';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * Top application bar featuring the brand wordmark, account sign-in/out action,
 * and persistent Light/Dark mode toggle.
 */
export function Header({
  theme,
  onToggleTheme,
  user,
  authLoading,
  onSignIn,
  onSignOut,
}: HeaderProps) {
  const isDark = theme === 'dark';

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <CheckSquare
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            TaskLedger
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!authLoading &&
            (user ? (
              <div className="flex items-center gap-2.5 shrink-0">
                <span className="hidden max-w-[180px] truncate text-xs font-medium text-slate-600 sm:inline dark:text-slate-400">
                  {user.email || user.displayName}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sign in</span>
              </button>
            ))}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">Light mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span className="hidden sm:inline">Dark mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
