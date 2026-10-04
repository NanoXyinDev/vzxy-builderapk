# VZXY Builder APK

<p align="center">
  <img src="https://img.shields.io/badge/VZXY-BUILDER-7c3aed?style=for-the-badge&logo=android&logoColor=white" alt="VZXY Builder">
  <img src="https://img.shields.io/badge/Vercel-Ready-111827?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Ready">
  <img src="https://img.shields.io/badge/GitHub-JSON_DB-24292f?style=for-the-badge&logo=github&logoColor=white" alt="GitHub JSON DB">
  <img src="https://img.shields.io/badge/Node.js-Serverless-16a34a?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
</p>

<p align="center">
  <b>Modern developer control center for APK build workflows, server management, and account administration.</b>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#routes">Routes</a> •
  <a href="#setup">Setup</a> •
  <a href="#build-flow">Build Flow</a> •
  <a href="#security">Security</a>
</p>

---

## ✦ Overview

VZXY Builder is a lightweight serverless platform built around a clean workflow:

```text
┌──────────────────────────────────────────────────────────────┐
│                         VZXY BUILDER                        │
├───────────────────┬───────────────────┬──────────────────────┤
│   AUTH & USERS    │    APK BUILDER     │   SERVER CONTROL     │
│                   │                    │                      │
│  Free / Pro       │  ZIP Drop          │  Online / Offline    │
│  Admin            │  Source Scan       │  Server Inventory    │
│  Session Auth     │  Debug / Release   │  Admin Console      │
└───────────────────┴───────────────────┴──────────────────────┘
```

The web layer runs on **Vercel**, application data lives in a **GitHub JSON repository**, source archives use **Vercel Blob**, and long-running builds are executed by **GitHub Actions**.

---

## ⚡ Features

### ◈ APK Builder

- Drag & drop `.zip` source projects
- Large-file upload flow
- ZIP structure validation
- Path-traversal protection
- Source inventory and statistics
- Project-type detection
- Credential-like pattern warnings
- Debug build
- Release build
- Analyze-only mode
- GitHub Actions dispatch
- Live build status
- Build history
- Artifact / workflow links

### ◈ Developer Dashboard

- Modern developer workspace
- Service health panel
- Server counters
- Recent activity
- Build activity
- Account information
- Responsive desktop/mobile layout
- Reduced-motion support

### ◈ Server Management

- Add and remove managed servers
- Online / Offline / Maintenance state
- Server inventory
- Admin-only infrastructure details
- Aggregate public status
- Admin management

### ◈ Authentication

```text
FREE  → Standard account
PRO   → Premium account
ADMIN → Administrative console
```

- Login
- Register
- Password hashing
- HttpOnly session cookies
- Role-aware access control
- Admin bootstrap by email
- Validation and readable errors

---

## 🎨 Design Direction

The UI follows a modern developer-product language:

```text
DARK BASE
   ↓
SOFT SURFACES
   ↓
HAIRLINE BORDERS
   ↓
ONE STRONG ACCENT
   ↓
MONOSPACE DATA
   ↓
MICRO ANIMATIONS
```

Design goals:

- clear hierarchy
- compact information density
- strong spacing system
- technical typography
- subtle animation
- responsive behavior
- accessibility-aware motion

---

## 🧩 Architecture

```text
                         ┌──────────────────┐
                         │      Browser     │
                         │ Home / Dashboard │
                         └────────┬─────────┘
                                  │
                             HTTPS / JSON
                                  │
                 ┌────────────────▼────────────────┐
                 │          Vercel Runtime         │
                 │                                  │
                 │ Auth   Build   Status   Upload  │
                 └───────┬──────────┬──────────────┘
                         │          │
             ┌───────────▼───┐  ┌───▼─────────────┐
             │ GitHub JSON DB │  │ GitHub Actions  │
             │               │  │                 │
             │ users.json    │  │ Analyze         │
             │ servers.json  │  │ Debug           │
             │ builds.json   │  │ Release         │
             └───────────────┘  └─────────────────┘
                         │
                   ┌─────▼─────┐
                   │ Vercel    │
                   │ Blob      │
                   │ ZIP Source│
                   └───────────┘
```

### Responsibilities

| Layer | Responsibility |
|---|---|
| Browser | UI, upload progress, dashboard interactions |
| Vercel Functions | Auth, validation, authorization, API orchestration |
| GitHub JSON | Lightweight persistent application data |
| Vercel Blob | Private source archive storage |
| GitHub Actions | Long-running APK build jobs |

---

## 🗂 Repository Data

```text
data/
├── users.json
├── servers.json
└── builds.json
```

Recommended repository layout:

```text
.
├── api/
├── public/
├── data/
├── .github/
│   └── workflows/
│       └── build.yml
├── package.json
└── vercel.json
```

> For production, keep the data repository private because account records and password hashes are stored there.

---

## 🌐 Routes

### Public

```text
/              → Home
/home          → Home
/company       → Company / Home
/login         → Login
/register      → Register
```

### Authenticated

```text
/dashboard     → User dashboard
/build         → APK builder
```

### Admin

```text
/admin         → Admin console
```

