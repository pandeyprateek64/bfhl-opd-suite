import { Response } from 'express';
import { AuthRequest } from '../types';
import { createUser, findUserById } from '../services/user.service';
import { VALID_ROLES } from '../utils/constants';

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const user = await findUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createUserController(req: AuthRequest, res: Response) {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const user = await createUser(email, password, name, role);
    res.json({ success: true, user });
  } catch (e: any) {
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('createUser error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}
