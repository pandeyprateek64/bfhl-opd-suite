# Backend Source Code

This directory (`backend/`) contains the modular TypeScript backend implementation using Drizzle ORM.

**Directory Structure:**
```
backend/
├── index.ts         # Application entry point
├── db/              # Database layer (schema, connection)
├── middleware/      # Auth middleware
├── routes/          # API route definitions
├── controllers/     # Request handlers
├── services/        # Business logic & database operations
├── utils/           # Constants & mappers
├── types/           # TypeScript interfaces
├── drizzle/         # Database migration files
├── server.js        # Legacy server (for reference)
└── README.md        # This file
```

## Architecture Overview

The codebase follows a layered architecture pattern:

```
Request → Routes → Controllers → Services → Database
                      ↓
                 Middleware (auth, roles)
```

## Directory Structure

### `/db` - Database Layer
- **schema.ts**: Drizzle ORM schema definitions for all tables
- **index.ts**: Database connection configuration

### `/middleware` - HTTP Middleware
- **auth.ts**: JWT token validation
- **requireRole.ts**: Role-based access control

### `/routes` - API Routes
Each route file defines HTTP endpoints for a specific domain:
- `auth.routes.ts` - Authentication (login, seed)
- `user.routes.ts` - User management
- `quote.routes.ts` - Quote operations
- `stats.routes.ts` - Dashboard statistics
- `activity.routes.ts` - Activity logging
- `allocation.routes.ts` - Case allocation
- `index.ts` - Aggregates all routes

### `/controllers` - Request Handlers
Controllers handle HTTP requests and responses:
- Validate request input
- Call appropriate service methods
- Handle errors and return responses
- One controller per route file

### `/services` - Business Logic
Services contain business logic and database operations:
- Type-safe Drizzle ORM queries
- Data transformations
- Business rule enforcement
- Reusable across controllers

### `/utils` - Shared Utilities
- **constants.ts**: Valid roles, status transitions, JWT config
- **mappers.ts**: Data transformation functions (DB → API format)

### `/types` - TypeScript Definitions
- **index.ts**: Shared TypeScript interfaces and types

## Key Patterns

### Service Pattern
```typescript
// Service handles database operations
export async function findUserById(id: number) {
  return await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
}

// Controller calls service
export async function getUser(req: AuthRequest, res: Response) {
  const user = await findUserById(req.params.id);
  res.json(user);
}
```

### Middleware Chain
```typescript
router.post('/createUser',
  auth,                    // Validate JWT
  requireRole('ADMIN'),    // Check role
  createUserController     // Handle request
);
```

### Type Safety
```typescript
// Drizzle provides full type safety
const result = await db.select().from(quotes);
// result is typed as Quote[]

// TypeScript autocomplete works
result[0].clientName  // ✓
result[0].client_name // ✗ TypeScript error
```

## Database Queries

All queries use Drizzle ORM for type safety:

```typescript
// SELECT with WHERE
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

// INSERT with RETURNING
const newQuote = await db
  .insert(quotes)
  .values({ ... })
  .returning({ id: quotes.id });

// UPDATE
await db
  .update(quotes)
  .set({ status: 'APPROVED' })
  .where(eq(quotes.id, quoteId));

// JOIN
const result = await db
  .select()
  .from(quotes)
  .leftJoin(users, eq(quotes.assignedTo, users.id));
```

## Adding New Features

### 1. Add a new API endpoint:

**Step 1**: Define service method
```typescript
// backend/services/quote.service.ts
export async function archiveQuote(id: number) {
  await db
    .update(quotes)
    .set({ status: 'ARCHIVED' })
    .where(eq(quotes.id, id));
}
```

**Step 2**: Create controller
```typescript
// backend/controllers/quote.controller.ts
export async function archiveQuoteController(req: AuthRequest, res: Response) {
  await archiveQuote(parseInt(req.params.id));
  res.json({ success: true });
}
```

**Step 3**: Add route
```typescript
// backend/routes/quote.routes.ts
router.post('/quotes/:id/archive', auth, requireRole('ADMIN'), archiveQuoteController);
```

### 2. Add a new database table:

**Step 1**: Define schema
```typescript
// backend/db/schema.ts
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

**Step 2**: Generate migration
```bash
npm run db:generate
```

**Step 3**: Apply migration
```bash
npm run db:push  # or db:migrate for production
```

**Step 4**: Create service methods, controllers, routes as above

## Best Practices

1. **Keep controllers thin**: Move logic to services
2. **Use TypeScript types**: Leverage Drizzle's type inference
3. **Handle errors**: Try-catch in controllers, return proper status codes
4. **Validate input**: Check required fields before calling services
5. **Use middleware**: Don't repeat auth/authorization logic
6. **Follow patterns**: Maintain consistency with existing code

## Testing

Test endpoints with curl:
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"prateek@bfhl.co.in","password":"Bajaj@2026"}' \
  | jq -r .token)

# Use token
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer $TOKEN"
```

## Database Management

```bash
# View database in GUI
npm run db:studio

# Generate migration from schema changes
npm run db:generate

# Push schema to database (dev)
npm run db:push

# Apply migrations (production)
npm run db:migrate
```

## Common Issues

**TypeScript errors**: Run `npx tsc --noEmit` to check for type errors

**Database errors**: Check DATABASE_URL in .env file

**Import errors**: Use absolute imports from project root

**Port in use**: Kill process on port 3000 or change PORT env var
