import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    name: string;
    role: string;
  };
}

export interface QuoteInput {
  quote_ref: string;
  tool_source: string;
  client_name: string;
  client_id?: string;
  employee_count?: number;
  family_construct?: string;
  coverage_type?: string;
  product_type: string;
  wallet_si?: number;
  plan_tier?: string;
  wellness_mode?: string;
  rate_per_employee?: number;
  net_premium?: number;
  gst?: number;
  gross_premium?: number;
  benefit_count?: number;
  rates_json?: any;
  brokerage?: number;
  insurance_margin?: number;
  opex_loading?: number;
  status?: string;
  priority?: string;
  channel?: string;
  broker_name?: string;
  region?: string;
  assigned_to?: number;
  quote_date?: string;
  due_date?: string;
  notes_json?: any[];
  revision_count?: number;
  margin_percent?: number;
}

export interface AllocationCase {
  client_name: string;
  rm_name?: string;
  date_of_request?: string;
  expected_closure?: string;
  case_type?: string;
  employee_count?: number;
  allocated_uw: string;
  priority?: string;
  auto_assigned?: boolean;
  uw_name?: string;
}
