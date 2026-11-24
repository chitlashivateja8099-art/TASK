import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { tasks } from './schema.ts';
import type { Priority, Task } from '../types/todo.ts';

function toTaskDto(row: typeof tasks.$inferSelect): Task {
  const priority: Priority =
    row.priority === 'High' || row.priority === 'Low' || row.priority === 'Medium'
      ? row.priority
      : 'Medium';

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    priority,
    dueDate: row.dueDate ?? undefined,
    createdAt: row.createdAt,
  };
}

/**
 * Fetches all tasks belonging to a specific authenticated user.
 */
export async function listUserTasks(userUid: string): Promise<Task[]> {
  try {
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userUid, userUid))
      .orderBy(desc(tasks.createdAt));

    return rows.map(toTaskDto);
  } catch (error) {
    console.error('Failed to list tasks:', error);
    throw new Error('Failed to load tasks. Please try again.', { cause: error });
  }
}

/**
 * Creates a new task owned by the authenticated user.
 */
export async function createUserTask(
  userUid: string,
  input: {
    id: string;
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string;
    createdAt: number;
  }
): Promise<Task> {
  try {
    const result = await db
      .insert(tasks)
      .values({
        id: input.id,
        userUid,
        title: input.title,
        description: input.description ?? null,
        completed: false,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        createdAt: input.createdAt,
      })
      .returning();

    return toTaskDto(result[0]);
  } catch (error) {
    console.error('Failed to create task:', error);
    throw new Error('Failed to save task. Please try again.', { cause: error });
  }
}

/**
 * Updates an existing task if owned by the authenticated user.
 * Returns null when no matching task exists.
 */
export async function updateUserTask(
  userUid: string,
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    completed?: boolean;
    priority?: Priority;
    dueDate?: string | null;
  }
): Promise<Task | null> {
  try {
    const setValues: Partial<typeof tasks.$inferInsert> = {};

    if (updates.title !== undefined) setValues.title = updates.title;
    if (updates.description !== undefined) setValues.description = updates.description;
    if (updates.completed !== undefined) setValues.completed = updates.completed;
    if (updates.priority !== undefined) setValues.priority = updates.priority;
    if (updates.dueDate !== undefined) setValues.dueDate = updates.dueDate;

    if (Object.keys(setValues).length === 0) {
      const existing = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userUid, userUid)));
      return existing[0] ? toTaskDto(existing[0]) : null;
    }

    const result = await db
      .update(tasks)
      .set(setValues)
      .where(and(eq(tasks.id, taskId), eq(tasks.userUid, userUid)))
      .returning();

    return result[0] ? toTaskDto(result[0]) : null;
  } catch (error) {
    console.error('Failed to update task:', error);
    throw new Error('Failed to update task. Please try again.', { cause: error });
  }
}

/**
 * Deletes a single task owned by the authenticated user.
 * Returns true if a row was deleted.
 */
export async function deleteUserTask(userUid: string, taskId: string): Promise<boolean> {
  try {
    const deleted = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userUid, userUid)))
      .returning({ id: tasks.id });

    return deleted.length > 0;
  } catch (error) {
    console.error('Failed to delete task:', error);
    throw new Error('Failed to delete task. Please try again.', { cause: error });
  }
}

/**
 * Deletes all completed tasks owned by the authenticated user.
 */
export async function clearCompletedUserTasks(userUid: string): Promise<number> {
  try {
    const deleted = await db
      .delete(tasks)
      .where(and(eq(tasks.userUid, userUid), eq(tasks.completed, true)))
      .returning({ id: tasks.id });

    return deleted.length;
  } catch (error) {
    console.error('Failed to clear completed tasks:', error);
    throw new Error('Failed to clear completed tasks. Please try again.', { cause: error });
  }
}

/**
 * Imports local tasks into the user's PostgreSQL account without overwriting existing IDs.
 */
export async function importGuestTasks(userUid: string, guestTasks: Task[]): Promise<Task[]> {
  try {
    if (guestTasks.length > 0) {
      await db
        .insert(tasks)
        .values(
          guestTasks.map((t) => ({
            id: t.id,
            userUid,
            title: t.title,
            description: t.description ?? null,
            completed: t.completed,
            priority: t.priority,
            dueDate: t.dueDate ?? null,
            createdAt: t.createdAt,
          }))
        )
        .onConflictDoNothing({ target: tasks.id });
    }

    return await listUserTasks(userUid);
  } catch (error) {
    console.error('Failed to import local tasks:', error);
    throw new Error('Failed to sync local tasks. Please try again.', { cause: error });
  }
}
