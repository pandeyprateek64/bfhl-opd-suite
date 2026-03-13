import { desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { activityLog, users, quotes } from '../db/schema';

export async function createActivityLog(data: {
  quoteId: number;
  userId: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  description: string;
}) {
  await db.insert(activityLog).values({
    quoteId: data.quoteId,
    userId: data.userId,
    action: data.action,
    oldValue: data.oldValue || null,
    newValue: data.newValue || null,
    description: data.description
  });
}

export async function getRecentActivity(limit: number = 50) {
  const result = await db
    .select({
      id: activityLog.id,
      quote_id: activityLog.quoteId,
      user_id: activityLog.userId,
      action: activityLog.action,
      old_value: activityLog.oldValue,
      new_value: activityLog.newValue,
      description: activityLog.description,
      created_at: activityLog.createdAt,
      user_name: users.name,
      quote_ref: quotes.quoteRef
    })
    .from(activityLog)
    .leftJoin(users, sql`${activityLog.userId} = ${users.id}`)
    .leftJoin(quotes, sql`${activityLog.quoteId} = ${quotes.id}`)
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return result;
}
