import { Request, Response } from 'express';
import { AuthRequest, AllocationCase } from '../types';
import { createAllocationBatch, allocateCases, getAllocationBatches, runAllocationLogic } from '../services/allocation.service';

export async function saveAllocation(req: AuthRequest, res: Response) {
  const {
    batch_date,
    total_cases,
    uw1_name,
    uw1_count,
    uw1_pct,
    uw2_name,
    uw2_count,
    uw2_pct,
    emp_threshold,
    source,
    cases
  } = req.body;

  try {
    const batch = await createAllocationBatch({
      batchDate: batch_date || new Date().toISOString().slice(0, 10),
      totalCases: total_cases,
      uw1Name: uw1_name,
      uw1Count: uw1_count,
      uw1Pct: uw1_pct,
      uw2Name: uw2_name,
      uw2Count: uw2_count,
      uw2Pct: uw2_pct,
      empThreshold: emp_threshold || 1000,
      source: source || 'MANUAL',
      createdBy: req.user!.userId
    });

    if (cases && cases.length > 0) {
      await allocateCases(batch.id, cases);
    }

    res.json({ success: true, batchId: batch.id });
  } catch (e) {
    console.error('saveAllocation error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getAllocations(req: AuthRequest, res: Response) {
  try {
    const batches = await getAllocationBatches(20);
    res.json(batches);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function webhookAllocation(req: Request, res: Response) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.WEBHOOK_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const cases: AllocationCase[] = req.body;
  if (!Array.isArray(cases)) {
    return res.status(400).json({ error: 'Expected array of cases' });
  }

  const result = runAllocationLogic(cases);
  res.json({ success: true, ...result });
}
