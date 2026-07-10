# Legacy Database Files (Unused)

**Moved here on:** 2026-07-04
**Reason:** Architecture cleanup — these files are dead code.

## What These Files Are

These SQL scripts were part of an early design that split data across 4 separate
databases (`allusers`, `patents`, `doctors`, `admins`). That design was
abandoned in favor of a single unified database (`medical_center`) which holds
all tables, users, and relationships.

## Why They Are Unused

A full audit of every `.php`, `.js`, and `.html` file in the project confirmed
that **no application code references any of these 4 databases**. The sole
database connection (`DataBase/db_connect.php`) points exclusively to
`medical_center`.

## Files

| File | Created | Purpose (legacy) |
|---|---|---|
| `create_databases.sql` | 2026-02-19 | Creates all 5 databases (4 unused + `medical_center`) |
| `allusers_simple.sql` | 2026-02-19 | Seeds the `allusers` DB with user rows |
| `patents_simple.sql` | 2026-02-19 | Seeds the `patents` DB with patient rows |
| `doctors_simple.sql` | 2026-06-16 | Seeds the `doctors` DB with doctor rows |
| `admins_simple.sql` | 2026-02-19 | Seeds the `admins` DB with admin rows |

## Safe to Delete?

Yes — after your review. No runtime code depends on any of these files.

**Note:** `DataBase/master_setup.sql` still references these files via `SOURCE`
commands (lines 5, 9–12). If you delete these files permanently, you should also
update `master_setup.sql` to remove the stale `SOURCE` lines and the
`create_databases.sql` reference.
