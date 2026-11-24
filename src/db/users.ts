import { db } from './index.ts';
import { users } from './schema.ts';

/**
 * Safely registers or updates a Firebase-authenticated user in PostgreSQL.
 */
export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to sync user record:', error);
    throw new Error('Unable to sync user profile.', { cause: error });
  }
}
