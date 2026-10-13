# Baseline assessment

This document records the state of the project before the e-commerce
improvements were implemented.

## Original stack

- Node.js and Express
- EJS templates
- PostgreSQL
- Sass, Bootstrap and browser-side JavaScript
- Sharp for responsive gallery images

The original application was primarily a product catalogue and gallery. It
did not yet include a persistent cart, checkout, accounts, order history,
administration or automated tests.

## Original routes

| Route | Purpose |
| --- | --- |
| `/`, `/index`, `/home` | Homepage |
| `/products` | Product catalogue |
| `/product/:id` | Product details |
| `/static-gallery` | Day-filtered static gallery |
| `/animated-gallery` | Randomised animated gallery |
| `/about` | About page |
| `/contact` | Contact page |
| `/guides` | Guides and resources |

Invalid categories, product identifiers and missing products returned
controlled error pages.

## Original data model

The initial database contained a `products` table with product name,
description, price, image, category, subcategory, colour, materials,
experience level, customisation flag, brand, stock and creation data.

The original setup used a direct SQL initialisation script and environment
variables for PostgreSQL. The improvement work replaced this approach with
ordered, idempotent migrations in `sql/migrations/`.

## Original frontend behaviour

The catalogue already supported:

- name, colour, customisation, experience, price, subcategory and material
  filters;
- positive and negative description terms;
- two-key sorting;
- pagination and product details in a modal;
- temporary product hiding and pinning;
- light/dark theme persistence;
- responsive images and animated galleries;
- mobile navigation and basic accessibility attributes.

## Risks identified

The baseline review identified hardcoded database configuration in older
files, direct server startup during application import, no automated test
suite, and no transactional order flow. The current application removes the
runtime credential fallback, separates the app factory from server startup,
adds environment validation, and uses migrations and injected database pools.

The old Git history was not rewritten. Any credential that was ever used
outside a local environment must be rotated independently.

## Result after the improvement work

The project now includes:

- a PostgreSQL-backed catalogue and migration runner;
- a validated customer-side cart;
- transactional checkout and inventory locking;
- registration, login, sessions and order history;
- role-protected administration;
- CSRF protection, security headers and rate limiting;
- automated tests, dependency auditing and GitHub Actions CI;
- Render deployment configuration and health checks;
- English customer-facing content and English project documentation.

