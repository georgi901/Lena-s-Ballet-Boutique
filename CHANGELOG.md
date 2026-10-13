# Changelog

## [Unreleased]

- Separated the Express application from server startup.
- Added environment-based configuration and PostgreSQL pool creation.
- Added an idempotent migration runner and the initial products migration.
- Added a database-backed `/health` endpoint.
- Removed the PostgreSQL password fallback from application code and replaced
  it with a demonstrative `.env.example` placeholder.
- Added a PostgreSQL-backed checkout with clients, orders, order items,
  server-side price and stock verification, transaction rollback, confirmation
  tokens and duplicate-submit protection.
- Added automated checkout tests for validation, totals, rollback and
  idempotency.
- Added password-based authentication with `crypto.scrypt`, PostgreSQL-backed
  sessions, secure HTTP-only cookies, registration, login/logout and order
  history for authenticated users.
- Added an admin dashboard protected by the `admin` role, with order status
  updates and product price/stock management.
- Added CSRF protection for browser forms, security response headers, login
  rate limiting and removed startup debug logging.
- Updated `sharp` and Vitest to patched releases; `npm audit` now reports zero
  known vulnerabilities.
- Added GitHub Actions CI for dependency auditing, JavaScript syntax checks,
  automated tests and the Sass build on pushes and pull requests.
- Added Render deployment configuration, production database SSL handling,
  migration startup and deployment documentation.
- Translated the main customer-facing catalogue, product, cart and checkout
  surfaces into English and standardised displayed prices to RON.
- Updated the English README with the current feature set, local setup,
  testing, security and deployment instructions.
- Completed the English translation of the active customer-facing pages,
  catalogue interactions, gallery pages, homepage content, error messages and
  project documentation.
- Added a migration that replaces the seeded demo product descriptions,
  recommendations, care instructions, colours and materials with English
  content.
