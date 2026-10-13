# Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yml` runs for every push
and pull request. It uses Node.js 22 and installs the exact dependency tree
from `package-lock.json`.

The workflow checks:

1. dependency vulnerabilities with `npm audit`;
2. JavaScript syntax for project files;
3. the automated test suite;
4. the Sass build.

The job does not connect to PostgreSQL. The application tests inject a mock
pool, so CI does not require database credentials or production secrets.
