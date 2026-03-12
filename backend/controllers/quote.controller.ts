import { Response } from 'express';
import { AuthRequest, QuoteInput } from '../types';
import { findQuoteByRef, createQuote, findAllQuotes, findQuoteById, updateQuote } from '../services/quote.service';
import { createActivityLog } from '../services/activity.service';
import { ALLOWED_STATUS_CHANGES } from '../utils/constants';
import { mapQuoteRow } from '../utils/mappers';

export async function saveQuote(req: AuthRequest, res: Response) {
  const d: QuoteInput = req.body;

  try {
    // Check for duplicate quote_ref
    const existing = await findQuoteByRef(d.quote_ref);
    if (existing) {
      return res.json({ success: true, id: existing.id, message: 'Quote already exists' });
    }

    const result = await createQuote(d, req.user!.userId);

    // Log activity
    await createActivityLog({
      quoteId: result.id,
      userId: req.user!.userId,
      action: 'CREATED',
      description: `Quote ${d.quote_ref} created via ${d.tool_source}`
    });

    res.json({ success: true, id: result.id });
  } catch (e) {
    console.error('saveQuote error:', e);
    res.status(500).json({ error: 'Server error', detail: (e as Error).message });
  }
}

export async function getQuotes(req: AuthRequest, res: Response) {
  try {
    const quotesData = await findAllQuotes(req.user!.role, req.user!.userId);
    const quotes = quotesData.map(mapQuoteRow);
    res.json(quotes);
  } catch (e) {
    console.error('getQuotes error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getQuoteById(req: AuthRequest, res: Response) {
  try {
    const quote = await findQuoteById(parseInt(String(req.params.id)));
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Access control: SALES_EXEC can only see own quotes
    if (req.user!.role === 'SALES_EXEC' && quote.generated_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(mapQuoteRow(quote));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function patchQuote(req: AuthRequest, res: Response) {
  const { status, notes, priority, assigned_to, broker_name, region, due_date } = req.body;
  const role = req.user!.role;

  try {
    const quote = await findQuoteById(parseInt(String(req.params.id)));
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (req.user!.role === 'SALES_EXEC' && quote.generated_by !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates: any = {
      updatedAt: new Date()
    };

    if (status && ALLOWED_STATUS_CHANGES[role as keyof typeof ALLOWED_STATUS_CHANGES]?.includes(status)) {
      updates.status = status;
    }
    if (priority) updates.priority = priority;
    if (assigned_to !== undefined) updates.assignedTo = assigned_to;
    if (broker_name !== undefined) updates.brokerName = broker_name;
    if (region) updates.region = region;
    if (due_date) updates.dueDate = due_date;

    if (notes) {
      const currentNotes = Array.isArray(quote.notes_json) ? quote.notes_json : [];
      const newNotes = [...currentNotes, { text: notes, date: new Date().toISOString().slice(0, 10), by: req.user!.name }];
      updates.notesJson = newNotes;
    }

    if (Object.keys(updates).length === 1) {
      return res.json({ success: true, message: 'Nothing to update' });
    }

    await updateQuote(parseInt(String(req.params.id)), updates);

    if (status && status !== quote.status) {
      await createActivityLog({
        quoteId: parseInt(String(req.params.id)),
        userId: req.user!.userId,
        action: 'STATUS_CHANGE',
        oldValue: quote.status ?? undefined,
        newValue: status,
        description: `Status changed from ${quote.status} to ${status}`
      });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('patchQuote error:', e);
    res.status(500).json({ error: 'Server error' });
  }
}
