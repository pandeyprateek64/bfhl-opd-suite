# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BFHL OPD Suite is an internal platform for Bajaj Finserv Health's pricing and underwriting operations. It's a full-stack web application that manages insurance quotes, case allocations, and user workflows with role-based access control.

**Tech Stack:**
- Backend: Node.js + Express + TypeScript (via tsx)
- ORM: Drizzle ORM with PostgreSQL driver
- Database: PostgreSQL (Neon)
- Frontend: Vanilla HTML/CSS/JS (no framework)
- Auth: JWT + bcryptjs
- Deployment: Railway (configured via railway.json)

## Development Commands

```bash
# Install dependencies
npm install

# Run server (development with hot reload)
npm run dev

# Run old server (legacy, will be removed)
npm run dev:old

# Run server (production)
npm start

# Database commands
npm run db:generate  # Generate migration files from schema changes
npm run db:migrate   # Apply migrations to database
npm run db:push      # Push schema directly to database (dev)
npm run db:studio    # Open Drizzle Studio (database GUI)
```

Server runs on port 3000 by default (configurable via `PORT` env var).

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure these required variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Random 64-char secret for JWT signing
   - `NODE_ENV`: `development` or `production`
   - `WEBHOOK_API_KEY`: (optional) For Power Automate webhook integration

3. Initialize database:
```bash
# Push Drizzle schema to database (first time setup)
npm run db:push

# Seed initial users (POST to /api/seed when no users exist)
curl -X POST http://localhost:3000/api/seed
```

Default seeded users (password: `Bajaj@2026`):
- `prateek@bfhl.co.in` - ADMIN
- `rahul@bfhl.co.in` - PRICING_LEAD
- `sneha@bfhl.co.in` - UNDERWRITER

## Architecture

### Role-Based Access Control

The system has 5 roles with hierarchical permissions:
1. **ADMIN**: Full system access, can create users
2. **PRICING_LEAD**: View all quotes, approve/reject quotes, manage workflows
3. **UNDERWRITER**: Review quotes, approve/reject assigned cases
4. **SALES_HEAD**: View team quotes, manage sales pipeline
5. **SALES_EXEC**: Create quotes, view own quotes only

Role-specific status transitions are enforced in `backend/utils/constants.ts` via the `ALLOWED_STATUS_CHANGES` object.

### Data Flow

**Quote Creation:**
1. External pricing tools (e.g., Excel/Python calculators) POST quote data to `/api/saveQuote`
2. Quote stored in `quotes` table with `generated_by` = current user
3. Activity logged to `activity_log` table
4. Duplicate `quote_ref` detection: returns existing ID instead of creating duplicate

**Quote Lifecycle:**
- `DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `NEGOTIATION` → `APPROVED`/`REJECTED`/`EXPIRED`
- Status transitions are role-restricted (see `allowedStatusChanges` in server.js)
- Each status change creates an activity log entry

**Case Allocation:**
- Two underwriters (Maruf/Prateek) with configurable split ratios (default 65/35)
- Large cases (>1000 employees) prioritized to UW2
- Power Automate webhook available at `/api/webhook/allocation` (requires `WEBHOOK_API_KEY`)

### Backend Architecture

The backend follows a modular, layered architecture:

**Directory Structure:**
```
backend/
├── index.ts              # Application entry point
├── db/
│   ├── index.ts         # Drizzle DB connection
│   └── schema.ts        # Database schema definitions
├── middleware/
│   ├── auth.ts          # JWT authentication
│   └── requireRole.ts   # Role-based access control
├── routes/              # Express route definitions
├── controllers/         # Request/response handling
├── services/            # Business logic & database operations
├── utils/
│   ├── constants.ts     # Valid roles, status transitions
│   └── mappers.ts       # Data transformation functions
├── types/
│   └── index.ts         # TypeScript interfaces
├── drizzle/             # Drizzle migration files
├── server.js            # Legacy server (for reference)
└── README.md            # Backend documentation
```

**Layers:**
1. **Routes** (`src/routes/`): Define API endpoints and attach middleware
2. **Controllers** (`src/controllers/`): Handle HTTP requests, validate input, return responses
3. **Services** (`src/services/`): Contain business logic and Drizzle ORM queries
4. **Database** (`src/db/schema.ts`): Drizzle schema definitions with type safety

**Service-Controller Pattern:**
- Controllers call services for data operations
- Services use Drizzle ORM for type-safe database queries
- All database operations return TypeScript-typed results
- Error handling at controller level

### Database Schema

**Key Tables:**
- `users`: User accounts with role-based permissions
- `quotes`: Insurance quotes with full pricing breakdown
- `activity_log`: Audit trail for quote changes
- `allocation_batches`: UW workload distribution records
- `allocation_cases`: Individual case assignments

**Schema Management:**
- Schema defined in `backend/db/schema.ts` using Drizzle ORM
- Migrations stored in `backend/drizzle/` directory
- Migrations generated via `npm run db:generate`
- Database uses snake_case column names, TypeScript uses camelCase
- Drizzle handles mapping automatically

**Important Fields:**
- `quotes.rates_json`: JSONB field storing detailed rate breakdowns from pricing tools
- `quotes.notes_json`: JSONB array of timestamped notes with user attribution
- Percentage fields (`brokerage`, `insurance_margin`, `opex_loading`) stored as basis points (multiply by 100 when saving)

### Frontend Architecture

- **login.html**: JWT-based authentication, stores token in localStorage
- **dashboard.html**: Main application UI with role-specific views
- Static files served from `frontend/` directory
- Catch-all route serves login.html for unknown paths
- Authorization header: `Bearer <token>` format

### Auth Middleware

`auth()` middleware (`backend/middleware/auth.ts`) validates JWT and attaches `req.user` object:
```typescript
req.user = {
  userId: number,
  email: string,
  name: string,
  role: 'ADMIN' | 'PRICING_LEAD' | 'UNDERWRITER' | 'SALES_HEAD' | 'SALES_EXEC'
}
```

`requireRole(...roles)` middleware (`backend/middleware/requireRole.ts`) restricts endpoints to specific roles.

## API Patterns

**Authentication:**
- All `/api/*` routes (except `/api/login` and `/api/seed`) require JWT auth
- `/api/webhook/allocation` uses API key auth (`x-api-key` header)

**Access Control:**
- SALES_EXEC users only see quotes where `generated_by = req.user.userId`
- ADMIN/PRICING_LEAD/UNDERWRITER see all quotes
- SALES_HEAD sees all quotes (can be scoped to team in future)

**Data Mapping:**
- Database rows mapped to frontend shape via `mapQuoteRow()` (`backend/utils/mappers.ts`)
- Drizzle ORM handles snake_case ↔ camelCase conversion automatically
- Frontend uses `quote_ref` as display ID, `id` for database operations

## Important Conventions

- Quote reference format: Tool-generated, must be unique (e.g., `OPD-2026-001`)
- Dates stored as DATE type, formatted as `YYYY-MM-DD` in JSON responses
- Currency amounts in rupees, stored as NUMERIC with 2 decimal places
- JWT expiry: 12 hours (configurable in `backend/utils/constants.ts`)
- PostgreSQL SSL enabled in production (`NODE_ENV=production`)
- TypeScript: Uses `tsx` for development (no build step), compiles on the fly

## Deployment

Railway auto-deploys from main branch:
- Nixpacks builder detects Node.js + TypeScript project
- Start command: `tsx backend/index.ts` (configured in railway.json)
- Restart policy: ON_FAILURE with max 10 retries
- DATABASE_URL automatically injected by Railway's PostgreSQL plugin
- tsx automatically installed as dependency for production use
