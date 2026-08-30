---
name: drizzle-orm-patterns
description: Provides comprehensive Drizzle ORM patterns for schema definition, CRUD operations, relations, queries, transactions, and migrations. Use for any Drizzle ORM development including defining database schemas, writing type-safe queries, implementing relations, managing transactions, and setting up migrations with Drizzle Kit. Supports PostgreSQL, MySQL, SQLite, MSSQL, and CockroachDB.
---

# Drizzle ORM Patterns

## Overview

Expert guide for building type-safe database applications with Drizzle ORM. Covers schema
definition, relations, queries, transactions, and migrations across all supported databases.

## When to Use

- Defining database schemas with tables, columns, and constraints.
- Creating relations between tables (one-to-one, one-to-many, many-to-many).
- Writing type-safe CRUD queries.
- Implementing complex joins and aggregations.
- Managing database transactions with rollback.
- Setting up migrations with Drizzle Kit.

## Quick Reference

| Database | Table Function | Import |
|----------|---------------|--------|
| PostgreSQL | `pgTable()` | `drizzle-orm/pg-core` |
| MySQL | `mysqlTable()` | `drizzle-orm/mysql-core` |
| SQLite | `sqliteTable()` | `drizzle-orm/sqlite-core` |
| MSSQL | `mssqlTable()` | `drizzle-orm/mssql-core` |

| Operation | Method | Example |
|-----------|--------|---------|
| Insert | `db.insert()` | `db.insert(users).values({...})` |
| Select | `db.select()` | `db.select().from(users).where(eq(...))` |
| Update | `db.update()` | `db.update(users).set({...}).where(...)` |
| Delete | `db.delete()` | `db.delete(users).where(...)` |
| Transaction | `db.transaction()` | `db.transaction(async (tx) => {...})` |

## Instructions

1. Identify your database dialect — PostgreSQL, MySQL, SQLite, MSSQL, or CockroachDB.
2. Define your schema using the matching table function.
3. Set up relations using `relations()` or `defineRelations()`.
4. Initialize the Drizzle client with proper credentials.
5. Write queries with the query builder for type-safe CRUD.
6. Wrap multi-step operations in transactions when needed.
7. Configure Drizzle Kit for schema management/migrations.

## Examples

### Basic Schema and Query

```typescript
import { pgTable, serial, text } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

const db = drizzle(process.env.DATABASE_URL);
const [user] = await db.select().from(users).where(eq(users.id, 1));
```

### CRUD Operations

```typescript
import { eq } from 'drizzle-orm';

const [newUser] = await db.insert(users).values({
  name: 'Jane',
  email: 'jane@example.com',
}).returning();

await db.update(users).set({ name: 'Jane Updated' }).where(eq(users.id, 1));
await db.delete(users).where(eq(users.id, 1));
```

### Transaction with Rollback

```typescript
await db.transaction(async (tx) => {
  const [from] = await tx.select().from(accounts).where(eq(accounts.userId, fromId));
  if (from.balance < amount) tx.rollback();

  await tx.update(accounts)
    .set({ balance: sql`${accounts.balance} - ${amount}` })
    .where(eq(accounts.userId, fromId));
});
```

## Best Practices

1. **Type Safety** — always leverage `$inferInsert` / `$inferSelect`, never a manually
   maintained parallel type.
2. **Relations** — define with the `relations()` API for nested queries.
3. **Transactions** — use them for multi-step operations that must succeed together.
4. **Migrations** — `generate` + `migrate` in production, `push` for local development.
5. **Indexes** — add on frequently queried columns and every foreign key (not automatic).
6. **Soft Deletes** — a `deletedAt` timestamp instead of hard deletes when audit history
   matters.
7. **Pagination** — cursor-based for large datasets.
8. **Query Optimization** — `.limit()` and `.where()` to fetch only needed data.

## Constraints and Warnings

- **Foreign key definitions** — use arrow functions (`() => table.column`) to avoid
  circular-dependency issues between schema files.
- **`tx.rollback()` throws** — wrap in try/catch if you need to react to it explicitly.
- **`.returning()`** isn't supported by every dialect — check compatibility.
- **Batch inserts** may hit database limits — chunk large batches.
- **Test migrations in staging** before applying to production.

## Further reading

- [Drizzle ORM documentation](https://orm.drizzle.team/)
- [Drizzle Kit migrations guide](https://orm.drizzle.team/kit-docs/overview)
