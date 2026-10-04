# ZXVCODE Web Control Panel

Vercel-ready web control panel with Login, Register, role-based accounts, Admin Dashboard and Manage Server.

## GitHub JSON database

Persistence now uses the GitHub repository `NanoXyinDev/Vzxy-BuilderApk`:

- `data/users.json` — account records and password hashes
- `data/servers.json` — managed server metadata
- GitHub Contents API is used to read/write the JSON files
- writes use the file SHA and retry on GitHub conflicts

The GitHub token is **never stored in the repository**. Configure it as a Vercel environment variable.

## Roles

- `free` — default role for normal registrations
- `pro` — can be assigned by an admin
- `admin` — full dashboard management

Set `ADMIN_EMAIL` to the owner's email. A registration using that exact email is assigned `admin`. Existing users can also be promoted from the Admin dashboard.

## Vercel environment variables

Required:

- `GITHUB_TOKEN` — GitHub token with the minimum repository Contents read/write permission for `NanoXyinDev/Vzxy-BuilderApk`
- `AUTH_SECRET` — long random secret for session signing
- `ADMIN_EMAIL` — owner's account email

Optional:

- `GITHUB_OWNER` — default `NanoXyinDev`
- `GITHUB_REPO` — default `Vzxy-BuilderApk`
- `GITHUB_BRANCH` — default `main`

## Security

Do not commit GitHub tokens, passwords or `.env` files. If a token is accidentally pasted into chat, source code, logs or a public repository, revoke/rotate it and create a replacement token.

GitHub JSON is convenient for a small control panel, but it is not a high-concurrency database. For heavy traffic, use a real database or a dedicated service.

## VPS management

The dashboard stores VPS/server metadata. Vercel serverless functions should not hold persistent SSH connections. For actual power, metrics, restart and provisioning actions, connect each VPS to a small authenticated agent/API with an allowlist of operations.

## UI

The UI was patched to a modern dark/glass interface with warm yellow donation-style accents, responsive cards, compact controls and mobile-friendly admin views. It is an original implementation rather than a copy of Saweria's source. Community Saweria overlay projects demonstrate similar customizable overlay patterns. 
