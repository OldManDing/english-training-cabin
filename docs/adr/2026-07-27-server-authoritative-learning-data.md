# ADR: Server-Authoritative Learning Data

Date: 2026-07-27
Status: Accepted

## Context

Learning progress was previously written primarily to browser IndexedDB. Clearing
site data removed the only current copy on that device, and whole-snapshot cloud
sync was manual. A whole snapshot also makes an empty or stale browser state
dangerous to upload.

## Decision

The authenticated server database is the authoritative source for learning data.
The browser IndexedDB database is an offline replica and retry buffer only.

Learning data is stored as independently versioned entities:

- `studyGoal`
- `practiceSession`
- `attempt`
- `reviewItem`
- `skillProfile`

Each learning transaction writes to IndexedDB first, then uploads the affected
entities automatically. Uploads are batched, serialized, retryable, and visible
through the sync status indicator. The server rejects timestamps more than five
minutes in the future and ignores older updates for the same entity key.

At login, the client merges local data, the legacy whole snapshot, and server
entities by entity key and `updatedAt`. Legacy snapshots are migrated into the
entity table. The merged result is written back with incremental `bulkPut`, so a
new local transaction cannot be deleted by a concurrent recovery operation.

## Consequences

Clearing browser data no longer removes server-confirmed learning records. A
device without local data can restore after login. A temporary network failure
does not discard a completed local transaction; it leaves a visible pending state
and retries on network recovery and every 30 seconds.

The app still supports explicit JSON export as a user-controlled secondary
backup. The legacy whole-snapshot endpoint remains for compatibility and backup
operations, but normal learning writes no longer depend on it.

This design does not guarantee recovery for a transaction that never reaches
IndexedDB, an account that cannot be authenticated, or a server database loss.
Production Postgres backup and restore operations remain required for those
infrastructure failures.
