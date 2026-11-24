import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/**
 * Users table synced with Firebase Authentication UID.
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Tasks table storing user-scoped To-Do items.
 */
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  priority: text('priority').notNull().default('Medium'),
  dueDate: text('due_date'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  owner: one(users, {
    fields: [tasks.userUid],
    references: [users.uid],
  }),
}));
