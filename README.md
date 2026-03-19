<div align="center">

# 🖨️ Print Estimator Pro

**Full-Stack Production Costing & Quotation System for Commercial Printing**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8_Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8D8?style=flat-square&logo=tauri&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=flat-square&logo=sqlite&logoColor=white)](#)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](#)

A domain-driven ERP application that replaces manual spreadsheet-based
estimation workflows with a deterministic, auditable costing engine.

**Solo-developed by [Irshad Ansari](https://github.com/AZUSAMIRAROSE)**

</div>

---

## Table of Contents

- [Problem & Solution](#problem--solution)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Domain Model — The Costing Engine](#domain-model--the-costing-engine)
- [Getting Started](#getting-started)
- [Scripts Reference](#scripts-reference)
- [Deployment](#deployment)
- [Technical Decisions & Trade-offs](#technical-decisions--trade-offs)
- [Roadmap](#roadmap)

---

## Problem & Solution

### The Problem

Commercial print shops estimate job costs using fragile Excel workbooks
with hundreds of interlinked cells. A single formula error propagates
silently, margins are miscalculated, and historical quotes are
unrecoverable. Estimators spend 30–45 minutes per complex quote.

### The Solution

Print Estimator Pro replaces this with:

- A **deterministic costing engine** — pure functions that compute
  paper consumption, press time, ink coverage, and finishing costs
  from structured inputs. Same inputs → same outputs, always.
- A **guided 15-step estimation wizard** that captures job
  specifications (dimensions, pagination, stock, binding, finishing)
  and feeds them through the engine.
- A **V2 auto-planning mode** that evaluates all feasible
  machine → paper → imposition combinations and ranks them by
  unit cost.
- **Persistent local-first state** — estimators can work offline on
  factory floors; data syncs to the API when connectivity resumes.

Complex quotes now take **under 5 minutes** with full audit trails.

---

## Key Features

### Estimation & Costing
- **Multi-section publications** — independent costing for cover,
  text blocks, inserts, and special sections with per-section
  stock and machine assignment
- **Four simultaneous quantity tiers** — calculates cost breakdowns
  for up to 4 quantities in a single pass (e.g., 500 / 1,000 /
  2,500 / 5,000)
- **Imposition optimizer** — computes pages-up per sheet based on
  trim size, grip margins, and press sheet dimensions; selects
  optimal paper utilization automatically
- **Granular job types** — books, brochures, posters, envelopes,
  large-format (per-sqm pricing), and custom finishing operations

### Quotation Lifecycle
- **PDF quotation generation** — branded, client-ready PDFs
  generated in-browser
- **Quote versioning** — full history of estimate revisions per job
- **OS-native email integration** — `mailto:` protocol triggers
  with pre-filled quote attachments (Tauri desktop)

### Administration
- **Role-Based Access Control** — Admin and Estimator roles;
  rate-card editing gated behind admin privileges
- **Machine & rate management** — CRUD for presses, paper stocks,
  finishing equipment, ink systems, and labor rates
- **Client database** — lightweight CRM with contact management
  and quote history per client

### Technical
- **Offline-first** — Zustand persisted store is the primary data
  source; the Express API is the synchronization target, not a
  dependency
- **Cross-platform** — runs as a web app (Vite dev server / Nginx)
  or compiles to a native desktop app via Tauri 2.0 (Windows/macOS/Linux)
- **Strict type safety** — zero `any` types; `tsconfig.json` runs
  in strict mode with `noEmit` CI checks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                                                             │
│  React 19 + TypeScript 5.8 (Strict)                        │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Pages/  │  │  Components/ │  │  Hooks/               │ │
│  │  Routes  │──│  UI Library  │──│  useEstimation()      │ │
│  │          │  │  (Headless   │  │  useQuotation()       │ │
│  │          │  │   UI + TW)   │  │  useMachineRouting()  │ │
│  └────┬─────┘  └──────────────┘  └───────────┬───────────┘ │
│       │                                       │             │
│  ┌────▼───────────────────────────────────────▼───────────┐ │
│  │              STATE MANAGEMENT                          │ │
│  │  Zustand 5 + Immer (immutable updates)                │ │
│  │  └─ Persisted to localStorage / Tauri FS              │ │
│  │  TanStack React Query 5 (server state sync)           │ │
│  └────────────────────────┬──────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────▼──────────────────────────────────┐
│                     API LAYER                                │
│                                                              │
│  Express 4.21 + Node.js 20                                  │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────────┐ │
│  │  Routes/   │  │  Auth    │  │  Validation             │ │
│  │  Controllers│──│  JWT +   │──│  Zod Schemas            │ │
│  │            │  │  BCrypt  │  │  (request/response)     │ │
│  └────┬───────┘  └──────────┘  └──────────────────────────┘ │
│       │                                                      │
│  ┌────▼─────────────────────────────────────────────────────┐│
│  │  better-sqlite3 (synchronous C-addon SQLite bindings)   ││
│  │  └─ Single-file database, WAL mode, no ORM overhead     ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  DOMAIN LAYER (src/domain/)                   │
│                                                              │
│  Pure functions — no I/O, no side effects, fully testable    │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │  Paper       │  │  Press     │  │  Cost                │ │
│  │  Calculator  │  │  Routing   │  │  Aggregator          │ │
│  │  (sheets,    │  │  (machine  │  │  (material + labor   │ │
│  │   waste,     │  │   selection│  │   + overhead +       │ │
│  │   cuts)      │  │   & impo-  │  │   margin →           │ │
│  │              │  │   sition)  │  │   unit price)        │ │
│  └──────────────┘  └────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User inputs** job specs via the wizard UI
2. **Zustand store** captures form state with Immer-based immutable
   updates
3. **Domain functions** (`src/domain/`) are invoked as pure
   computations — they receive specs + rate data, return cost
   breakdowns
4. **React Query** persists the finalized estimate to the Express
   API asynchronously
5. **Express** validates the payload against Zod schemas, writes to
   SQLite, returns the canonical record
6. **Zustand** reconciles server response into local state

---

## Project Structure

```
print-estimator/
├── src/                          # Frontend application
│   ├── domain/                   # Pure business logic (costing engine)
│   │   ├── paperCalculator.ts    # Sheet yield, waste %, cut optimization
│   │   ├── pressRouting.ts       # Machine selection & imposition logic
│   │   ├── costAggregator.ts     # Roll-up: materials + labor + margin
│   │   └── types.ts              # Domain value objects & interfaces
│   ├── components/               # React UI components
│   │   ├── estimation/           # 15-step wizard components
│   │   ├── quotation/            # PDF generation, quote management
│   │   ├── admin/                # Rate cards, machine CRUD, RBAC
│   │   └── shared/               # Design system primitives
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand stores (persisted)
│   ├── api/                      # React Query hooks + API client
│   ├── pages/                    # Route-level page components
│   ├── utils/                    # Formatting, constants, helpers
│   └── App.tsx                   # Root component + router
├── server/                       # Backend API
│   ├── routes/                   # Express route handlers
│   ├── middleware/                # Auth, validation, error handling
│   ├── db/                       # SQLite schema, migrations, queries
│   └── index.ts                  # Server entry point
├── docs/                         # Technical documentation
├── src-tauri/                    # Tauri native shell (Rust config)
├── docker-compose.yml            # Multi-container orchestration
├── Dockerfile.frontend           # Frontend container (Nginx)
├── Dockerfile.backend            # API container (Node.js)
├── vite.config.ts                # Vite build configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript strict mode config
└── package.json
```

---

## Tech Stack

| Layer | Technology | Why This Choice |
|-------|-----------|----------------|
| **UI Framework** | React 19.2 | Automatic batching, transitions API for non-blocking UI during heavy calculations |
| **Language** | TypeScript 5.8 (strict) | Eliminates entire categories of runtime errors; `noUncheckedIndexedAccess` enabled |
| **Styling** | Tailwind CSS 4 + Headless UI | Utility-first for rapid iteration; Headless UI for accessible, unstyled component primitives |
| **State** | Zustand 5 + Immer | Minimal boilerplate; Immer enables readable immutable updates on deeply nested estimation state |
| **Server Cache** | TanStack React Query 5 | Declarative data fetching with automatic background refetching and cache invalidation |
| **Charts** | Recharts | Composable, React-native charting for cost breakdowns and dashboards |
| **API** | Express 4.21 | Mature, minimal, well-understood — appropriate for a single-service API |
| **Database** | better-sqlite3 | Synchronous C-addon bindings = no callback complexity; single-file DB ideal for factory-floor deployment |
| **Validation** | Zod | Runtime schema validation with automatic TypeScript type inference — single source of truth for types |
| **Auth** | JWT + BCrypt | Stateless token auth; BCrypt for password hashing with configurable work factor |
| **Desktop** | Tauri 2.0 | Rust-based alternative to Electron — ~10x smaller binary, native OS APIs, no bundled Chromium |
| **Build** | Vite 6 | Sub-second HMR, native ESM, optimized production builds with Rollup |
| **Containers** | Docker + Docker Compose | Reproducible builds, environment parity, single-command deployment |

---

## Domain Model — The Costing Engine

The `src/domain/` directory contains the **core business logic**,
deliberately isolated from React, network I/O, and state management.
Every function is pure: no side effects, no external dependencies,
fully unit-testable.

### Paper Calculator

```typescript
// Simplified example of the actual domain function signature
function calculateSheetRequirement(input: {
  trimWidth: number;      // mm
  trimHeight: number;     // mm
  pages: number;
  pagesPerSheet: number;  // from imposition
  pressSheetW: number;    // mm
  pressSheetH: number;    // mm
  gripMargin: number;     // mm
  wasteFactor: number;    // 0.03 = 3% spoilage
}): {
  netSheets: number;
  grossSheets: number;    // net + waste + makeready
  paperCostPerUnit: number;
  wasteSheets: number;
}
```

### Press Routing

Given a set of available machines (each with min/max sheet sizes,
max colors, and hourly rates), the router:

1. **Filters** machines that can physically accept the job's press
   sheet dimensions
2. **Calculates** impressions required per machine (factoring in
   colors, perfecting capability, and pages-up)
3. **Computes** press time = impressions ÷ rated speed + makeready
4. **Ranks** by total press cost (time × hourly rate)

This is a **bounded search** over the machine catalog (typically
10–30 machines), not a combinatorial explosion. The complexity is
**O(M × S)** where M = machines and S = stock variants — always
tractable.

### Cost Aggregator

Rolls up all cost centers into a final unit price:

```
Unit Cost = (Paper + Plates + Ink + Press Time + Finishing + Binding
             + Packing + Freight + Overhead) ÷ Quantity + Margin%
```

Each cost center is computed by its own pure function with explicit
inputs. The aggregator composes them — this is where the four
quantity tiers are evaluated in a single map operation.

---

## Getting Started

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 20.0 | `node -v` |
| npm | ≥ 10.0 | `npm -v` |
| Rust | Latest stable (for Tauri only) | `rustc --version` |
| Docker | ≥ 24.0 (for containerized deployment only) | `docker -v` |

### Installation

```bash
# Clone
git clone https://github.com/irshad-ansari/print-estimator-pro.git
cd print-estimator-pro

# Install dependencies (clean, reproducible)
npm ci
```

### Development

```bash
# Frontend only (Vite dev server on port 5173)
npm run dev

# Backend only (Express on port 3001)
npm run dev:server

# Full-stack (frontend + backend concurrently)
npm run dev:full

# Native desktop app (requires Rust toolchain)
npm run tauri dev
```

### Production Build

```bash
# Web build (outputs to dist/)
npm run build

# Desktop build (outputs platform-specific binary)
npm run tauri build

# Docker deployment
docker-compose up --build -d
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run dev:server` | Start Express API in watch mode |
| `npm run dev:full` | Run frontend + backend concurrently |
| `npm run build` | Production build (TypeScript check + Vite) |
| `npm run preview` | Preview production build locally |
| `npm run tsc` | Type-check without emitting (`--noEmit`) |
| `npm run lint` | ESLint with strict rules |
| `npm run benchmark` | Run domain function performance benchmarks |
| `npm run tauri dev` | Launch Tauri desktop shell in dev mode |
| `npm run tauri build` | Compile native desktop binary |

---

## Deployment

### Docker Compose (Recommended)

```yaml
# docker-compose.yml orchestrates:
# 1. Frontend container — Vite build served via Nginx
# 2. Backend container — Node.js + Express + SQLite
# 3. Shared volume for SQLite persistence
```

```bash
docker-compose up --build -d

# Frontend: http://localhost:80
# API:      http://localhost:3001
```

### Manual Deployment

```bash
# Build frontend
npm run build

# Serve dist/ with any static file server (Nginx, Caddy, etc.)
# Start backend
cd server && node index.js
```

---

## Technical Decisions & Trade-offs

### Why SQLite instead of PostgreSQL?

This application is designed for **single-tenant, on-premise
deployment** at individual print shops. SQLite provides:
- Zero infrastructure overhead (no database server process)
- Single-file backup (copy one file)
- Synchronous reads via better-sqlite3 (no async complexity)
- Sufficient performance for the expected load (<100 concurrent users)

If multi-tenant SaaS deployment were a goal, PostgreSQL would be
the appropriate choice.

### Why Zustand over Redux?

- Estimation state is deeply nested (sections → pages → impositions)
- Zustand + Immer allows direct mutation syntax with immutable
  semantics — significantly less boilerplate than Redux Toolkit
  for this use case
- Built-in `persist` middleware handles offline-first storage
  with zero additional libraries

### Why Tauri over Electron?

- **Binary size:** Tauri produces ~5–10 MB binaries vs Electron's
  ~150 MB+ (no bundled Chromium)
- **Memory:** Uses the OS webview — 50–80% less RAM
- **Security:** Rust backend with explicit permission model
- **Trade-off:** Rendering may vary slightly across OS webview
  versions (acceptable for internal tools)

### Why pure functions for the domain layer?

- **Testability:** No mocking required — pass inputs, assert outputs
- **Auditability:** Regulators and clients can verify that cost
  calculations are deterministic
- **Portability:** The domain layer has zero React/Express imports —
  it could be extracted to a shared npm package or WASM module

---

## Quality Standards

```bash
# Type safety — zero implicit `any`, strict mode
npm run tsc

# Linting — enforced code style and best practices
npm run lint

# Benchmarks — domain functions must complete in <1ms
# for standard job configurations
npm run benchmark
```

### Enforced TypeScript Rules
- `"strict": true`
- `"noUncheckedIndexedAccess": true`
- `"noImplicitReturns": true`
- Zero `@ts-ignore` or `as any` in codebase

### Validation Boundary
All data crossing the API boundary (request bodies, query params)
is validated against Zod schemas. The TypeScript types are
**inferred from the schemas** — there is exactly one source of
truth for each data shape.

---

## Roadmap

- [ ] Multi-currency support with exchange rate integration
- [ ] WebSocket-based real-time job status tracking
- [ ] Gantt-chart production scheduling
- [ ] QuickBooks / Xero accounting integration
- [ ] Progressive Web App (PWA) with service worker caching
- [ ] E2E test suite (Playwright)
- [ ] OpenAPI / Swagger documentation for the REST API

---

## License

© 2024–2025 Irshad Ansari. All rights reserved.

---

<div align="center">

**Built by [Irshad Ansari](https://github.com/AZUSAMIRAROSE)**

Full-stack engineer focused on TypeScript, system design,
and domain-driven architecture.

*Open to engineering roles at companies solving hard problems.*

</div>
