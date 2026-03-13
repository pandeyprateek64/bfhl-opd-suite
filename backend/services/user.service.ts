import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';

export async function createUser(email: string, password: string, name: string, role: string) {
  const hash = await bcrypt.hash(password, 10);
  const result = await db
    .insert(users)
    .values({
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      name,
      role
    })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  return result[0];
}

export async function findUserById(id: number) {
  const result = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0] || null;
}

export async function countUsers(): Promise<number> {
  const result = await db.select().from(users);
  return result.length;
}
