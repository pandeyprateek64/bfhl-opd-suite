import { eq, desc, sql, notInArray } from 'drizzle-orm';
import { db } from '../db';
import { quotes, users } from '../db/schema';
import { QuoteInput } from '../types';

export async function findQuoteByRef(quoteRef: string) {
  const result = await db
    .select()
    .from(quotes)
    .where(eq(quotes.quoteRef, quoteRef))
    .limit(1);

  return result[0] || null;
}

export async function createQuote(data: QuoteInput, userId: number) {
  const result = await db
    .insert(quotes)
    .values({
      quoteRef: data.quote_ref,
      toolSource: data.tool_source,
      clientName: data.client_name,
      clientId: data.client_id || null,
      employeeCount: data.employee_count || null,
      familyConstruct: data.family_construct || null,
      coverageType: data.coverage_type || null,
      productType: data.product_type,
      walletSi: data.wallet_si || null,
      planTier: data.plan_tier || null,
      wellnessMode: data.wellness_mode || null,
      ratePerEmployee: data.rate_per_employee?.toString() || null,
      netPremium: data.net_premium?.toString() || null,
      gst: data.gst?.toString() || null,
      grossPremium: data.gross_premium?.toString() || null,
      benefitCount: data.benefit_count || 0,
      ratesJson: data.rates_json || null,
      brokerage: data.brokerage != null ? (data.brokerage * 100).toString() : null,
      insuranceMargin: data.insurance_margin != null ? (data.insurance_margin * 100).toString() : null,
      opexLoading: data.opex_loading != null ? (data.opex_loading * 100).toString() : null,
      status: data.status || 'DRAFT',
      priority: data.priority || 'MEDIUM',
      channel: data.channel || 'Direct',
      brokerName: data.broker_name || null,
      region: data.region || null,
      assignedTo: data.assigned_to || null,
      generatedBy: userId,
      quoteDate: data.quote_date || null,
      dueDate: data.due_date || null,
      notesJson: data.notes_json || [],
      revisionCount: data.revision_count || 0,
      marginPercent: data.margin_percent?.toString() || null
    })
    .returning({ id: quotes.id });

  return result[0];
}

export async function findAllQuotes(role: string, userId: number) {
  const adminRoles = ['ADMIN', 'PRICING_LEAD', 'UNDERWRITER'];

  const query = db
    .select({
      id: quotes.id,
      quote_ref: quotes.quoteRef,
      tool_source: quotes.toolSource,
      client_name: quotes.clientName,
      client_id: quotes.clientId,
      employee_count: quotes.employeeCount,
      family_construct: quotes.familyConstruct,
      coverage_type: quotes.coverageType,
      product_type: quotes.productType,
      wallet_si: quotes.walletSi,
      plan_tier: quotes.planTier,
      wellness_mode: quotes.wellnessMode,
      rate_per_employee: quotes.ratePerEmployee,
      net_premium: quotes.netPremium,
      gst: quotes.gst,
      gross_premium: quotes.grossPremium,
      benefit_count: quotes.benefitCount,
      rates_json: quotes.ratesJson,
      brokerage: quotes.brokerage,
      insurance_margin: quotes.insuranceMargin,
      opex_loading: quotes.opexLoading,
      status: quotes.status,
      priority: quotes.priority,
      channel: quotes.channel,
      broker_name: quotes.brokerName,
      region: quotes.region,
      assigned_to: quotes.assignedTo,
      generated_by: quotes.generatedBy,
      quote_date: quotes.quoteDate,
      due_date: quotes.dueDate,
      notes_json: quotes.notesJson,
      revision_count: quotes.revisionCount,
      margin_percent: quotes.marginPercent,
      created_at: quotes.createdAt,
      updated_at: quotes.updatedAt,
      assignee_name: users.name,
      generator_name: sql<string>`u2.name`
    })
    .from(quotes)
    .leftJoin(users, eq(quotes.assignedTo, users.id))
    .leftJoin(sql`users u2`, sql`${quotes.generatedBy} = u2.id`)
    .orderBy(desc(quotes.updatedAt));

  if (adminRoles.includes(role) || role === 'SALES_HEAD') {
    return await query;
  } else {
    return await query.where(eq(quotes.generatedBy, userId));
  }
}

export async function findQuoteById(id: number) {
  const result = await db
    .select({
      id: quotes.id,
      quote_ref: quotes.quoteRef,
      tool_source: quotes.toolSource,
      client_name: quotes.clientName,
      client_id: quotes.clientId,
      employee_count: quotes.employeeCount,
      family_construct: quotes.familyConstruct,
      coverage_type: quotes.coverageType,
      product_type: quotes.productType,
      wallet_si: quotes.walletSi,
      plan_tier: quotes.planTier,
      wellness_mode: quotes.wellnessMode,
      rate_per_employee: quotes.ratePerEmployee,
      net_premium: quotes.netPremium,
      gst: quotes.gst,
      gross_premium: quotes.grossPremium,
      benefit_count: quotes.benefitCount,
      rates_json: quotes.ratesJson,
      brokerage: quotes.brokerage,
      insurance_margin: quotes.insuranceMargin,
      opex_loading: quotes.opexLoading,
      status: quotes.status,
      priority: quotes.priority,
      channel: quotes.channel,
      broker_name: quotes.brokerName,
      region: quotes.region,
      assigned_to: quotes.assignedTo,
      generated_by: quotes.generatedBy,
      quote_date: quotes.quoteDate,
      due_date: quotes.dueDate,
      notes_json: quotes.notesJson,
      revision_count: quotes.revisionCount,
      margin_percent: quotes.marginPercent,
      created_at: quotes.createdAt,
      updated_at: quotes.updatedAt,
      assignee_name: users.name,
      generator_name: sql<string>`u2.name`
    })
    .from(quotes)
    .leftJoin(users, eq(quotes.assignedTo, users.id))
    .leftJoin(sql`users u2`, sql`${quotes.generatedBy} = u2.id`)
    .where(eq(quotes.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateQuote(id: number, updates: any) {
  await db
    .update(quotes)
    .set(updates)
    .where(eq(quotes.id, id));
}

export async function getQuoteStats() {
  const today = new Date().toISOString().slice(0, 10);

  const [totalRes, todayRes, pipelineRes, activeRes] = await Promise.all([
    db.select().from(quotes),
    db.select().from(quotes).where(sql`DATE(${quotes.createdAt}) = ${today}`),
    db
      .select({ total: sql<number>`COALESCE(SUM(${quotes.grossPremium}),0)` })
      .from(quotes)
      .where(notInArray(quotes.status, ['REJECTED', 'EXPIRED'])),
    db
      .select()
      .from(quotes)
      .where(sql`${quotes.status} IN ('SUBMITTED','UNDER_REVIEW','NEGOTIATION')`)
  ]);

  return {
    totalQuotes: totalRes.length,
    quotesToday: todayRes.length,
    pipelineValue: parseFloat(String(pipelineRes[0]?.total || 0)),
    activeQuotes: activeRes.length
  };
}
