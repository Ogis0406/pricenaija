# PriceNaija

**Know the price. Save your money.** PriceNaija is a Nigerian price-comparison and market-intelligence application built with React, Express, tRPC, Drizzle ORM and MySQL. The repository includes the client, API, database schema and migrations, demo seed, authentication, admin tools, assets and deployment files.

## Requirements

- Node.js 22.x
- Corepack and pnpm 10.18.0 (the version is pinned in `package.json`)
- MySQL 8.0-compatible database

## Clone and install

Use the private clone URL shown by GitHub after repository access has been granted:

```sh
git clone <private-pricenaija-repository-url>
cd pricenaija
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install --frozen-lockfile
```

## Configure the environment

Copy the safe template and fill in the local values in `.env`. Do not commit `.env` or paste credentials into source files.

```sh
cp .env.example .env
```

`DATABASE_URL` is required for migrations, seeding and the application. Create an empty MySQL database and set its connection string in `.env`. For example, use the form `mysql://<db-user>:<encoded-password>@<db-host>:3306/<db-name>`; URL-encode any special characters in credentials. Keep this real value only in your local ignored `.env` or deployment secret manager.

Optional integrations:

- **Transactional email:** set `RESEND_API_KEY`, `MAIL_FROM` and `PUBLIC_APP_URL` to enable real verification and password-reset email delivery. In development, the app supports development verification/reset links without sending email. Configure all three for production account email flows.
- **Object storage:** local development saves uploads to the ignored `.local-storage/` directory when `MANUS_API_URL` and `MANUS_API_KEY` are absent. For deployments using the current durable Manus storage adapter, configure both values in the deployment's secret manager; never commit them. The local filesystem fallback is development-only and is not a production backup strategy.
- `PORT` defaults to `3000`. `NODE_ENV` is selected by the supplied `dev` and `start` scripts. `LOCAL_UPLOAD_DIR` may point to a different development-only upload directory.
- `MANUS_PROJECT_ID`, `MANUS_JWT_SECRET` and `MANUS_OAUTH_API_URL` are optional platform compatibility variables; PriceNaija's application login is email/password. They are not substitutes for `DATABASE_URL` or the email-provider settings.

The `.env.example` contains names and blank secret values only. Keep `.env` in your local secret manager or private machine. The repository ignores `.env` and `.env.*` while explicitly allowing `.env.example`.

## Database and local development

`pnpm dev` runs the checked-in migrations and the idempotent demo-catalog seed before starting the development server on `PORT` (default `3000`). It requires `DATABASE_URL` and does not delete existing data. Seeded products and businesses are clearly marked as demo data; do not seed a production database.

```sh
pnpm db:migrate   # apply checked-in migrations
pnpm db:seed      # add missing demo catalogue rows (development only)
pnpm dev          # migrate, seed and start Vite + Express/tRPC
```

The normal `pnpm dev` command intentionally adds demo rows. To develop without that seed, run `pnpm db:migrate` and then start `NODE_ENV=development pnpm exec tsx watch server/_core/index.ts`. The app serves its health check at `/api/health` and the route manifest at `/manus-routes.json`.

### Initial administrator

There is no public admin registration or role selector. Provision the first administrator from a trusted backend environment after migrations:

```sh
read -r -p "Administrator email: " INITIAL_ADMIN_EMAIL
read -r -s -p "Administrator password: " INITIAL_ADMIN_PASSWORD
printf '\n'
export INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD
pnpm db:create-admin
unset INITIAL_ADMIN_EMAIL INITIAL_ADMIN_PASSWORD
```

For a new administrator, use a password of 14–128 characters. The script stores a salted scrypt hash, marks a backend-created account as verified, writes the administrator role/membership in the database, and does not print credentials. If promoting an existing account, its email must already be verified and the supplied password must authenticate that account. Remove the one-time variables from your shell/secret manager after provisioning. Never place actual administrator credentials in GitHub or frontend code.

## Checks

```sh
pnpm check   # TypeScript
pnpm test    # unit tests
pnpm build   # production frontend and server bundle
```

## Production deployment

1. Create a production MySQL database and configure `DATABASE_URL` through the host's encrypted environment/secrets settings.
2. Run `pnpm db:migrate` as a release/pre-deploy step. Do not run the development demo seed against production unless intentionally populating demo records.
3. Configure `RESEND_API_KEY`, `MAIL_FROM` and the public `PUBLIC_APP_URL` for account verification and password reset. Configure durable object storage for uploaded evidence; do not use the local development fallback as persistent production storage.
4. Build and run with the included container, or use the equivalent Node commands:

```sh
docker build -t pricenaija .
docker run --rm -p 3000:3000 --env-file /secure/path/pricenaija.production.env pricenaija
```

The production environment file is an operator-managed secret file outside the repository; set `NODE_ENV=production`, `PORT=3000` and the values above there. Alternatively, run `pnpm build` followed by `pnpm start` on a Node 22 host. The server honors `PORT` and exposes the unauthenticated readiness endpoint `/api/health`.

## Security and data notes

- Application sessions, password hashing, rate limiting and role checks are server-side. Every admin page/API requires an authenticated database administrator; public sign-up supports consumer/business accounts only.
- Never commit `.env`, database passwords, email/storage API keys, session secrets, admin credentials, private keys or production data. Use `.env.example` only as a variable-name template.
- Development/demo catalogue content is not evidence of real market prices. Public comparison and fair-price outputs are based on verified reports; uploaded evidence should be handled according to your privacy obligations.
