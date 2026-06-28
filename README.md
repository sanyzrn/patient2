# Nafas Pharmed — Patient Portal

A React + Vite + TypeScript (RTL, Persian) patient education portal: catalogs,
videos, products, an offline-capable PWA, and a small file-based PHP admin API.

## Requirements

- Node.js 18+ (and npm)
- For the production backend: PHP 8.x on the web host

## Install

```bash
npm install
cp .env.example .env   # then edit values as needed
```

## Develop

```bash
npm run dev        # runs the mock API (:3001) and Vite (:5173) together
npm run dev:api    # mock API only
```

The dev admin password comes from `DEV_ADMIN_PASSWORD` (see `.env.example`);
if unset it falls back to `changeme-dev-only`.

## Quality gates

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run build      # runs `tsc --noEmit` first, then `vite build`
```

`build` fails on type errors by design.

## Admin provisioning (production / PHP backend)

The admin password is **never** stored in source or the client bundle. It exists
only as a server-side bcrypt hash.

1. Generate a bcrypt hash:

   ```bash
   php -r "echo password_hash('your-strong-password', PASSWORD_BCRYPT), PHP_EOL;"
   ```

2. Provide it to the backend on first run via the `NAFAS_ADMIN_PASSWORD_HASH`
   environment variable. Until it is set, the API responds `503 Admin not
   configured` instead of creating a known-password account.

3. Rotate the password from the admin panel’s “تغییر رمز عبور” form (or the CLI
   tool below). The previously committed default password is compromised and
   must not be reused.

### Credential CLI (server, CLI-only)

```bash
php public/admin-credentials-manager.php set <new-password>
php public/admin-credentials-manager.php show
php public/admin-credentials-manager.php reset          # clears credentials
php public/admin-credentials-manager.php clear-tokens
```

## Storage location (secrets outside the web root)

Credentials, session tokens, and saved content live under a `storage/`
directory **outside** `public/` (the web root), so they are never served:

- `storage/.admin-credentials.json`
- `storage/.admin-tokens.json`
- `storage/data/content.json`

Override the location with `NAFAS_STORAGE_DIR` (absolute path). `storage/` is
gitignored. The dev mock API (`scripts/dev-api.mjs`) uses the same layout.

## CORS

Set `ALLOWED_ORIGINS` (comma-separated) on the PHP host to the portal’s
origin(s). The API never uses `*`.

## Environment variables

See `.env.example`. Frontend vars are prefixed `VITE_`; backend vars
(`NAFAS_ADMIN_PASSWORD_HASH`, `NAFAS_STORAGE_DIR`, `ALLOWED_ORIGINS`) are set in
the server environment, not committed.
