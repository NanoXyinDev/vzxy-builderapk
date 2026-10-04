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
- Direct upload is capped at 4 MB on purpose for Vercel serverless requests. Larger sources should be hosted at an HTTPS URL and dispatched through a URL-based workflow endpoint.
- Uploaded source ZIPs are stored under `.zxv/build-inputs/` in the configured GitHub repository so GitHub Actions can fetch them. Use a private repository when source code must stay private.
- `data/builds.json` stores recent build records.
## ZIP Build Safety

- Client and server reject unsafe ZIP paths (absolute paths and `../` traversal), symbolic links, excessive entry counts, and excessive expanded size.
- The browser source check also flags credential-like patterns without displaying their values.
- Free accounts can use Analyze Only; Pro/Admin can dispatch APK builds.
- The automatically created GitHub Actions workflow uses `contents: read` and does not expose the repository token to the downloaded build project.
