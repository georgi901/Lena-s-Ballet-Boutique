# Production deployment

The repository includes a Render Blueprint in `render.yaml`. It provisions a
Node.js web service and a PostgreSQL database, then runs the migrations before
starting the application.

## Render setup

1. Push the branch to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Review the generated web service and PostgreSQL database.
4. Apply the Blueprint.
5. After deployment, open `/health` and confirm that it returns
   `{"status":"ok"}`.

The Blueprint sets `DATABASE_URL` from the managed database and enables
`DATABASE_SSL`. No password or private credential belongs in the repository.

## Required production checks

- The migration command must finish before the web process starts.
- The health check must be green before accepting traffic.
- `NODE_ENV` must remain `production`, so secure cookies and HSTS are enabled.
- The first administrator must be created through a controlled database
  operation by setting an existing user's `role` to `admin`.

## Manual deployment

For another Node.js host, configure `DATABASE_URL`, `DATABASE_SSL`,
`NODE_ENV=production`, `PORT`, and `NEW_PRODUCT_DAYS`, then run:

```bash
npm ci
npm run build:scss
npm run migrate
npm start
```

The application listens on the `PORT` supplied by the hosting platform.
