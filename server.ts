import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  clearCompletedUserTasks,
  createUserTask,
  deleteUserTask,
  importGuestTasks,
  listUserTasks,
  updateUserTask,
} from './src/db/tasks.ts';
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import type { Priority, Task } from './src/types/todo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_TITLE_LENGTH = 200;
const VALID_PRIORITIES = new Set<Priority>(['Low', 'Medium', 'High']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidPriority(value: unknown): value is Priority {
  return typeof value === 'string' && VALID_PRIORITIES.has(value as Priority);
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '64kb' }));

  // List all tasks for the authenticated user
  app.get('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userTasks = await listUserTasks(req.user!.uid);
      return res.json({ tasks: userTasks });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load tasks.';
      return res.status(500).json({ error: message });
    }
  });

  // Create a new task
  app.post('/api/tasks', requireAuth, async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    const rawTitle = typeof body.title === 'string' ? body.title.trim() : '';
    if (!rawTitle) {
      return res.status(400).json({ error: 'Task title is required.' });
    }
    if (rawTitle.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Task title cannot exceed ${MAX_TITLE_LENGTH} characters.` });
    }

    const priority: Priority = isValidPriority(body.priority) ? body.priority : 'Medium';

    let description: string | undefined;
    if (body.description !== undefined && body.description !== null) {
      if (typeof body.description !== 'string') {
        return res.status(400).json({ error: 'Invalid task description.' });
      }
      const trimmedDesc = body.description.trim();
      description = trimmedDesc.length > 0 ? trimmedDesc : undefined;
    }

    let dueDate: string | undefined;
    if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '') {
      if (typeof body.dueDate !== 'string' || !DATE_PATTERN.test(body.dueDate)) {
        return res.status(400).json({ error: 'Due date must be in YYYY-MM-DD format.' });
      }
      dueDate = body.dueDate;
    }

    try {
      const created = await createUserTask(req.user!.uid, {
        id: crypto.randomUUID(),
        title: rawTitle,
        description,
        priority,
        dueDate,
        createdAt: Date.now(),
      });
      return res.status(201).json({ task: created });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task.';
      return res.status(500).json({ error: message });
    }
  });

  // Import local guest tasks into the signed-in user's account
  app.post('/api/tasks/sync', requireAuth, async (req: AuthRequest, res) => {
    const body = req.body as Record<string, unknown> | null;
    if (!body || !Array.isArray(body.tasks)) {
      return res.status(400).json({ error: 'Expected an array of tasks to sync.' });
    }

    const sanitized: Task[] = [];
    for (const item of body.tasks.slice(0, 200)) {
      if (!item || typeof item !== 'object') continue;
      const candidate = item as Record<string, unknown>;
      const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : '';
      const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
      if (!id || id.length > 128 || !title || title.length > MAX_TITLE_LENGTH) continue;

      const priority: Priority = isValidPriority(candidate.priority) ? candidate.priority : 'Medium';
      const completed = typeof candidate.completed === 'boolean' ? candidate.completed : false;
      const description =
        typeof candidate.description === 'string' && candidate.description.trim()
          ? candidate.description.trim()
          : undefined;
      const dueDate =
        typeof candidate.dueDate === 'string' && DATE_PATTERN.test(candidate.dueDate)
          ? candidate.dueDate
          : undefined;
      const createdAt =
        typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
          ? Math.trunc(candidate.createdAt)
          : Date.now();

      sanitized.push({
        id,
        title,
        description,
        completed,
        priority,
        dueDate,
        createdAt,
      });
    }

    try {
      const syncedTasks = await importGuestTasks(req.user!.uid, sanitized);
      return res.json({ tasks: syncedTasks });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync tasks.';
      return res.status(500).json({ error: message });
    }
  });

  // Delete all completed tasks for the authenticated user
  app.delete('/api/tasks/completed', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deletedCount = await clearCompletedUserTasks(req.user!.uid);
      return res.json({ deletedCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to clear completed tasks.';
      return res.status(500).json({ error: message });
    }
  });

  // Update a specific task owned by the authenticated user
  app.patch('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    const taskId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!taskId || taskId.length > 128) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const body = req.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body.' });
    }

    const updates: {
      title?: string;
      description?: string | null;
      completed?: boolean;
      priority?: Priority;
      dueDate?: string | null;
    } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return res.status(400).json({ error: 'Task title cannot be empty.' });
      }
      const trimmedTitle = body.title.trim();
      if (trimmedTitle.length > MAX_TITLE_LENGTH) {
        return res.status(400).json({ error: `Task title cannot exceed ${MAX_TITLE_LENGTH} characters.` });
      }
      updates.title = trimmedTitle;
    }

    if (body.description !== undefined) {
      if (body.description === null) {
        updates.description = null;
      } else if (typeof body.description === 'string') {
        const trimmedDesc = body.description.trim();
        updates.description = trimmedDesc.length > 0 ? trimmedDesc : null;
      } else {
        return res.status(400).json({ error: 'Invalid task description.' });
      }
    }

    if (body.completed !== undefined) {
      if (typeof body.completed !== 'boolean') {
        return res.status(400).json({ error: 'Completed status must be a boolean.' });
      }
      updates.completed = body.completed;
    }

    if (body.priority !== undefined) {
      if (!isValidPriority(body.priority)) {
        return res.status(400).json({ error: 'Invalid priority value.' });
      }
      updates.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null || body.dueDate === '') {
        updates.dueDate = null;
      } else if (typeof body.dueDate === 'string' && DATE_PATTERN.test(body.dueDate)) {
        updates.dueDate = body.dueDate;
      } else {
        return res.status(400).json({ error: 'Due date must be in YYYY-MM-DD format.' });
      }
    }

    try {
      const updated = await updateUserTask(req.user!.uid, taskId, updates);
      if (!updated) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.json({ task: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task.';
      return res.status(500).json({ error: message });
    }
  });

  // Delete a specific task owned by the authenticated user
  app.delete('/api/tasks/:id', requireAuth, async (req: AuthRequest, res) => {
    const taskId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!taskId || taskId.length > 128) {
      return res.status(400).json({ error: 'Invalid task ID.' });
    }

    try {
      const deleted = await deleteUserTask(req.user!.uid, taskId);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      return res.json({ deletedId: taskId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete task.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
