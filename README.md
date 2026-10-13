# Lena's Ballet Boutique

Full-stack e-commerce application for ballet shoes, costumes and accessories,
built to demonstrate production-minded backend engineering, secure workflows
and reliable data handling.

**Project focus:** catalogue management, validated shopping carts,
transactional checkout, authentication, role-based administration and
deployment readiness.

## Why this project is relevant

- Designed a PostgreSQL data model for products, inventory, customers, users,
  sessions, orders and order items.
- Implemented checkout with database transactions, row-level stock locking,
  atomic inventory updates, historical prices and duplicate-submission
  protection.
- Built authentication with `crypto.scrypt`, hashed session tokens, secure
  cookies and persistent order history.
- Added server-side price and stock validation instead of trusting browser
  state.
- Applied CSRF protection, security headers, production HSTS and
  authentication rate limiting.
- Added automated tests, CI checks, database migrations, health checks and a
  Render deployment blueprint.

## Features

- Product catalogue with categories, filtering, sorting, pagination and
  inventory.
- Responsive EJS frontend with Bootstrap, Sass and browser-side JavaScript.
- `localStorage` cart with server-side validation.
- Customer registration, login, logout and order history.
- Role-protected administration for inventory and order statuses.
- Static and animated galleries with responsive image variants.
- Demonstrative cash-on-delivery and test payment options; no real card data
  is collected.

## Technical highlights

| Area | Implementation |
| --- | --- |
| Backend | Node.js, Express 5, CommonJS |
| Frontend | EJS, JavaScript, Bootstrap, Sass |
| Database | PostgreSQL with ordered idempotent migrations |
| Security | `crypto.scrypt`, hashed sessions, CSRF, security headers, rate limiting |
| Testing | Vitest, Supertest, syntax checks and Sass builds |
| Delivery | GitHub Actions CI, Render blueprint and `/health` endpoint |

## Technology

| Area | Technology |
| --- | --- |
| Runtime | Node.js 22+, CommonJS |
| Server | Express 5 |
| Templates | EJS |
| Database | PostgreSQL |
| Frontend | JavaScript, Bootstrap, Sass |
| Image processing | Sharp |
| Testing | Vitest, Supertest |
| CI/CD | GitHub Actions, Render |

## Local setup

### Requirements

- Node.js 22 or newer
- PostgreSQL 14 or newer
- npm

### Installation

```bash
npm ci
cp .env.example .env
```

Configure `.env` with either `DATABASE_URL` or the complete `PG*`
configuration, then run:

```bash
npm run migrate
npm run build:scss
npm test
npm start
```

The default local URL is `http://localhost:8080`.

## Environment variables

The application requires either `DATABASE_URL` or all of `PGHOST`, `PGPORT`,
`PGDATABASE`, `PGUSER` and `PGPASSWORD`.

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | HTTP port supplied by the host |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Set to `true` for a managed production database |
| `PGHOST` / `PGPORT` | PostgreSQL host and port |
| `PGDATABASE` / `PGUSER` / `PGPASSWORD` | PostgreSQL database credentials |
| `NEW_PRODUCT_DAYS` | Number of days used for the new-product badge |

Never commit `.env` files or real credentials.

## Scripts

```bash
npm start              # Start the production server
npm run migrate        # Apply pending SQL migrations
npm run build:scss     # Compile Sass into assets/css
npm test               # Run the automated test suite
npm run test:coverage  # Generate coverage output
npm run test:watch     # Run Vitest in watch mode
```

## Architecture

```text
app.js                    Express application factory
server.js                 Production server entry point
config.js                 Environment validation
db.js                     PostgreSQL pool creation
modules/           Domain and database modules
sql/migrations/           Ordered idempotent migrations
scripts/migrate.js        Migration runner
views/                    EJS templates
assets/js/               Browser-side modules
tests/                    Unit and route tests
.github/workflows/ci.yml  Continuous integration
render.yaml               Render deployment blueprint
```

The application is created through `createApp({ pool })`, which keeps the
Express layer testable without requiring a live database connection. The
production entry point owns pool creation, startup and graceful shutdown.

## Database migrations

Migrations are applied in numeric order and recorded in
`migration_history`:

1. `001_products.sql` — product catalogue and demo products.
2. `002_orders.sql` — clients, orders and order items.
3. `003_authentication.sql` — users, sessions and order ownership.
4. `004_translate_demo_products.sql` — English demo product content.
5. `005_rename_schema_to_english.sql` — upgrades legacy Romanian table,
   enum and column identifiers to the English schema used by the application.

The migration runner is idempotent and is executed automatically by the
Render start command before the application starts.

## Testing and quality checks

The test suite covers product queries, routes, cart validation, checkout
transactions, idempotency, authentication, administration and security
middleware. The CI workflow runs:

```bash
npm ci
npm audit --audit-level=moderate
node --check app.js
npm test -- --run
npm run build:scss
```

The current local verification passes all automated tests and reports no
known npm vulnerabilities. Sass currently emits deprecation warnings from
Bootstrap's upstream Sass implementation; these warnings do not fail the
build.

## Deployment

The repository includes a Render Blueprint. Read
[`docs/DEPLOY.md`](docs/DEPLOY.md) for database provisioning, environment
variables, migrations, health checks and production verification.

The `/health` endpoint reports the application and database status. The
production database can use SSL through `DATABASE_SSL=true`.

## Payment scope

Checkout is intentionally demonstrative and currently supports cash on
delivery or a demo payment option. No real card details are collected and no
payment provider is integrated.

## Portfolio summary

This project demonstrates relational data modelling, server-side validation,
transactional business logic, inventory consistency, authentication,
role-based authorization, defensive security controls, automated testing,
continuous integration and deployment preparation.
