import { pgTable, serial, varchar, boolean, timestamp, integer, numeric, date, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ─── Enums ───
export const roleEnum = pgEnum('role', ['ADMIN', 'PRICING_LEAD', 'UNDERWRITER', 'SALES_HEAD', 'SALES_EXEC']);

// ─── Users Table ───
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('SALES_EXEC'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Quotes Table ───
export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  quoteRef: varchar('quote_ref', { length: 50 }).unique().notNull(),
  toolSource: varchar('tool_source', { length: 20 }).notNull(),
  clientName: varchar('client_name', { length: 200 }).notNull(),
  clientId: varchar('client_id', { length: 50 }),
  employeeCount: integer('employee_count'),
  familyConstruct: varchar('family_construct', { length: 50 }),
  coverageType: varchar('coverage_type', { length: 20 }),
  productType: varchar('product_type', { length: 50 }).notNull(),
  walletSi: integer('wallet_si'),
  planTier: varchar('plan_tier', { length: 20 }),
  wellnessMode: varchar('wellness_mode', { length: 10 }),
  ratePerEmployee: numeric('rate_per_employee', { precision: 10, scale: 2 }),
  netPremium: numeric('net_premium', { precision: 14, scale: 2 }),
  gst: numeric('gst', { precision: 14, scale: 2 }),
  grossPremium: numeric('gross_premium', { precision: 14, scale: 2 }),
  benefitCount: integer('benefit_count').default(0),
  ratesJson: jsonb('rates_json'),
  brokerage: numeric('brokerage', { precision: 5, scale: 2 }),
  insuranceMargin: numeric('insurance_margin', { precision: 5, scale: 2 }),
  opexLoading: numeric('opex_loading', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 20 }).default('DRAFT'),
  priority: varchar('priority', { length: 10 }).default('MEDIUM'),
  channel: varchar('channel', { length: 20 }).default('Direct'),
  brokerName: varchar('broker_name', { length: 100 }),
  region: varchar('region', { length: 50 }),
  assignedTo: integer('assigned_to').references(() => users.id),
  generatedBy: integer('generated_by').references(() => users.id),
  quoteDate: date('quote_date'),
  dueDate: date('due_date'),
  notesJson: jsonb('notes_json').default('[]'),
  revisionCount: integer('revision_count').default(0),
  marginPercent: numeric('margin_percent', { precision: 5, scale: 1 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  statusIdx: index('idx_quotes_status').on(table.status),
  generatedByIdx: index('idx_quotes_generated_by').on(table.generatedBy),
  createdAtIdx: index('idx_quotes_created_at').on(table.createdAt),
}));

// ─── Activity Log Table ───
export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id').references(() => quotes.id),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  oldValue: varchar('old_value', { length: 100 }),
  newValue: varchar('new_value', { length: 100 }),
  description: varchar('description'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  quoteIdIdx: index('idx_activity_quote_id').on(table.quoteId),
}));

// ─── Allocation Batches Table ───
export const allocationBatches = pgTable('allocation_batches', {
  id: serial('id').primaryKey(),
  batchDate: date('batch_date').notNull(),
  totalCases: integer('total_cases').notNull(),
  uw1Name: varchar('uw1_name', { length: 50 }).notNull(),
  uw1Count: integer('uw1_count').notNull(),
  uw1Pct: numeric('uw1_pct', { precision: 5, scale: 1 }),
  uw2Name: varchar('uw2_name', { length: 50 }).notNull(),
  uw2Count: integer('uw2_count').notNull(),
  uw2Pct: numeric('uw2_pct', { precision: 5, scale: 1 }),
  empThreshold: integer('emp_threshold').default(1000),
  source: varchar('source', { length: 20 }).default('MANUAL'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Allocation Cases Table ───
export const allocationCases = pgTable('allocation_cases', {
  id: serial('id').primaryKey(),
  batchId: integer('batch_id').references(() => allocationBatches.id),
  clientName: varchar('client_name', { length: 200 }).notNull(),
  rmName: varchar('rm_name', { length: 100 }),
  dateOfRequest: date('date_of_request'),
  expectedClosure: date('expected_closure'),
  caseType: varchar('case_type', { length: 20 }),
  employeeCount: integer('employee_count'),
  allocatedUw: varchar('allocated_uw', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 10 }),
  autoAssigned: boolean('auto_assigned').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── TypeScript Types ───
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Quote = InferSelectModel<typeof quotes>;
export type NewQuote = InferInsertModel<typeof quotes>;

export type ActivityLog = InferSelectModel<typeof activityLog>;
export type NewActivityLog = InferInsertModel<typeof activityLog>;

export type AllocationBatch = InferSelectModel<typeof allocationBatches>;
export type NewAllocationBatch = InferInsertModel<typeof allocationBatches>;

export type AllocationCase = InferSelectModel<typeof allocationCases>;
export type NewAllocationCase = InferInsertModel<typeof allocationCases>;
