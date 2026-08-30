---
name: postgresql-table-design
description: Use when designing or reviewing a PostgreSQL-specific schema. Covers best practices, data types, indexing, constraints, performance patterns, and advanced features.
---

# PostgreSQL Table Design

## Core Rules

- Define a **PRIMARY KEY** for reference tables (users, orders, etc.). Not always needed for
  time-series/event/log data. Prefer `BIGINT GENERATED ALWAYS AS IDENTITY`; use `UUID` only
  when global uniqueness/opacity is needed.
- **Normalize first (to 3NF)** to eliminate redundancy and update anomalies; denormalize
  **only** for measured, high-ROI reads where join performance is a proven problem.
- Add **NOT NULL** everywhere semantically required; use **DEFAULT**s for common values.
- Create **indexes for access paths you actually query**: PK/unique (auto), **FK columns
  (manual!)**, frequent filters/sorts, and join keys.
- Prefer **TIMESTAMPTZ** for event time; **NUMERIC** for money; **TEXT** for strings;
  **BIGINT** for integers; **DOUBLE PRECISION** for floats (or `NUMERIC` for exact decimal
  arithmetic).

## PostgreSQL "Gotchas"

- **Identifiers**: unquoted → lowercased. Use `snake_case`, avoid quoted/mixed-case names.
- **Unique + NULLs**: `UNIQUE` allows multiple NULLs by default. Use
  `UNIQUE (...) NULLS NOT DISTINCT` (PG15+) to restrict to one NULL.
- **FK indexes**: PostgreSQL does **not** auto-index FK columns — add them explicitly.
- **No silent coercions**: length/precision overflows error out (no truncation).
- **Sequences/identity have gaps** — normal (rollbacks, crashes, concurrent transactions);
  don't try to "fix" them.
- **Heap storage**: no clustered PK by default; `CLUSTER` is a one-off reorganization, not
  maintained on subsequent inserts.
- **MVCC**: updates/deletes leave dead tuples; vacuum handles them — design to avoid
  hot wide-row churn.

## Data Types

- **IDs**: `BIGINT GENERATED ALWAYS AS IDENTITY` preferred; `UUID` when merging/federating
  across systems, or for opaque IDs. Generate with `uuidv7()` (PG18+) or `gen_random_uuid()`.
- **Integers**: `BIGINT` unless storage is critical; `INTEGER` for smaller ranges.
- **Floats**: `DOUBLE PRECISION` over `REAL`; `NUMERIC` for exact decimal arithmetic.
- **Strings**: `TEXT`; enforce length with `CHECK (LENGTH(col) <= n)`, not `VARCHAR(n)`;
  avoid `CHAR(n)`. Large text/binary is auto-TOASTed with compression.
- **Money**: `NUMERIC(p,s)` — never `float` or the `money` type.
- **Time**: `TIMESTAMPTZ` for timestamps; `DATE` for date-only; `INTERVAL` for durations.
  Avoid bare `TIMESTAMP` (no timezone).
- **Booleans**: `BOOLEAN NOT NULL` unless a tri-state value is genuinely required.
- **Enums**: `CREATE TYPE ... AS ENUM` for small, stable sets. For evolving business-logic
  values (e.g. order statuses) use `TEXT` + `CHECK` or a lookup table instead.
- **Arrays**: `TEXT[]`, `INTEGER[]`, etc. — index with **GIN** for containment (`@>`) and
  overlap (`&&`). Good for tags/categories; use a junction table for real relations.
- **Range types**: `daterange`, `numrange`, `tstzrange` — index with **GiST**. Good for
  scheduling/versioning.
- **Network types**: `INET`, `CIDR`, `MACADDR`.
- **Text search**: `TSVECTOR`/`TSQUERY`, indexed with **GIN**; always specify a language
  (`to_tsvector('english', col)`).
- **JSONB**: preferred over `JSON`; index with **GIN**; use only for optional/semi-structured
  attributes.
- **Vector types**: the `vector` type (via `pgvector`) for embedding similarity search.

### Do not use

- `timestamp` (without timezone) → use `timestamptz`.
- `char(n)`/`varchar(n)` → use `text` (+ `CHECK` if a bound is needed).
- `money` → use `numeric`.
- `timetz` → use `timestamptz`.
- `serial` → use `generated always as identity`.

## Table Types

- **Regular**: default; fully durable, logged.
- **TEMPORARY**: session-scoped, auto-dropped, not logged.
- **UNLOGGED**: persistent but not crash-safe — faster writes, good for caches/staging.

