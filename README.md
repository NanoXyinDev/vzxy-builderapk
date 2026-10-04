# ZXVCODE Web Control Panel

Vercel-ready web control panel with Login, Register, role-based accounts, Admin Dashboard and Manage Server.

## GitHub JSON database

Persistence now uses the GitHub repository `NanoXyinDev/vzxy-builderapk`:

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

- `GITHUB_TOKEN` — GitHub token with the minimum repository Contents read/write permission for `NanoXyinDev/vzxy-builderapk`
- `AUTH_SECRET` — long random secret for session signing
- `ADMIN_EMAIL` — owner's account email

Optional:

- `GITHUB_OWNER` — default `NanoXyinDev`
- `GITHUB_REPO` — default `vzxy-builderapk`
- `GITHUB_BRANCH` — default `main`

## Security

Do not commit GitHub tokens, passwords or `.env` files. If a token is accidentally pasted into chat, source code, logs or a public repository, revoke/rotate it and create a replacement token.

GitHub JSON is convenient for a small control panel, but it is not a high-concurrency database. For heavy traffic, use a real database or a dedicated service.

## VPS management

The dashboard stores VPS/server metadata. Vercel serverless functions should not hold persistent SSH connections. For actual power, metrics, restart and provisioning actions, connect each VPS to a small authenticated agent/API with an allowlist of operations.

## UI

The UI was upgraded toward a developer-first dark command-center style: compact sidebar navigation, bento cards, status rows, mono server identifiers, subtle grid texture, restrained gold accent, responsive admin controls, and reduced-motion support. The visual direction was informed by public developer dashboard/portfolio patterns, but the implementation is original and does not copy third-party CSS.
## Build APK / ZIP Upload

- `/build` provides a drag-and-drop `.zip` source workflow.
- Browser-side inspection checks ZIP paths, entry count, extracted size, Flutter/Gradle markers, and common project structure before dispatch.
- Large source ZIPs are uploaded directly from the browser to a private Vercel Blob store, so they do not pass through the 4.5 MB Vercel Function request limit.
- Uploaded source ZIPs are stored under `.zxv/build-inputs/` in the configured GitHub repository so GitHub Actions can fetch them. Use a private repository when source code must stay private.
- `data/builds.json` stores recent build records.
## ZIP Build Safety

- Client and server reject unsafe ZIP paths (absolute paths and `../` traversal), symbolic links, excessive entry counts, and excessive expanded size.
- The browser source check also flags credential-like patterns without displaying their values.
- Free accounts can use Analyze Only; Pro/Admin can dispatch APK builds.
- The automatically created GitHub Actions workflow uses `contents: read` and does not expose the repository token to the downloaded build project.

## Large ZIP Upload

Vercel Functions have a 4.5 MB request-body limit, so `/build` no longer posts the ZIP to a Function. It requests a short-lived signed Vercel Blob upload URL and sends the ZIP directly from the browser to a private Blob store. The build workflow then receives a time-limited signed GET URL.

Create a **private Vercel Blob store** for the project and connect/upgrade the store to **OIDC**. The app uses the connected Blob store ID and Vercel-issued short-lived OIDC credentials; no long-lived `BLOB_STORE_ID` is required. The app caps browser uploads at 250 MB for stability; Vercel Blob itself supports files much larger than that.

Build source URLs are not written into `data/builds.json`; only build metadata and an Actions link are stored.

The APK build endpoint reconciles `.github/workflows/build.yml` on the configured repository, so an older workflow definition is updated automatically before dispatch.
## Vercel Blob OIDC

The project targets Blob store `store_MM3stWQMbwkbomJ2` and uses Vercel OIDC. On Vercel, connect the private Blob store to this project and upgrade the store to OIDC if it is still using a static token. No `BLOB_READ_WRITE_TOKEN` value is required. `BLOB_STORE_ID` is optional because the project includes the connected store ID as its default; setting `BLOB_STORE_ID` lets you override it later.
## Production hardening in the latest patch

- Sessions are 24-hour signed cookies containing only a user id; current role and account state are resolved from GitHub JSON on the server.
- Login and register have a lightweight per-instance rate limit plus same-origin checks.
- Build requests accept a private Blob pathname tied to the authenticated user instead of trusting arbitrary signed URLs. The server mints the one-hour signed GET URL immediately before dispatching GitHub Actions.
- Build history can synchronize with the real GitHub Actions workflow status.
- The browser uploads ZIPs directly to private Vercel Blob using scoped signed URLs, so the upload body does not pass through the Vercel Function. Vercel documents signed PUT URLs and multipart/client upload patterns for large files.
- The GitHub repository used for `data/users.json` should be private because it contains password hashes and account data.
## Audit notes

The latest package is intentionally kept dependency-light and below 100 KB as a compressed project archive. JavaScript files are syntax-checked before packaging, JSON is parsed, and the ZIP is integrity-tested. The GitHub-backed JSON repository should be private because `data/users.json` contains password hashes and account data.

