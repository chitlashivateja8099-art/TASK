import { ArrowUpDown, Search, Trash2, X } from 'lucide-react';
import type { FilterStatus, SortOption } from '../types/todo';

interface TaskToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  counts: {
    all: number;
    active: number;
    completed: number;
  };
  onRequestClearCompleted: () => void;
}

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

/**
 * Workspace toolbar providing live search, status filter tabs, sort dropdown,
 * and bulk "Clear completed" action.
 */
export function TaskToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  counts,
  onRequestClearCompleted,
}: TaskToolbarProps) {
  return (
    <section
      aria-label="Filter and sort tasks"
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Top row: Search input + Sort selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="task-search" className="sr-only">
            Search tasks by title or description
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <input
            id="task-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks by title or description..."
            className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-9 pl-9 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-950"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="task-sort"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sort</span>
          </label>
          <select
            id="task-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="min-h-[40px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority (High to Low)</option>
            <option value="dueDate">Due date (soonest first)</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Segmented status filter tabs + Clear completed button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800/80">
        <div
          role="group"
          aria-label="Filter tasks by status"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/90"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option.value;
            const count = counts[option.value];
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange(option.value)}
                aria-pressed={isActive}
                className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRequestClearCompleted}
          disabled={counts.completed === 0}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-900/60 dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:disabled:hover:border-slate-700 dark:disabled:hover:bg-transparent dark:disabled:hover:text-slate-300 whitespace-nowrap shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Clear completed</span>
        </button>
      </div>
    </section>
  );
}
