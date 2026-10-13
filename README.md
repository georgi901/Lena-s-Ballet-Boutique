# Lena's Ballet Boutique

Lena's Ballet Boutique is a full-stack e-commerce application for ballet
shoes, costumes and accessories. It started as a PostgreSQL-backed catalogue
and was extended into a portfolio-ready application with transactional
checkout, authentication, order history, administration, security controls,
automated tests and deployment automation.

## Features

- PostgreSQL product catalogue with categories, pricing and inventory.
- Responsive EJS pages with Bootstrap, Sass and browser-side JavaScript.
- Client-side cart persisted in `localStorage`.
- Server-side cart validation using trusted database prices and stock.
- Transactional checkout with:
  - row-level locking;
  - atomic inventory updates;
  - historical order prices;
  - delivery cost calculation;
  - idempotency protection against duplicate submissions.
- Account registration, login, logout and authenticated order history.
- Password hashing with Node.js `crypto.scrypt`.
- Hashed PostgreSQL session tokens with secure HTTP-only cookies.
- Role-protected admin dashboard for inventory and order status management.
- CSRF protection for browser forms.
- Security headers, production HSTS and login/registration rate limiting.
- Static and animated gallery pages with responsive image variants.
- Vitest and Supertest automated tests.
- GitHub Actions CI with audit, syntax, test and Sass-build checks.
- Render deployment blueprint with migrations and `/health` checks.

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
