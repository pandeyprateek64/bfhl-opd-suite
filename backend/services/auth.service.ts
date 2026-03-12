import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { JWT_EXPIRY } from '../utils/constants';

const JWT_SECRET = process.env.JWT_SECRET || 'bfhl-dev-secret-change-in-production';

export async function findUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim()), eq(users.isActive, true)))
    .limit(1);

  return result[0] || null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: { id: number; email: string; name: string; role: string }) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export async function seedUsers() {
  const seedData = [
    { email: 'prateek@bfhl.co.in', name: 'Prateek S.', role: 'ADMIN', password: 'Bajaj@2026' },
    { email: 'rahul@bfhl.co.in', name: 'Rahul M.', role: 'PRICING_LEAD', password: 'Bajaj@2026' },
    { email: 'sneha@bfhl.co.in', name: 'Sneha K.', role: 'UNDERWRITER', password: 'Bajaj@2026' }
  ];

  for (const u of seedData) {
    const hash = await bcrypt.hash(u.password, 10);
    await db.insert(users).values({
      email: u.email,
      passwordHash: hash,
      name: u.name,
      role: u.role
    });
  }
}
