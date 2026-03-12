require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());

// ─── Static files ───
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── DB ───
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'bfhl-dev-secret-change-in-production';

// ─── Auth Middleware ───
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ─── ROUTES ───

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/createUser  (ADMIN only)
app.post('/api/createUser', auth, requireRole('ADMIN'), async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role) return res.status(400).json({ error: 'All fields required' });
  const validRoles = ['ADMIN', 'PRICING_LEAD', 'UNDERWRITER', 'SALES_HEAD', 'SALES_EXEC'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email.toLowerCase().trim(), hash, name, role]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    console.error('createUser error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/me
app.get('/api/me', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/saveQuote
app.post('/api/saveQuote', auth, async (req, res) => {
  const d = req.body;
  try {
    // Check for duplicate quote_ref
    const existing = await pool.query('SELECT id FROM quotes WHERE quote_ref = $1', [d.quote_ref]);
    if (existing.rows.length > 0) {
      // Update instead of insert for duplicate refs (re-generation)
      return res.json({ success: true, id: existing.rows[0].id, message: 'Quote already exists' });
    }
    const result = await pool.query(
      `INSERT INTO quotes (
        quote_ref, tool_source, client_name, client_id, employee_count, family_construct,
        coverage_type, product_type, wallet_si, plan_tier, wellness_mode,
        rate_per_employee, net_premium, gst, gross_premium,
        benefit_count, rates_json, brokerage, insurance_margin, opex_loading,
        status, priority, channel, broker_name, region,
        assigned_to, generated_by, quote_date, due_date,
        notes_json, revision_count, margin_percent
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) RETURNING id`,
      [
        d.quote_ref, d.tool_source, d.client_name, d.client_id || null,
        d.employee_count || null, d.family_construct || null,
        d.coverage_type || null, d.product_type, d.wallet_si || null,
        d.plan_tier || null, d.wellness_mode || null,
        d.rate_per_employee || null, d.net_premium || null,
        d.gst || null, d.gross_premium || null,
        d.benefit_count || 0, d.rates_json ? JSON.stringify(d.rates_json) : null,
        d.brokerage != null ? d.brokerage * 100 : null,
        d.insurance_margin != null ? d.insurance_margin * 100 : null,
        d.opex_loading != null ? d.opex_loading * 100 : null,
        d.status || 'DRAFT', d.priority || 'MEDIUM',
        d.channel || 'Direct', d.broker_name || null, d.region || null,
        d.assigned_to || null, req.user.userId,
        d.quote_date || null, d.due_date || null,
        JSON.stringify(d.notes_json || []), d.revision_count || 0,
        d.margin_percent || null
      ]
    );
    // Log activity
    await pool.query(
      'INSERT INTO activity_log (quote_id, user_id, action, description) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, req.user.userId, 'CREATED', `Quote ${d.quote_ref} created via ${d.tool_source}`]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (e) {
    console.error('saveQuote error:', e);
    res.status(500).json({ error: 'Server error', detail: e.message });
  }
});

// GET /api/quotes
app.get('/api/quotes', auth, async (req, res) => {
  try {
    let query, params;
    const adminRoles = ['ADMIN', 'PRICING_LEAD', 'UNDERWRITER'];
    if (adminRoles.includes(req.user.role)) {
      query = `SELECT q.*, u1.name as assignee_name, u2.name as generator_name
               FROM quotes q
               LEFT JOIN users u1 ON q.assigned_to = u1.id
               LEFT JOIN users u2 ON q.generated_by = u2.id
               ORDER BY q.updated_at DESC`;
      params = [];
    } else if (req.user.role === 'SALES_HEAD') {
      // Sales Head sees team quotes (simplified: sees all for now — can be scoped to team later)
      query = `SELECT q.*, u1.name as assignee_name, u2.name as generator_name
               FROM quotes q
               LEFT JOIN users u1 ON q.assigned_to = u1.id
               LEFT JOIN users u2 ON q.generated_by = u2.id
               ORDER BY q.updated_at DESC`;
      params = [];
    } else {
      query = `SELECT q.*, u1.name as assignee_name, u2.name as generator_name
               FROM quotes q
               LEFT JOIN users u1 ON q.assigned_to = u1.id
               LEFT JOIN users u2 ON q.generated_by = u2.id
               WHERE q.generated_by = $1
               ORDER BY q.updated_at DESC`;
      params = [req.user.userId];
    }
    const result = await pool.query(query, params);
    // Map DB rows to tracker's expected object shape
    const quotes = result.rows.map(mapQuoteRow);
    res.json(quotes);
  } catch (e) {
    console.error('getQuotes error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/quotes/:id
app.get('/api/quotes/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, u1.name as assignee_name, u2.name as generator_name
       FROM quotes q
       LEFT JOIN users u1 ON q.assigned_to = u1.id
       LEFT JOIN users u2 ON q.generated_by = u2.id
       WHERE q.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const quote = result.rows[0];
    // Access control: SALES_EXEC can only see own quotes
    if (req.user.role === 'SALES_EXEC' && quote.generated_by !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(mapQuoteRow(quote));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/quotes/:id
app.patch('/api/quotes/:id', auth, async (req, res) => {
  const { status, notes, priority, assigned_to, broker_name, region, due_date } = req.body;
  const role = req.user.role;

  // Role-based status change restrictions
  const allowedStatusChanges = {
    ADMIN: ['DRAFT','SUBMITTED','UNDER_REVIEW','NEGOTIATION','APPROVED','REJECTED','EXPIRED'],
    PRICING_LEAD: ['DRAFT','SUBMITTED','UNDER_REVIEW','NEGOTIATION','APPROVED','REJECTED','EXPIRED'],
    UNDERWRITER: ['UNDER_REVIEW','APPROVED','REJECTED'],
    SALES_HEAD: ['DRAFT','SUBMITTED'],
    SALES_EXEC: ['DRAFT','SUBMITTED']
  };

  try {
    const existing = await pool.query('SELECT * FROM quotes WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    const quote = existing.rows[0];

    if (req.user.role === 'SALES_EXEC' && quote.generated_by !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let idx = 1;

    if (status && allowedStatusChanges[role]?.includes(status)) {
      updates.push(`status = $${idx++}`); values.push(status);
    }
    if (priority) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (assigned_to) { updates.push(`assigned_to = $${idx++}`); values.push(assigned_to); }
    if (broker_name !== undefined) { updates.push(`broker_name = $${idx++}`); values.push(broker_name); }
    if (region) { updates.push(`region = $${idx++}`); values.push(region); }
    if (due_date) { updates.push(`due_date = $${idx++}`); values.push(due_date); }
    if (notes) {
      const currentNotes = quote.notes_json || [];
      currentNotes.push({ text: notes, date: new Date().toISOString().slice(0,10), by: req.user.name });
      updates.push(`notes_json = $${idx++}`); values.push(JSON.stringify(currentNotes));
    }
    if (updates.length === 0) return res.json({ success: true, message: 'Nothing to update' });

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);
    await pool.query(`UPDATE quotes SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    if (status && status !== quote.status) {
      await pool.query(
        'INSERT INTO activity_log (quote_id, user_id, action, old_value, new_value, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.params.id, req.user.userId, 'STATUS_CHANGE', quote.status, status, `Status changed from ${quote.status} to ${status}`]
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('patchQuote error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stats
app.get('/api/stats', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [totalRes, todayRes, pipelineRes, activeRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM quotes'),
      pool.query('SELECT COUNT(*) FROM quotes WHERE DATE(created_at) = $1', [today]),
      pool.query("SELECT COALESCE(SUM(gross_premium),0) as total FROM quotes WHERE status NOT IN ('REJECTED','EXPIRED')"),
      pool.query("SELECT COUNT(*) FROM quotes WHERE status IN ('SUBMITTED','UNDER_REVIEW','NEGOTIATION')")
    ]);
    res.json({
      totalQuotes: parseInt(totalRes.rows[0].count),
      quotesToday: parseInt(todayRes.rows[0].count),
      pipelineValue: parseFloat(pipelineRes.rows[0].total),
      activeQuotes: parseInt(activeRes.rows[0].count)
    });
  } catch (e) {
    console.error('stats error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/activity
app.get('/api/activity', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.name as user_name, q.quote_ref
       FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN quotes q ON al.quote_id = q.id
       ORDER BY al.created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/saveAllocation
app.post('/api/saveAllocation', auth, async (req, res) => {
  const { batch_date, total_cases, uw1_name, uw1_count, uw1_pct, uw2_name, uw2_count, uw2_pct, emp_threshold, source, cases } = req.body;
  try {
    const batchResult = await pool.query(
      `INSERT INTO allocation_batches (batch_date, total_cases, uw1_name, uw1_count, uw1_pct, uw2_name, uw2_count, uw2_pct, emp_threshold, source, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [batch_date || new Date().toISOString().slice(0,10), total_cases, uw1_name, uw1_count, uw1_pct, uw2_name, uw2_count, uw2_pct, emp_threshold || 1000, source || 'MANUAL', req.user.userId]
    );
    const batchId = batchResult.rows[0].id;
    if (cases && cases.length > 0) {
      for (const c of cases) {
        await pool.query(
          `INSERT INTO allocation_cases (batch_id, client_name, rm_name, date_of_request, expected_closure, case_type, employee_count, allocated_uw, priority, auto_assigned)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [batchId, c.client_name, c.rm_name || null, c.date_of_request || null, c.expected_closure || null, c.case_type || null, c.employee_count || null, c.allocated_uw, c.priority || 'MEDIUM', c.auto_assigned || false]
        );
      }
    }
    res.json({ success: true, batchId });
  } catch (e) {
    console.error('saveAllocation error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/allocations
app.get('/api/allocations', auth, async (req, res) => {
  try {
    const batches = await pool.query(
      `SELECT ab.*, u.name as created_by_name FROM allocation_batches ab
       LEFT JOIN users u ON ab.created_by = u.id
       ORDER BY ab.created_at DESC LIMIT 20`
    );
    res.json(batches.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/webhook/allocation  (API Key auth for Power Automate)
app.post('/api/webhook/allocation', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.WEBHOOK_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  const cases = req.body;
  if (!Array.isArray(cases)) return res.status(400).json({ error: 'Expected array of cases' });
  // Run allocation logic
  const uw1Split = 0.65, uw2Split = 0.35;
  const empThreshold = 1000;
  const uw1 = 'Maruf', uw2 = 'Prateek';
  let uw1Count = 0, uw2Count = 0;
  const allocated = cases.map(c => {
    if (c.uw_name && c.uw_name.trim()) {
      return { ...c, allocated_uw: c.uw_name.trim(), auto_assigned: false };
    }
    const total = cases.filter(x => !x.uw_name).length;
    const uw2Target = Math.round(total * uw2Split);
    const isLarge = (parseInt(c.employee_count) || 0) > empThreshold;
    let assignedUW;
    if (isLarge && uw2Count < uw2Target) { assignedUW = uw2; uw2Count++; }
    else if (uw1Count <= Math.round(total * uw1Split) - 1) { assignedUW = uw1; uw1Count++; }
    else { assignedUW = uw2; uw2Count++; }
    return { ...c, allocated_uw: assignedUW, auto_assigned: true };
  });
  res.json({ success: true, allocated, uw1_count: uw1Count, uw2_count: uw2Count });
});

// ─── Helper: map DB row to tracker shape ───
function mapQuoteRow(row) {
  return {
    id: row.quote_ref || `Q-${row.id}`,
    dbId: row.id,
    client: row.client_name,
    product: row.product_type || row.tool_source,
    lives: row.employee_count || 0,
    premium: parseFloat(row.gross_premium) || 0,
    status: row.status || 'DRAFT',
    priority: row.priority || 'MEDIUM',
    channel: row.channel || 'Direct',
    assignee: row.assignee_name || row.generator_name || 'Unassigned',
    created: row.created_at ? row.created_at.toISOString().slice(0,10) : '',
    updated: row.updated_at ? row.updated_at.toISOString().slice(0,10) : '',
    dueDate: row.due_date ? row.due_date.toISOString ? row.due_date.toISOString().slice(0,10) : String(row.due_date).slice(0,10) : '',
    broker: row.broker_name || '—',
    region: row.region || '—',
    notes: row.notes_json || [],
    revisions: row.revision_count || 0,
    margin: parseFloat(row.margin_percent) || 0,
    toolSource: row.tool_source,
    walletSI: row.wallet_si,
    planTier: row.plan_tier,
    netPremium: parseFloat(row.net_premium) || 0,
    gst: parseFloat(row.gst) || 0,
    ratePerEmployee: parseFloat(row.rate_per_employee) || 0,
    generatedBy: row.generator_name || ''
  };
}

// ─── Seed users endpoint (only works in dev or if no users exist) ───
app.post('/api/seed', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count) > 0) {
      return res.json({ message: 'Users already seeded' });
    }
    const users = [
      { email: 'prateek@bfhl.co.in', name: 'Prateek S.', role: 'ADMIN', password: 'Bajaj@2026' },
      { email: 'rahul@bfhl.co.in', name: 'Rahul M.', role: 'PRICING_LEAD', password: 'Bajaj@2026' },
      { email: 'sneha@bfhl.co.in', name: 'Sneha K.', role: 'UNDERWRITER', password: 'Bajaj@2026' }
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query('INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4)', [u.email, hash, u.name, u.role]);
    }
    res.json({ success: true, message: '3 users seeded successfully' });
  } catch (e) {
    console.error('seed error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Catch-all: serve login.html for unknown routes ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BFHL OPD Suite running on port ${PORT}`));
