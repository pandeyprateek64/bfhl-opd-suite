import { Request, Response } from 'express';
import { findUserByEmail, verifyPassword, generateToken, seedUsers } from '../services/auth.service';
import { countUsers } from '../services/user.service';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function seed(req: Request, res: Response) {
  try {
    const count = await countUsers();
    if (count > 0) {
      return res.json({ message: 'Users already seeded' });
    }

    await seedUsers();
    res.json({ success: true, message: '3 users seeded successfully' });
  } catch (e) {
    console.error('seed error:', e);
    res.status(500).json({ error: (e as Error).message });
  }
}