### API

```text
/api/auth
/api/me
/api/status
/api/servers
/api/build
/api/build-status
/api/upload
/api/blob-health
```

---

## 🔐 Roles

| Role | Access |
|---|---|
| `free` | Dashboard + standard features |
| `pro` | Dashboard + Pro features |
| `admin` | Administrative console + management |

> Server-side authorization is mandatory. Hiding buttons in the browser is not a security boundary.

---

## ⚙️ Environment

Set these variables in **Vercel → Settings → Environment Variables**:

```env
GITHUB_OWNER=NanoXyinDev
GITHUB_REPO=vzxy-builderapk
GITHUB_BRANCH=main
GITHUB_TOKEN=YOUR_NEW_GITHUB_TOKEN
AUTH_SECRET=YOUR_LONG_RANDOM_SECRET
ADMIN_EMAIL=your-email@example.com
```

For Vercel Blob, connect the Blob store to the project and use the supported Vercel Blob authentication for the deployment. Do **not** put a Store ID into `BLOB_READ_WRITE_TOKEN`.

### Secret rules

```text
✓ keep secrets in Vercel Environment Variables
✓ use a fresh GitHub token with the minimum required permissions
✓ rotate exposed credentials immediately
✗ never commit secrets into Git
✗ never hardcode PATs or private keys
```

---

## 🚀 Setup

### 1. Clone

```bash
git clone https://github.com/NanoXyinDev/vzxy-builderapk.git
cd vzxy-builderapk
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure local environment

Create `.env.local`:

```env
GITHUB_OWNER=NanoXyinDev
GITHUB_REPO=vzxy-builderapk
GITHUB_BRANCH=main
GITHUB_TOKEN=YOUR_NEW_GITHUB_TOKEN
AUTH_SECRET=YOUR_LONG_RANDOM_SECRET
ADMIN_EMAIL=your-email@example.com
```

### 4. Run locally

```bash
vercel dev
```

### 5. Deploy

Push the repository to GitHub and connect the repository to Vercel. Every new commit can trigger a fresh deployment.

---

## 🏗 Build Flow

```text
 ZIP DROP
    │
    ▼
 SOURCE VALIDATION
    │
    ├── size checks
    ├── path safety
    ├── file inventory
    ├── project detection
    └── credential warnings
    │
    ▼
 PRIVATE BLOB
    │
    ▼
 GITHUB ACTIONS
    │
    ├── Analyze
    ├── Debug
    └── Release
    │
    ▼
 BUILD STATUS
    │
    ▼
 ARTIFACT / ACTION RUN
```

Long-running work should stay outside Vercel Functions. The web app orchestrates the job; GitHub Actions performs the build.

---

## 📡 Service Status

The public Home page can show aggregate platform health without exposing infrastructure details:

```text
┌─────────────────────────────────────────────┐
│  ● PLATFORM                                 │
│                                             │
│  OPERATIONAL                                │
│                                             │
│  Servers Online        12                   │
│  Servers Total         15                   │
│  Build Service         READY                │
└─────────────────────────────────────────────┘
```

Public pages should never expose sensitive values such as:

```text
IP address
SSH port
SSH username
passwords
private keys
environment secrets
```

---

## 🛡 Security

Security controls used by the application include:

- server-side authorization
- HttpOnly session cookies
- password hashing
- same-origin mutation checks
- build ownership validation
- private source storage
- signed source access
- GitHub workflow permission controls
- ZIP path traversal protection
- ZIP size limits
- credential-pattern warnings
- normalized API errors

Example:

```js
const token = process.env.GITHUB_TOKEN;
```

Never:

```js
const token = "ghp_xxxxxxxxxxxxxxxxx";
```

---

## 🧪 Quality Checklist

```text
[✓] JavaScript syntax
[✓] JSON validation
[✓] clean route handling
[✓] authentication flow
[✓] role authorization
[✓] ZIP validation
[✓] upload safety
[✓] build workflow
[✓] readable error handling
[✓] mobile layout
[✓] reduced-motion support
```

---

## 📈 Project Principles

```text
FAST
SECURE
READABLE
MODULAR
OBSERVABLE
RESPONSIVE
```

The goal is not to make the interface look complicated. The goal is to make a complicated build workflow feel simple.

---

## 🖥 Recommended Stack

```text
Frontend
└── HTML / CSS / JavaScript

Runtime
└── Vercel Serverless Functions

Database
└── GitHub JSON Repository

File Storage
└── Vercel Blob

Build Worker
└── GitHub Actions

Authentication
└── HttpOnly Session Cookies
```

---

## 📌 Project Status

```text
PROJECT     VZXY Builder APK
PLATFORM    Vercel
DATABASE    GitHub JSON
STORAGE     Vercel Blob
BUILDER     GitHub Actions
STATUS      Active Development
```

---

<p align="center">
  <b>VZXY BUILDER</b><br>
  <sub>Developer infrastructure, wrapped in a cleaner workflow.</sub>
</p>
'''
path = Path('/mnt/data/README.md')
path.write_text(readme, encoding='utf-8')
print(f'{path} {path.stat().st_size} bytes')
