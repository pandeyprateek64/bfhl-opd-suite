-- BFHL OPD Suite — PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'SALES_EXEC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  quote_ref VARCHAR(50) UNIQUE NOT NULL,
  tool_source VARCHAR(20) NOT NULL,
  client_name VARCHAR(200) NOT NULL,
  client_id VARCHAR(50),
  employee_count INTEGER,
  family_construct VARCHAR(50),
  coverage_type VARCHAR(20),
  product_type VARCHAR(50) NOT NULL,
  wallet_si INTEGER,
  plan_tier VARCHAR(20),
  wellness_mode VARCHAR(10),
  rate_per_employee NUMERIC(10,2),
  net_premium NUMERIC(14,2),
  gst NUMERIC(14,2),
  gross_premium NUMERIC(14,2),
  benefit_count INTEGER DEFAULT 0,
  rates_json JSONB,
  brokerage NUMERIC(5,2),
  insurance_margin NUMERIC(5,2),
  opex_loading NUMERIC(5,2),
  status VARCHAR(20) DEFAULT 'DRAFT',
  priority VARCHAR(10) DEFAULT 'MEDIUM',
  channel VARCHAR(20) DEFAULT 'Direct',
  broker_name VARCHAR(100),
  region VARCHAR(50),
  assigned_to INTEGER REFERENCES users(id),
  generated_by INTEGER REFERENCES users(id),
  quote_date DATE,
  due_date DATE,
  notes_json JSONB DEFAULT '[]',
  revision_count INTEGER DEFAULT 0,
  margin_percent NUMERIC(5,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER REFERENCES quotes(id),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  old_value VARCHAR(100),
  new_value VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocation_batches (
  id SERIAL PRIMARY KEY,
  batch_date DATE NOT NULL,
  total_cases INTEGER NOT NULL,
  uw1_name VARCHAR(50) NOT NULL,
  uw1_count INTEGER NOT NULL,
  uw1_pct NUMERIC(5,1),
  uw2_name VARCHAR(50) NOT NULL,
  uw2_count INTEGER NOT NULL,
  uw2_pct NUMERIC(5,1),
  emp_threshold INTEGER DEFAULT 1000,
  source VARCHAR(20) DEFAULT 'MANUAL',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allocation_cases (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES allocation_batches(id),
  client_name VARCHAR(200) NOT NULL,
  rm_name VARCHAR(100),
  date_of_request DATE,
  expected_closure DATE,
  case_type VARCHAR(20),
  employee_count INTEGER,
  allocated_uw VARCHAR(50) NOT NULL,
  priority VARCHAR(10),
  auto_assigned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_generated_by ON quotes(generated_by);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_quote_id ON activity_log(quote_id);
