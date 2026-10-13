# Lena's Ballet Boutique

![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933.svg?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-black.svg?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791.svg?logo=postgresql&logoColor=white)
![Tests](https://img.shields.io/badge/tests-35%20passing-success.svg)

Lena's Ballet Boutique is a full-stack e-commerce application for ballet
shoes, costumes and accessories. It started as a PostgreSQL-backed catalogue
and was expanded into a portfolio-oriented application with transactional
checkout, authentication, administration, security controls, automated tests
and deployment preparation.

## Description

The application provides a complete online shopping flow for ballet products.
Customers can browse and filter the catalogue, manage a persistent cart,
create an account, place orders and review their order history.

The project also includes administrative workflows for inventory and order
management. The backend validates product prices, stock and checkout data on
the server, while PostgreSQL transactions protect inventory consistency during
concurrent orders.

## Features

- Product catalogue with categories, pricing, stock and product details.
- Search, filtering, two-key sorting, pagination and product modals.
- Responsive EJS frontend with Bootstrap, Sass and browser-side JavaScript.
- Persistent `localStorage` shopping cart.
- Server-side cart validation using trusted database prices and stock.
- Transactional checkout with:
  - row-level stock locking;
  - atomic inventory updates;
  - historical order prices;
  - delivery cost calculation;
  - duplicate-submission protection.
- Customer registration, login, logout and authenticated order history.
- Password hashing with Node.js `crypto.scrypt`.
- Hashed PostgreSQL session tokens and secure HTTP-only cookies.
- Role-protected administration for inventory and order statuses.
- CSRF protection, security headers, production HSTS and rate limiting.
- Static and animated galleries with responsive image variants.
- GitHub Actions CI and a Render deployment blueprint.

## Engineering implementation

The project keeps the Express application separate from the production server:

- `app.js` exports `createApp({ pool })` and contains the HTTP application.
- `server.js` validates configuration, creates the database pool, starts the
  server and handles graceful shutdown.
- Database access is organized into domain modules for products, orders,
  authentication, administration and security.
- Checkout uses a database transaction, row locks and atomic stock updates.
- Session tokens are hashed before storage, so raw session tokens are not
  persisted in PostgreSQL.
- Tests inject a mock database pool and do not require production credentials.

## Requirements

- Node.js 22 or newer.
- PostgreSQL 14 or newer.
- npm.

## Local setup

From the repository root:

```bash
npm ci
cp .env.example .env
```

Configure `.env` with either `DATABASE_URL` or the complete PostgreSQL
configuration. Then apply migrations, build the stylesheets and start the
application:

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
| `PORT` | HTTP port supplied by the hosting platform |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Set to `true` for a managed production database |
| `PGHOST` / `PGPORT` | PostgreSQL host and port |
| `PGDATABASE` / `PGUSER` / `PGPASSWORD` | PostgreSQL database credentials |
| `NEW_PRODUCT_DAYS` | Number of days used for the new-product badge |

Never commit `.env` files or real credentials.

## Run the application

Start the production server locally with:

```bash
npm start
```

Check the application and database health with:

```bash
curl http://localhost:8080/health
```

The expected response is:

```json
{"status":"ok"}
```

## Run tests

Run the complete automated test suite with:

```bash
npm test -- --run
```

The suite currently contains 35 tests covering:

- product queries, filtering and transformations;
- routes and error handling;
- cart validation;
- checkout transactions, stock updates and idempotency;
- authentication, sessions and password handling;
- role-based administration;
- CSRF protection, security headers and rate limiting.

Additional quality commands:

```bash
npm run test:coverage
npm run build:scss
npm audit --audit-level=moderate
```

## Project structure

```text
.
├── assets/                 # Images, stylesheets, browser scripts and gallery data
├── docs/                   # Baseline, decisions, deployment and manual test docs
├── modules/                # Product, order, authentication, admin and security logic
├── scripts/                # Database migration runner
├── sql/migrations/         # Ordered, idempotent PostgreSQL migrations
├── tests/                  # Vitest, Supertest and mock database tests
├── views/pages/            # EJS page templates
├── views/partials/         # Shared EJS components
├── app.js                  # Express application factory
├── server.js               # Production server entry point
├── config.js               # Environment validation
├── db.js                   # PostgreSQL pool creation
├── render.yaml             # Render deployment blueprint
└── vitest.config.js        # Test configuration
```

## Database migrations

Migrations are applied in numeric order and recorded in
`migration_history`:

1. `001_products.sql` — products, categories and demo catalogue data.
2. `002_orders.sql` — customers, orders and order items.
3. `003_authentication.sql` — users, sessions and order ownership.
4. `004_translate_demo_products.sql` — English demo product content.
5. `005_rename_schema_to_english.sql` — upgrades legacy Romanian identifiers
   to the English schema used by the application.

The migration runner is idempotent and runs automatically before the Render
service starts.

## Technologies

- **Node.js 22+ and Express 5** for the server.
- **EJS, JavaScript, Bootstrap and Sass** for the frontend.
- **PostgreSQL** for products, inventory, users, sessions and orders.
- **Sharp** for responsive image processing.
- **Vitest and Supertest** for automated testing.
- **GitHub Actions and Render** for CI and deployment preparation.

## Security and data integrity

- Passwords are hashed with `crypto.scrypt`.
- Session tokens are hashed before they are stored.
- Browser forms require CSRF tokens.
- Security headers and production HSTS are enabled.
- Login and registration endpoints use rate limiting.
- Product prices and stock are read from PostgreSQL during checkout.
- Inventory updates occur atomically inside a transaction.
- Checkout supports demonstration payment options only; no real card details
  are collected or stored.

## Deployment

The repository includes a Render Blueprint that provisions the web service and
PostgreSQL database, runs migrations and checks `/health`.

Read [`docs/DEPLOY.md`](docs/DEPLOY.md) for production configuration,
environment variables, migrations and verification steps.

## Quality checks

The GitHub Actions workflow checks:

```bash
npm ci
npm audit --audit-level=moderate
node --check app.js
npm test -- --run
npm run build:scss
```

The current local verification passes all 35 automated tests and reports no
known production dependency vulnerabilities. Sass may emit deprecation
warnings from Bootstrap's upstream implementation; these warnings do not fail
the build.

## Documentation

- [`docs/BASELINE.md`](docs/BASELINE.md) — initial project assessment and
  completed improvements.
- [`docs/CI.md`](docs/CI.md) — continuous integration checks.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — important technical decisions.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — Render and production deployment.
- [`docs/MANUAL_TESTS.md`](docs/MANUAL_TESTS.md) — browser and deployment
  verification checklist.
- [`CHANGELOG.md`](CHANGELOG.md) — project changes and milestones.

## Roadmap

- [x] Product catalogue with filtering, sorting and pagination.
- [x] Persistent shopping cart with server-side validation.
- [x] Transactional checkout and inventory consistency.
- [x] Authentication, sessions and order history.
- [x] Role-protected administration.
- [x] Security middleware and automated tests.
- [x] English project structure and documentation.
- [x] CI and deployment preparation.
- [ ] Complete live browser verification against a production-like database.
- [ ] Integrate a real payment provider if the project moves beyond demo mode.

## License

This project is intended as a portfolio and academic application. Add a
license file before distributing it as open-source software.
