# Technical decisions

- PostgreSQL connection credentials are mandatory environment variables; the
  application has no default username or password. If the previously committed
  local password was used outside development, it must be changed.
- `app.js` exports `createApp({ pool })` and never calls `listen()`, so route
  tests can inject a fake or test pool without opening a server.
- `server.js` owns configuration validation, pool creation, application
  initialization, HTTP listening and graceful shutdown.
- Database schema changes are applied through ordered files in
  `sql/migrations/` and tracked in `migration_history`.
- The initial migration includes the existing demo products with
  `ON CONFLICT (id) DO NOTHING`, so a fresh database is usable while rerunning
  the migration does not overwrite existing stock or prices.
- Migration 005 upgrades legacy Romanian table, enum and column identifiers
  before application queries use the English schema.
- Route tests use an injected pool mock with fixed rows; they never connect to
  the development database. A future integration suite may use a separate
  `TEST_DATABASE_URL`.
