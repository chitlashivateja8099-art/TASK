import type { Task, TaskInput } from '../types/todo';

async function authorizedFetch<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed. Please try again.');
  }

  return payload;
}

export async function fetchTasksFromApi(token: string): Promise<Task[]> {
  const data = await authorizedFetch<{ tasks: Task[] }>('/api/tasks', token);
  return data.tasks;
}

export async function syncLocalTasksToApi(
  token: string,
  localTasks: Task[]
): Promise<Task[]> {
  const data = await authorizedFetch<{ tasks: Task[] }>('/api/tasks/sync', token, {
    method: 'POST',
    body: JSON.stringify({ tasks: localTasks }),
  });
  return data.tasks;
}

export async function createTaskInApi(
  token: string,
  input: TaskInput
): Promise<Task> {
  const data = await authorizedFetch<{ task: Task }>('/api/tasks', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function updateTaskInApi(
  token: string,
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    completed?: boolean;
    priority?: Task['priority'];
    dueDate?: string | null;
  }
): Promise<Task> {
  const data = await authorizedFetch<{ task: Task }>(
    `/api/tasks/${encodeURIComponent(id)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
  return data.task;
}

export async function deleteTaskInApi(token: string, id: string): Promise<void> {
  await authorizedFetch<{ deletedId: string }>(
    `/api/tasks/${encodeURIComponent(id)}`,
    token,
    {
      method: 'DELETE',
    }
  );
}

export async function clearCompletedTasksInApi(token: string): Promise<number> {
  const data = await authorizedFetch<{ deletedCount: number }>(
    '/api/tasks/completed',
    token,
    {
      method: 'DELETE',
    }
  );
  return data.deletedCount;
}
