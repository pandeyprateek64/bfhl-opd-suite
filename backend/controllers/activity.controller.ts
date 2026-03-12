import { Response } from 'express';
import { AuthRequest } from '../types';
import { getRecentActivity } from '../services/activity.service';

export async function getActivity(req: AuthRequest, res: Response) {
  try {
    const activity = await getRecentActivity(50);
    res.json(activity);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
}
