import { desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { allocationBatches, allocationCases, users } from '../db/schema';
import { AllocationCase } from '../types';

export async function createAllocationBatch(data: {
  batchDate: string;
  totalCases: number;
  uw1Name: string;
  uw1Count: number;
  uw1Pct: number;
  uw2Name: string;
  uw2Count: number;
  uw2Pct: number;
  empThreshold: number;
  source: string;
  createdBy: number;
}) {
  const result = await db
    .insert(allocationBatches)
    .values({
      batchDate: data.batchDate,
      totalCases: data.totalCases,
      uw1Name: data.uw1Name,
      uw1Count: data.uw1Count,
      uw1Pct: data.uw1Pct.toString(),
      uw2Name: data.uw2Name,
      uw2Count: data.uw2Count,
      uw2Pct: data.uw2Pct.toString(),
      empThreshold: data.empThreshold,
      source: data.source,
      createdBy: data.createdBy
    })
    .returning({ id: allocationBatches.id });

  return result[0];
}

export async function allocateCases(batchId: number, cases: AllocationCase[]) {
  for (const c of cases) {
    await db.insert(allocationCases).values({
      batchId,
      clientName: c.client_name,
      rmName: c.rm_name || null,
      dateOfRequest: c.date_of_request || null,
      expectedClosure: c.expected_closure || null,
      caseType: c.case_type || null,
      employeeCount: c.employee_count || null,
      allocatedUw: c.allocated_uw,
      priority: c.priority || 'MEDIUM',
      autoAssigned: c.auto_assigned || false
    });
  }
}

export async function getAllocationBatches(limit: number = 20) {
  const result = await db
    .select({
      id: allocationBatches.id,
      batch_date: allocationBatches.batchDate,
      total_cases: allocationBatches.totalCases,
      uw1_name: allocationBatches.uw1Name,
      uw1_count: allocationBatches.uw1Count,
      uw1_pct: allocationBatches.uw1Pct,
      uw2_name: allocationBatches.uw2Name,
      uw2_count: allocationBatches.uw2Count,
      uw2_pct: allocationBatches.uw2Pct,
      emp_threshold: allocationBatches.empThreshold,
      source: allocationBatches.source,
      created_by: allocationBatches.createdBy,
      created_at: allocationBatches.createdAt,
      created_by_name: users.name
    })
    .from(allocationBatches)
    .leftJoin(users, sql`${allocationBatches.createdBy} = ${users.id}`)
    .orderBy(desc(allocationBatches.createdAt))
    .limit(limit);

  return result;
}

export function runAllocationLogic(cases: AllocationCase[]): { allocated: AllocationCase[], uw1_count: number, uw2_count: number } {
  const uw1Split = 0.65;
  const uw2Split = 0.35;
  const empThreshold = 1000;
  const uw1 = 'Maruf';
  const uw2 = 'Prateek';
  let uw1Count = 0;
  let uw2Count = 0;

  const allocated = cases.map(c => {
    if (c.uw_name && c.uw_name.trim()) {
      return { ...c, allocated_uw: c.uw_name.trim(), auto_assigned: false };
    }

    const total = cases.filter(x => !x.uw_name).length;
    const uw2Target = Math.round(total * uw2Split);
    const isLarge = (parseInt(String(c.employee_count)) || 0) > empThreshold;
    let assignedUW;

    if (isLarge && uw2Count < uw2Target) {
      assignedUW = uw2;
      uw2Count++;
    } else if (uw1Count <= Math.round(total * uw1Split) - 1) {
      assignedUW = uw1;
      uw1Count++;
    } else {
      assignedUW = uw2;
      uw2Count++;
    }

    return { ...c, allocated_uw: assignedUW, auto_assigned: true };
  });

  return { allocated, uw1_count: uw1Count, uw2_count: uw2Count };
}
