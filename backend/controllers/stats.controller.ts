import { Response } from 'express';
import { AuthRequest } from '../types';
import { getQuoteStats } from '../services/quote.service';

export async function getStats(req: AuthRequest, res: Response) {
  try {
    const stats = await getQuoteStats();
    res.json(stats);
  } catch (e) {
    console.error('stats error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}