## Row-Level Security

`ALTER TABLE tbl ENABLE ROW LEVEL SECURITY;` then
`CREATE POLICY user_access ON orders FOR SELECT TO app_users USING (user_id = current_user_id());`.

## Constraints

- **PK**: implicit UNIQUE + NOT NULL; B-tree index.
- **FK**: specify `ON DELETE/UPDATE` action; add an explicit index on the referencing
  column. Use `DEFERRABLE INITIALLY DEFERRED` for circular FK dependencies.
- **UNIQUE**: B-tree index; allows multiple NULLs unless `NULLS NOT DISTINCT` (PG15+).
- **CHECK**: row-local; NULL passes the check (three-valued logic) — combine with
  `NOT NULL` to enforce.
- **EXCLUDE**: prevents overlapping values (e.g. double-booking) using an operator +
  usually a GiST index.

## Indexing

- **B-tree**: default for equality/range (`=`, `<`, `>`, `BETWEEN`, `ORDER BY`).
- **Composite**: order matters — usable if there's equality on the leftmost prefix.
- **Covering**: `INCLUDE (...)` for index-only scans without visiting the table.
- **Partial**: for hot subsets (`WHERE status = 'active'`).
- **Expression**: for computed search keys (`LOWER(email)`).
- **GIN**: JSONB containment/existence, arrays, full-text search.
- **GiST**: ranges, geometry, exclusion constraints.
- **BRIN**: very large, naturally ordered data (time-series) — minimal storage overhead.

## Partitioning

- For very large tables (>100M rows) where queries consistently filter on the partition key.
- **RANGE** for time-series; **LIST** for discrete values; **HASH** for even distribution
  with no natural key.
- Prefer declarative partitioning; avoid table inheritance.
- No global UNIQUE constraints — the partition key must be part of the PK/UNIQUE.

## Special Considerations

**Update-heavy tables**: separate hot/cold columns; `fillfactor=90` for HOT updates; avoid
updating indexed columns.

**Insert-heavy workloads**: minimize indexes; use `COPY`/multi-row `INSERT`; consider
`UNLOGGED` for rebuildable staging data; defer index creation for bulk loads.

**Upsert-friendly design**: requires a UNIQUE index on the conflict target; use
`EXCLUDED.column`; `DO NOTHING` is faster than `DO UPDATE` when no update is actually needed.

**Safe schema evolution**: most DDL is transactional (test with `BEGIN; ... ROLLBACK;`);
`CREATE INDEX CONCURRENTLY` avoids blocking writes but can't run in a transaction; a
volatile default (`now()`, `gen_random_uuid()`) on a new `NOT NULL` column rewrites the
whole table — non-volatile defaults don't.

## Generated Columns

`... GENERATED ALWAYS AS (<expr>) STORED` for computed, indexable fields. PG18+ adds
`VIRTUAL` columns (computed on read).

## Extensions

`pgcrypto` (password hashing), `pg_trgm` (fuzzy text search), `citext` (case-insensitive
text — prefer an expression index on `LOWER(col)` unless you need a case-insensitive
constraint), `btree_gin`/`btree_gist` (mixed-type indexes), `timescaledb` (time-series
partitioning/retention/compression), `postgis` (geospatial), `pgvector` (embeddings),
`pgaudit` (audit logging).

## JSONB Guidance

- Prefer `JSONB` with a **GIN** index: `CREATE INDEX ON tbl USING GIN (jsonb_col);`
  accelerates containment (`@>`), key existence (`?`, `?|`, `?&`).
- Heavy `@>`-only workloads: `jsonb_path_ops` opclass for a smaller/faster index (loses key
  existence support).
- Equality/range on one scalar field: extract to a generated column and index with B-tree.
- Keep core relations in tables; use JSONB for optional/variable attributes.

## Examples

```sql
CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON users (LOWER(email));
CREATE INDEX ON users (created_at);

CREATE TABLE orders (
  order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','CANCELED')),
  total NUMERIC(10,2) NOT NULL CHECK (total > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON orders (user_id);
CREATE INDEX ON orders (created_at);

CREATE TABLE profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
  attrs JSONB NOT NULL DEFAULT '{}',
  theme TEXT GENERATED ALWAYS AS (attrs->>'theme') STORED
);
CREATE INDEX profiles_attrs_gin ON profiles USING GIN (attrs);
```
