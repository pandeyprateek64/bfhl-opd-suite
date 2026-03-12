export function mapQuoteRow(row: any) {
  return {
    id: row.quote_ref || row.quoteRef || `Q-${row.id}`,
    dbId: row.id,
    client: row.client_name || row.clientName,
    product: row.product_type || row.productType || row.tool_source || row.toolSource,
    lives: row.employee_count || row.employeeCount || 0,
    premium: parseFloat(row.gross_premium || row.grossPremium) || 0,
    status: row.status || 'DRAFT',
    priority: row.priority || 'MEDIUM',
    channel: row.channel || 'Direct',
    assignee: row.assignee_name || row.assigneeName || row.generator_name || row.generatorName || 'Unassigned',
    created: row.created_at ? (row.created_at.toISOString ? row.created_at.toISOString().slice(0, 10) : String(row.created_at).slice(0, 10)) :
              row.createdAt ? (row.createdAt.toISOString ? row.createdAt.toISOString().slice(0, 10) : String(row.createdAt).slice(0, 10)) : '',
    updated: row.updated_at ? (row.updated_at.toISOString ? row.updated_at.toISOString().slice(0, 10) : String(row.updated_at).slice(0, 10)) :
              row.updatedAt ? (row.updatedAt.toISOString ? row.updatedAt.toISOString().slice(0, 10) : String(row.updatedAt).slice(0, 10)) : '',
    dueDate: row.due_date ? (row.due_date.toISOString ? row.due_date.toISOString().slice(0, 10) : String(row.due_date).slice(0, 10)) :
             row.dueDate ? (row.dueDate.toISOString ? row.dueDate.toISOString().slice(0, 10) : String(row.dueDate).slice(0, 10)) : '',
    broker: row.broker_name || row.brokerName || '—',
    region: row.region || '—',
    notes: row.notes_json || row.notesJson || [],
    revisions: row.revision_count || row.revisionCount || 0,
    margin: parseFloat(row.margin_percent || row.marginPercent) || 0,
    toolSource: row.tool_source || row.toolSource,
    walletSI: row.wallet_si || row.walletSi,
    planTier: row.plan_tier || row.planTier,
    netPremium: parseFloat(row.net_premium || row.netPremium) || 0,
    gst: parseFloat(row.gst) || 0,
    ratePerEmployee: parseFloat(row.rate_per_employee || row.ratePerEmployee) || 0,
    generatedBy: row.generator_name || row.generatorName || ''
  };
}
