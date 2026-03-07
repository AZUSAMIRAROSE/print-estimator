# PRINT ESTIMATOR PRO v2.0.0 — COMPLETE HANDOFF DOCUMENT

**Last Updated:** March 7, 2026  
**Version:** 2.0.0  
**Status:** Active Development

---

## 📋 EXECUTIVE SUMMARY

**Print Estimator Pro** is a full-stack desktop + web application for estimating book production costs. Built with React 19, TypeScript, Tauri 2 (for desktop), and Node.js/Express backend.

### Core Purpose
- **Estimate printing costs** across paper, printing, binding, finishing, packing, and freight
- **Multi-quantity comparisons** with optimization
- **15-step wizard** for complex job specifications
- **Local-first design** with optional backend for multi-user/sharing
- **Desktop + Web deployment** (Tauri for Windows/Mac/Linux, browser for SaaS)

### Current Focus Areas
- **Thomson Press calibration** — costs matched to real customer data from India/UK printing facility
- **Nuclear-grade calculation engine** — 16-step paper → printing → binding → finishing pipeline
- **Role-based access** (admin can edit rates, users view-only)
- **Quotation workflow** with CSV export, PDF generation, email integration

---

## 🏗️ PROJECT STRUCTURE (DEEPDIVE)

### Root Files & Config

```
project-root/
├── package.json              # Main monorepo config (v2.0.0)
├── tsconfig.json            # TS compiler: ES2021, jsx="react-jsx", strict mode
├── vite.config.ts           # Vite (port 1420), React plugin, path aliases
├── Dockerfile.frontend       # Node 22 Alpine, npm ci, build, serve with Nginx
├── Dockerfile.backend        # Node 22 Alpine, server/src/index.js
├── docker-compose.yml        # Backend (4000), Frontend (8080 via Nginx)
├── eslint.config.js         # ESLint 9 + TypeScript + React Hooks + React Refresh
├── postcss.config.js        # Tailwind CSS processor
├── tailwind.config.js       # Tailwind v3.4.19 + custom design tokens
├── vite-env.d.ts            # Vite type defs (import.meta.env)
├── tsconfig.node.json       # TS config for build files
├── README.md                # High-level overview
├── TODO.md / TODO_IMPLEMENTATION.md  # Dev progress tracking
└── src-tauri/               # Desktop shell (Tauri 2)
    ├── tauri.conf.json      # App ID: com.a9560.print-estimator
    ├── Cargo.toml           # Rust deps (tauri, serde, plugins)
    ├── src/                 # Rust main.rs (minimal—delegates to web)
    ├── build.rs             # Tauri build script
    ├── icons/               # PNG/ICNS/ICO for bundling
    ├── capabilities/        # Tauri permission grants
    └── gen/                 # Generated schemas (auto)
```

### Frontend Structure (`src/`)

```
src/
├── App.tsx                  # Main router wrapper (onboarding check, theme, keyboard shortcuts)
├── main.tsx                 # React DOM entry (React Query, BrowserRouter, TelemetryInit)
├── vite-env.d.ts           # Type definitions

├── pages/                   # Page-level routes (all wrapped by MainLayout)
│   ├── Dashboard.tsx        # KPI dashboard (monthly revenue, quotations, job pipeline)
│   ├── NewEstimate.tsx      # 15-step wizard (core estimation flow)
│   ├── Jobs.tsx             # Job history + filtering
│   ├── Quotations.tsx       # Quotation list + CSV export
│   ├── Customers.tsx        # Customer master list
│   ├── RateCard.tsx         # Admin-only rate card editor (machines, paper, costs)
│   ├── Calculator.tsx       # Quick calculator (simplified estimation)
│   ├── Inventory.tsx        # Stock levels, procurement
│   ├── Reports.tsx          # Dashboards, analytics
│   ├── Settings.tsx         # Global config (company, estimation defaults)
│   ├── ProfileSettings.tsx  # User profile & prefs
│   ├── Onboarding.tsx       # First-run flow (user creation)
│   └── (subdirs)/           # Detail pages (ratecard/*, inventory/*)

├── layouts/
│   └── MainLayout.tsx       # Sidebar + Header + Outlet (all pages use this)

├── components/
│   ├── layout/              # Header, Sidebar, SearchOverlay
│   ├── wizard/              # 15 step components (text sections, cover, jacket, etc.)
│   ├── results/             # EstimationResults table + breakdown
│   ├── machines/            # Machine selector, machine detail card
│   ├── jobs/                # Job card, job list, job details slider
│   └── ui/                  # Generic UI atoms (buttons, forms, selects, modals)

├── styles/
│   └── globals.css          # Tailwind imports + CSS variables (colors, spacing, typography)
│                            # Dark mode support via .dark class

├── stores/                  # Zustand state management (persistent with localStorage)
│   ├── appStore.ts          # Global app state (user, theme, notifications, settings, modals)
│   ├── estimationStore.ts   # Estimation workflow (current step, input, results)
│   ├── dataStore.ts         # Local jobs, quotations, customers, drafts
│   ├── inventoryStore.ts    # Inventory items + movements
│   ├── machineStore.ts      # Machines + printing press specs
│   └── rateCardStore.ts     # Labour rates, material costs, wastage tables

├── api/
│   ├── client.ts            # Fetch wrapper (baseURL=/api/v1, auth header, JSON)
│   └── types.ts             # API request/response types (ApiAuthUser, ApiQuote, etc.)

├── types/
│   ├── index.ts             # Complete type hierarchy
│   ├── machine.types.ts     # Machine interface (CANONICAL definition)
│   ├── machine.enums.ts     # MachineType, MachineStatus, ColorMode, etc.
│   ├── machine.validators.ts # Machine validation rules
│   └── machine.computed.ts   # Machine derived fields (printableArea, etc.)

├── utils/
│   ├── calculations/        # CORE CALCULATION ENGINE
│   │   ├── index.ts         # Export all calc modules
│   │   ├── estimator.ts     # 16-step pipeline (MAIN ORCHESTRATOR)
│   │   ├── paper.ts         # Paper physics + auto-planning (imposition, wastage)
│   │   ├── printing.ts      # CTP + printing cost (TP rate tables)
│   │   ├── binding.ts       # Binding cost engine (case, perfect, saddle)
│   │   ├── finishing.ts     # Lamination, UV, embossing, die-cutting
│   │   ├── packing.ts       # Packing cost (cartons, pallets)
│   │   ├── freight.ts       # Freight + logistics
│   │   ├── weight.ts        # Book weight physics
│   │   ├── spine.ts         # Spine thickness calculation
│   │   ├── wastage.ts       # Wastage % lookup (TP formula)
│   │   ├── ctp.ts           # CTP Cost (plates)
│   │   ├── imposition.ts    # Sheet layout optimization
│   │   ├── validate.ts      # Pre-estimation validation
│   │   ├── trace.ts         # Debug tracing + calibration
│   │   ├── optimizer.ts     # Sheet/machine/signature optimization
│   │   ├── monteCarlo.ts    # Monte Carlo simulations
│   │   └── constants.ts     # TP rates, machine rates, plate costs
│   │
│   ├── validation/          # Input validation helpers
│   │   └── estimation.ts    # EstimationInput validators
│   │
│   ├── export/              # Export utilities
│   │   └── *.ts             # CSV, PDF, JSON export
│   │
│   ├── format.ts            # String formatting (currency, numbers, dates)
│   ├── cn.ts                # Tailwind class merging
│   ├── telemetry.ts         # Event logging + error tracking
│   ├── globalCodes.ts       # Global code generators (quote numbers, job numbers)
│   ├── machinePricing.ts    # Machine rate lookups
│   ├── pdfExport.ts         # PDF generation (jsPDF + autotable)
│   └── fileSave.ts          # File download utilities

├── constants/
│   └── index.ts             # ALL INDUSTRY DATA
│                            # - TRIM_SIZE_PRESETS (A4, Royal Octavo, etc.)
│                            # - STANDARD_PAPER_SIZES (23×36, 25×36, etc.)
│                            # - BULK_FACTORS (Matt=1.0, HB=2.3, etc.)
│                            # - WASTAGE_CHART (% by quantity)
│                            # - IMPRESSION_RATES (by machine, qty, size)
│                            # - DEFAULT_MACHINES (FAV, REKORD AQ, RMGT, etc.)
│                            # - BINDING_RATES (hardcase, perfect, saddle)
│                            # - FINISHING_RATES (lamination, UV, embossing)
│                            # - PACKING_RATES (cartons, pallets)
│                            # - CURRENCY_RATES (INR base)
│                            # - WIZARD_STEPS (15-step config)
│                            # - SIDEBAR_ITEMS (navigation)

└── hooks/
    ├── useAuth.ts           # Auth state hook
    ├── usePrintEstimation.ts # Estimation workflow hook
    └── *.ts                 # Other custom hooks
```

### Backend Structure (`server/`)

```
server/
├── src/
│   ├── index.js             # Express app initialization
│   │                         # - Middleware: helmet, cors, morgan, rate-limit
│   │                         # - Routes: /api/v1/* (system, auth, quotes, rates, etc.)
│   │                         # - Error handler: ZodError → 400, else 500
│   │
│   ├── db.js                # SQLite initialization (better-sqlite3)
│   │                         # - WAL mode for concurrency
│   │                         # - Foreign keys ON
│   │                         # - Schema: users, quotes, rates, files, audit_logs, customers, jobs, inventory
│   │                         # - Migrations run on startup
│   │
│   ├── middleware/
│   │   └── auth.js          # JWT verification + anonymous mode support
│   │                         # - Bearer token extraction
│   │                         # - Role-based access (requireRole middleware)
│   │                         # - Dev mode: allow anonymous API if ALLOW_ANONYMOUS_API=true
│   │
│   ├── routes/              # API endpoints
│   │   ├── auth.js          # POST /register, /login, GET /me
│   │   ├── quotes.js        # GET /list, POST /create, PATCH /:id/status
│   │   ├── rates.js         # Rate card CRUD (admin-only)
│   │   ├── customers.js     # Customer CRUD
│   │   ├── jobs.js          # Job CRUD + history
│   │   ├── inventory.js     # Inventory CRUD + movements
│   │   ├── email.js         # Email sending (nodemailer)
│   │   ├── files.js         # File upload (multer)
│   │   ├── payments.js      # Stripe payment intents
│   │   └── system.js        # System config, health checks
│   │
│   ├── services/
│   │   ├── jwt.js           # signToken, verifyToken (8h expiry)
│   │   ├── auth.js          # Auth helpers
│   │   ├── audit.js         # Audit logging (user, action, entity, details)
│   │   └── email.js         # Email service (SMTP via nodemailer)
│   │
│   ├── data/                # SQLite database file (app.db)
│   └── uploads/             # User file uploads (multer storage)
│
├── package.json             # API dependencies (express, sqlite, jwt, multer, nodemailer, stripe)
└── (server runs on PORT=4000, uses CORS_ORIGIN from env)
```

---

## 🗄️ DATABASE SCHEMA (SQLite)

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
  created_at TEXT NOT NULL
);
```

### Quotes Table
```sql
CREATE TABLE quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  payload_json TEXT NOT NULL,  -- Full EstimationInput + EstimationResult
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft|sent|accepted|rejected|expired|revised
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
```

### Rates Table
```sql
CREATE TABLE rates (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,  -- 'machine_rates', 'paper_rates', 'labour', etc.
  item_key TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(category, item_key),
  FOREIGN KEY(updated_by) REFERENCES users(id)
);
```

### Files Table
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(owner_id) REFERENCES users(id)
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,  -- 'quote.create', 'rate.update', etc.
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,  -- Additional context
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

### Customers Table
```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city, state, country, gst_number, pan_number, priority, status,
  notes TEXT DEFAULT '',
  total_orders INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Jobs Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',  -- draft|quoted|approved|in_production|completed
  quantities TEXT DEFAULT '[]',  -- JSON array of quantities
  paper_type, binding_type, total_value, currency DEFAULT 'INR',
  priority, notes, payload_json,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Inventory Table
```sql
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  category TEXT DEFAULT 'other',  -- paper|plates|ink|chemicals|finishing|packing
  unit TEXT DEFAULT 'Pieces',
  stock REAL DEFAULT 0,
  min_level REAL DEFAULT 0,
  cost_per_unit REAL DEFAULT 0,
  supplier TEXT DEFAULT '',
  last_updated TEXT NOT NULL
);
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Flow
1. **Register/Login** → POST `/api/v1/auth/register` or `/api/v1/auth/login`
2. **JWT Token** → Signed with `JWT_SECRET` (default: "dev-secret"), expires 8h
3. **Bearer Token** → Stored in localStorage as `print-estimator-api-token`
4. **On Request** → `Authorization: Bearer {token}` header
5. **Verification** → `verifyToken()` in auth middleware

### Roles
- **admin** — First registered user, can edit rates, manage users
- **user** — Can create quotes, view-only on rates

### Anonymous Mode
- **Dev Environment** → `ALLOW_ANONYMOUS_API=true` allows requests without token
- **Production** → Requires valid JWT always

---

## 🎨 FRONTEND DATA FLOW

### Zustand Stores (Persistent)
Each store uses `persist` middleware with localStorage:

#### appStore.ts
- **User profile** (name, email, role, company, preferences)
- **Theme** (light/dark)
- **Notifications** (with unread count)
- **Modals** (activeModal, modalData)
- **Settings** (company info, estimation defaults, appearance, backup)
- **Action Methods** — setUser, updateUser, logout, completeOnboarding, toggleTheme, addNotification, etc.

#### estimationStore.ts
- **Current Estimation** (EstimationInput object with all job details)
- **Current Step** (0-14 for 15 wizard steps)
- **Results** (array of EstimationResult for different quantities)
- **Calculation State** (isCalculating, isCalculated, showResults)
- **Action Methods** — updateEstimation, updateEstimationField, nextStep, prevStep, calculate, reset

#### dataStore.ts
- **Jobs** (array of Job objects with ID, number, title, customer, status, value)
- **Quotations** (array of Quote objects with number, customer, amount, status)
- **Customers** (array of Customer objects with code, name, contact info)
- **Drafts** (auto-saved estimations for recovery)
- **Action Methods** — addJob, saveQuote, saveDraft, loadDraft, addCustomer, etc.

#### inventoryStore.ts
- **Inventory Items** (name, SKU, category, stock level, cost, supplier)
- **Movements** (addition/subtraction history)
- **Action Methods** — addItem, updateStock, recordMovement, etc.

#### machineStore.ts
- **Machines** (printing presses with specs: width, height, max colors, speed)
- **Action Methods** — addMachine, updateMachine, getAvailableMachines, etc.

#### rateCardStore.ts
- **Impression Rates** (cost per 1000 impressions by machine)
- **Paper Rates** (cost per kg or per sheet)
- **Labour Rates** (hourly rates by category)
- **Wastage Tables** (% by quantity ranges)
- **Binding Rates** (per-copy costs)
- **Action Methods** — updateRate, getRateForMachine, getWastagePercent, etc.

### Component Architecture
- **Page Components** → Connect to stores (hooks), render content
- **Wizard Steps** → Render form fields, update estimationStore on change
- **Live Preview** → BookPreview component (reads estimationStore, calculates spine thickness)
- **Results Table** → EstimationResults component (displays EstimationResult[] with breakdowns)

---

## 🧮 CALCULATION ENGINE (CORE LOGIC)

### 16-Step Estimation Pipeline (`estimator.ts`)

```
STEP 1-3: Signature & Imposition
  ├─ For each text section: calculate pages per form, sheets per form
  ├─ Determine sheet size (auto-plan with imposition)
  └─ Count total forms

STEP 4: Wastage (ADDITIVE METHOD)
  ├─ Lookup M/R (Make-Ready) wastage from TP wastage chart
  ├─ Add running waste (also from chart)
  └─ CRITICAL: waste = M/R_sheets + running_sheets (NOT multiplicative!)

STEP 5-7: Paper → CTP → Printing (3 SEPARATE cost lines)
  ├─ PAPER COST: calculate net sheets + waste, multiply by TP rate/sheet
  ├─ CTP COST: lookup plate cost (Rs/plate) × number of forms × colors
  └─ PRINTING COST: lookup impression rate (Rs/1000 imprints) from TP tables

STEP 8-9: Binding → Finishing
  ├─ BINDING: Labour, board, glue, film per copy × qty
  └─ FINISHING: Lamination, UV, embossing, die-cutting (per copy)

STEP 10: Covering Material
  ├─ Jacket paper cost (if enabled)
  └─ Endleaves paper cost (if enabled)

STEP 11: PVC (Product Cost) Aggregation
  └─ Sum all paper + printing + binding + finishing + covering

STEP 12: Machine Hours
  ├─ Printing machine hours = (qty × forms) / (SPH × duplexing factor)
  ├─ Binding machine hours = qty / (books/hour)
  ├─ Costing: × hourly machine rate (TP formula)
  └─ Add to PVC

STEP 13: Packing
  ├─ Determine carton size, stack height, weight
  ├─ Tax on cartons, labour for boxing, palletization
  └─ Per-copy cost × qty

STEP 14: Freight
  ├─ Weight × freight rate (TP table)
  ├─ Add terminal handling, insurance
  └─ Per-copy cost × qty

STEP 15: Selling Price (MAX formula from Excel V189)
  └─ selling_price = MAX(
       (pvc + machine_overhead/qty/conv) / (1 - margin),
       pvc / (1 - discount) / (1 - margin)
     )

STEP 16: Currency Conversion
  └─ If not INR: divide by exchange rate
```

### Key Calculation Modules

#### paper.ts — Paper Physics Engine
- **Input:** trim size, pages, GSM, paper type, quantity
- **Process:**
  - Auto-plan: evaluate ALL standard paper sizes (23×36, 25×36, 28×40, etc.)
  - For each size: calculate imposition (pages/form, sheets/form)
  - Check grain direction compatibility
  - Calculate net sheets, wastage sheets, gross sheets
  - Look up paper cost from rate card or inventory
- **Output:** PaperCostResult with weight, cost, imposition details
- **CRITICAL:** Wastage is ADDITIVE (M/R sheets + running sheets), not multiplicative

#### printing.ts — Printing Cost
- **Input:** forms, colors, quantity, machine code, sheet size
- **Process:**
  - Lookup impression rate from TP tables (by machine, color count, qty range, sheet size)
  - Calculate imprints = qty × forms × (2 if perfecting else 1)
  - Cost = imprints / 1000 × rate
  - Add makeready makeready cost (TP formula)
- **Output:** PrintingCostResult with per-copy breakdown

#### binding.ts — Binding Cost
- **Input:** binding method, quantity, book dimensions, sections
- **Process:**
  - Calculate spine thickness (pages × GSM × bulk / 1000)
  - For hardcase: board cost, glue, adhesive, labour
  - For perfect: adhesive film, signatures
  - Add sewing if needed
  - Kinematics: setup time + running time at machine speed
  - Labour cost = time × hourly rate
- **Output:** BindingCostResult with per-copy breakdown

#### finishing.ts — Finishing Operations
- **Lamination** — Sheet area based, per-copy cost
- **UV Coating** — % surcharge on sheet cost
- **Embossing** — Fixed + variable cost per cm²
- **Die-Cutting** — Setup + per-piece cost
- **Output:** FinishingCostResult with per-copy breakdown

#### packing.ts — Packing Logistics
- **Input:** qty, book dimensions, packaging spec
- **Process:**
  - Determine carton size (books per carton)
  - Calculate cartons needed
  - Estimate weight + handling
  - Lookup packing labour rate
  - Add palletization if applicable
- **Output:** PackingCostResult with per-copy breakdown

#### freight.ts — Freight & Delivery
- **Input:** total weight, destination (city/state/country), delivery mode
- **Process:**
  - Lookup freight rate by weight range
  - Calculate total weight = book weight × qty
  - Cost = weight × rate
  - Add terminal handling, GST
- **Output:** FreightCostResult with per-copy breakdown

#### constants.ts — TP Rate Tables
All data from Thomson Press (India) PDF manual:

**IMPRESSION_RATES_DATA:**
```
[
  { range: [0, 500], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [501, 1000], fav: 229, ... },
  ...
  { range: [50001, ∞], fav: 169, rekordAQ: 151, ... }
]
// Units: Rs per 1000 impressions
```

**BULK_FACTORS:**
```
{
  'Matt': 1.0,
  'Gloss': 0.9,
  'CW (Woodfree)': 1.4,
  'HB (Holmen Bulky)': 2.3,
  'Bible Paper': 0.7,
  'Art Card': 1.2,
  ...
}
```

**WASTAGE_CHART:**
```
[
  { minQty: 0, maxQty: 1000, fourColor: 200, twoColor: 150, oneColor: 100, isPercentage: false },
  ...
  { minQty: 50001, maxQty: ∞, fourColor: 2.5, twoColor: 2.0, oneColor: 1.5, isPercentage: true },
]
// First entries are ITEMS (sheets), last are PERCENTAGE
```

**DEFAULT_MACHINES:**
```
[
  { id: 'fav', name: 'Favourit (FAV)', maxSheetWidth: 28, maxSheetHeight: 40, maxColors: 4, speedSPH: 8000, ... },
  { id: 'rekord_aq', name: 'Rekord (With AQ)', hasAQUnit: true, speedSPH: 5500, ... },
  { id: 'rmgt', name: 'RMGT', hasAQUnit: false, speedSPH: 6500, hasPerfector: true, ... },
  ...
]
```

### Input Validation (`validate.ts`)
- **Checks:** trim size range, GSM within machine capacity, no zero quantities
- **Warnings:** high wastage, non-optimal imposition, extreme margins
- **Returns:** { valid: bool, errors: [], warnings: [] }

### Debug Tracing (`trace.ts`)
- **Purpose:** Compare calculated costs against Excel calibration
- **Methods:** `createTrace()`, `trace.log()`, `trace.value()`, `trace.cost()`
- **Output:** Console log of step-by-step calculation
- **Calibration Target:** Rs 65.25/copy (Rs 21.53 paper + Rs 31.31 production + others)

---

## 🎯 ESTIMATION INPUT TYPES

### EstimationInput (Main Type)
```typescript
{
  id: string;
  jobTitle: string;
  customerName: string;
  customerId: string;
  estimatedBy: string;
  estimationDate: string;  // YYYY-MM-DD
  poNumber: string;

  // Book Specifications
  bookSpec: {
    heightMM: 234;
    widthMM: 153;
    trimSizePreset: string;  // e.g., "Royal Octavo (153 × 234mm)"
    spineThickness: number;
    spineWithBoard: number;
    totalPages: number;  // Derived from text sections
  };

  // Quantities (5 slots)
  quantities: [number, number, number, number, number];

  // Text Sections (2 slots, usually section 1 used)
  textSections: [
    {
      id: string;
      enabled: boolean;
      label: string;  // "Text Section 1"
      pages: number;
      colorsFront: 4;  // CMYK
      colorsBack: 4;
      paperTypeId: string;  // "matt"
      paperTypeName: string;  // "Matt Art Paper"
      gsm: 150;
      paperSizeLabel: "23×36";
      machineId: string;  // "rmgt"
      machineName: string;
      plateChanges: number;
      printingMethod: "sheetwise" | "work_and_turn" | "perfecting";
    },
    ...
  ];

  // Cover (always 4PP wrapped)
  cover: {
    enabled: true;
    pages: 4;
    colorsFront: 4;
    colorsBack: 0;
    paperTypeId: "Art card";
    gsm: 300;
    foldType: "wrap_around" | "gatefold" | "french_fold";
    selfCover: false;
    separateCover: true;
  };

  // Jacket (optional)
  jacket: {
    enabled: boolean;
    colorsFront: 4;
    colorsBack: 0;
    paperTypeId: string;
    gsm: 130;
    laminationType: "gloss" | "matt" | "none";
    goldBlockingFront: boolean;
    spotUV: boolean;
    flapWidth: number;  // mm
  };

  // Endleaves (optional)
  endleaves: {
    enabled: boolean;
    pages: number;  // Usually 8
    gsm: number;
    paperTypeName: string;
  };

  // Binding
  binding: {
    primaryBinding: "PERFECT" | "CASE" | "SADDLE" | "WIRO" | "SPIRAL";
    caseBindingSpec: {
      boardThickness: 3;
      coverMaterial: string;
      foilStamping: boolean;
    };
  };

  // Finishing
  finishing: {
    lamination: {
      type: "GLOSS" | "MATT" | "SOFT_TOUCH" | "NONE";
      area: "COVER_ONLY" | "TEXT_COVER" | "FULL_BOOK";
    };
    uvCoating: boolean;
    embossing: boolean;
    dieCutting: boolean;
    hottoolStamping: boolean;
  };

  // Packing
  packing: {
    cartonType: "BOX_30" | "BOX_20" | "CARTON_SLEEVE";
    booksPerCarton: number;
    palletization: boolean;
    palletType: "WOODEN" | "PLASTIC";
  };

  // Delivery
  delivery: {
    destination: string;
    deliveryMode: "GROUND" | "EXPRESS" | "AIR";
  };

  // Pre-Press
  prePress: {
    proofType: "DIGITAL_PROOF" | "CHEMPROOF" | "WET_PROOF" | "NONE";
    proofQuantity: number;
  };

  // Pricing
  pricing: {
    currency: "INR" | "GBP" | "USD" | "EUR" | ...;
    marginPercent: 25;  // 25% markup
    discountPercent: 5;  // 5% discount
    taxRate: 0;  // Usually 0 for export
    customPrice: number;  // Override if manual
  };

  // Additional
  additional: {
    packingCharge: number;
    handlingCharge: number;
    freightCharge: number;
  };

  notes: string;
}
```

### EstimationResult (Output Type)
```typescript
{
  id: string;
  estimationId: string;
  quantity: number;

  // Cost Breakdown
  paperCosts: SectionPaperCost[];  // per section + total
  printingCosts: SectionPrintingCost[];  // per section
  ctpCosts: SectionCTPCost[];  // plates
  bindingCost: number;  // per copy
  finishingCost: number;  // per copy
  packingCost: PackingBreakdown;  // per copy + total
  freightCost: number;  // per copy
  machineOverhead: number;  // per copy

  totalProductionCost: number;  // per copy, INR
  totalCostForQuantity: number;  // total for all qty, INR

  // Pricing
  sellingPricePerCopy: number;
  totalSellingPrice: number;
  totalMargin: number;
  marginPercent: number;

  // Conversion
  currency: string;
  exchangeRate: number;
  sellingPriceInTargetCurrency: number;

  timestamp: string;
}
```

---

## 📊 15 WIZARD STEPS

The `NewEstimate.tsx` page renders a 15-step wizard:

1. **Basic Info** — Job title, customer, reference number, estimated by
2. **Book Spec** — Trim size, quantities (up to 5)
3. **Text Sections** — Paper type, GSM, machine, colors
4. **Cover** — Cover paper, fold type, covering material
5. **Jacket** — Dust jacket (optional), lamination type
6. **Endleaves** — Endpapers (optional)
7. **Binding** — Method selection (perfect, case, etc.)
8. **Finishing** — Lamination, UV, embossing, die-cutting
9. **Packing** — Carton type, books per carton, palletization
10. **Delivery** — Destination, delivery mode
11. **Pre-Press** — Proof type (digital/wet/chem), proof qty
12. **Pricing** — Currency, margin %, discount %, tax
13. **Additional** — Extra line items (packing charge, etc.)
14. **Notes** — Free-text notes
15. **Review** — Summary, price preview, Create Estimate button

Each step has:
- Step header with icon
- Form fields (bound to estimationStore)
- Previous/Next navigation
- Live validation errors
- Live book preview (right panel)

---

## 🔧 REQUIRED DEPENDENCIES & VERSIONS

### Frontend Dependencies (package.json)
```json
{
  "react": "^19.2.4",
  "react-dom": "^19.2.4",
  "react-router-dom": "^7.13.0",
  "@tanstack/react-query": "^5.90.21",
  "@tanstack/react-table": "latest",
  "zustand": "^5.0.11",
  "immer": "latest",
  "@hookform/resolvers": "^5.2.2",
  "react-hook-form": "^7.71.2",
  "zod": "^4.3.6",
  "tailwindcss": "^3.4.19",
  "lucide-react": "^0.575.0",
  "recharts": "^3.7.0",
  "jspdf": "^2.5.2",
  "jspdf-autotable": "^5.0.7",
  "react-to-print": "latest",
  "date-fns": "^4.1.0",
  "lodash-es": "latest",
  "uuid": "^13.0.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.5.0",
  "@tauri-apps/api": "^2.10.1",
  "@tauri-apps/plugin-dialog": "latest",
  "@tauri-apps/plugin-fs": "latest",
  "@tauri-apps/plugin-opener": "^2.5.3"
}
```

### Backend Dependencies (server/package.json)
```json
{
  "express": "^4.21.2",
  "cors": "^2.8.5",
  "helmet": "^8.1.0",
  "morgan": "^1.10.1",
  "express-rate-limit": "^8.1.0",
  "better-sqlite3": "^11.10.0",
  "zod": "^4.3.6",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "dotenv": "^17.2.3",
  "multer": "^2.0.2",
  "nodemailer": "^7.0.10",
  "stripe": "^18.4.0"
}
```

### DevDependencies (Main)
```json
{
  "typescript": "~5.8.3",
  "vite": "^7.3.1",
  "@vitejs/plugin-react": "^4.7.0",
  "eslint": "^9.38.0",
  "@typescript-eslint/eslint-plugin": "^8.46.1",
  "@typescript-eslint/parser": "^8.46.1",
  "prettier": "^3.6.2",
  "concurrently": "^9.2.1",
  "@tauri-apps/cli": "^2.10.0"
}
```

### Node Version
- **Node.js:** 20+ (20, 22 tested)
- **npm:** 10+
- **Python:** 3.8+ (for some build tools)
- **Rust:** Latest stable (for Tauri builds, desktop only)

---

## 🚀 RUNNING THE PROJECT

### Development (Web Only)

```bash
# Install dependencies
npm install

# Terminal 1: Frontend (Vite dev server on port 1420)
npm run dev

# Terminal 2: Backend API (Node on port 4000)
npm run api:dev

# Both together
npm run dev:full
```

### Development (Desktop via Tauri)

```bash
# Install Rust toolchain first (if not already)
# https://www.rust-lang.org/tools/install

# Then:
npm install
npm run tauri dev

# Opens Tauri dev window connected to http://localhost:1420
```

### Build

```bash
# Web build (produces dist/ folder)
npm run build

# Serve preview
npm run preview

# Desktop build (produces .msi, .dmg, .AppImage)
npm run tauri build
```

### Testing

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format

# Unit tests
npm test

# Benchmark
npm run benchmark
```

### Docker

```bash
# Build & run both (frontend @ 8080, backend @ 4000)
docker-compose up --build

# Or individually:
docker build -f Dockerfile.backend -t print-estimator-api .
docker run -p 4000:4000 -e PORT=4000 print-estimator-api

docker build -f Dockerfile.frontend -t print-estimator-web .
docker run -p 80:80 print-estimator-web
```

---

## 🎛️ ENVIRONMENT VARIABLES

### Backend (.env file)

```bash
# Server
NODE_ENV=development  # or production
PORT=4000
CORS_ORIGIN=http://localhost:1420

# Database
DB_PATH=./server/data/app.db

# JWT
JWT_SECRET=dev-secret  # CHANGE in production!
JWT_EXPIRES_IN=8h

# Upload
UPLOAD_DIR=./server/uploads
MAX_UPLOAD_SIZE_MB=50

# Email (nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@printestimator.com

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Auth
ALLOW_ANONYMOUS_API=false  # Set true for dev/local-only

# Optional: Mail simulation
SIMULATE_EMAIL=true  # Log email instead of sending
```

### Frontend (.env file in root)

```bash
# API
VITE_API_URL=/api/v1  # Proxied by Vite, or full URL

# App
VITE_APP_NAME=Print Estimator Pro
VITE_APP_VERSION=2.0.0

# Feature flags
VITE_ENABLE_CALIBRATION_MODE=false  # Show debug traces
```

---

## 📐 DESIGN SYSTEM & STYLING

### Tailwind Configuration
- **Colors:** Custom palette (primary, secondary, accent, surface, text)
- **Dark Mode:** Enabled via `.dark` class on document root
- **Spacing:** 4px base unit
- **Typography:** System font stack + custom weights
- **Breakpoints:** sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)

### CSS Classes Structure
- **Components:** Scoped class names (`.card`, `.button`, `.wizard-header`)
- **Utilities:** Tailwind utility classes (`gap-4`, `p-6`, `text-lg`, etc.)
- **Dark Mode:** `dark:bg-surface-dark-secondary`, `dark:text-text-dark-primary`
- **Responsive:** `sm:w-1/2 lg:w-1/3`

### Component Guidelines
- **Form inputs:** Label + validation error below
- **Buttons:** Size variants (sm, md, lg), icon support, loading state
- **Cards:** Rounded corners, soft shadow, border
- **Modals:** Centered, dark overlay, keyboard navigation
- **Accessibility:** Focus visible, ARIA labels, semantic HTML

---

## 🔒 SECURITY MEASURES

1. **Helmet.js** — Sets security headers (XSS protection, CSP, clickjacking)
2. **CORS Policy** — Limited to `CORS_ORIGIN` env var
3. **Rate Limiting** — 600 req/15min for `/api/v1`, 20 for `/api/v1/auth`
4. **JWT Authentication** — 8h expiry, Bearer token
5. **Password Hashing** — bcrypt with salt rounds 12
6. **SQL Injection** — Parameterized queries (better-sqlite3)
7. **CSRF Protection** — Vite proxy handles same-origin validation
8. **File Upload Validation** — MIME type check, size limits, unique storage names
9. **Input Validation** — Zod schema validation on all endpoints
10. **Audit Logging** — All user actions logged to audit_logs table

---

## 🐛 ERROR HANDLING & LOGGING

### Frontend
- **React Error Boundaries** — Catch component render errors
- **Try-Catch Blocks** — Async operations wrapped
- **User Feedback** — Toast notifications (appStore.addNotification)
- **Console Logging** — DEV mode only, console.*() with context
- **Telemetry** — logEvent() for tracking user flows

### Backend
- **Express Error Handler** — Catches all route errors
- **Validation Errors** — ZodError → 400 Bad Request + field details
- **Auth Errors** — 401 Unauthorized / 403 Forbidden
- **Server Errors** — 500 + generic message (no stack trace to client)
- **Audit Logging** — All user actions logged (writeAudit function)

### Debugging

```bash
# Frontend: Enable debug traces
window.__PRINT_DEBUG__ = true

# Backend: Enable debug logging
DEBUG=print-estimator:* npm run api:dev

# Check calculation traces
// In browser console after calculation:
console.log(results[0].debugTrace)
```

---

## 🏗️ ARCHITECTURE DECISIONS

### Why Zustand + Immer?
- **Small bundle**: Better than Redux for this app size
- **Immer middleware**: Immutable updates without boilerplate
- **Persistence**: Built-in localStorage support
- **Ecosystem**: Works well with React Query

### Why Tauri (not Electron)?
- **Lightweight**: Uses OS WebView, not Chromium
- **Smaller binary**: ~60MB vs 200MB+ for Electron
- **Better performance**: Native Rust integration
- **Security**: Rust memory safety + explicit permission model
- **File system access**: Direct FS integration without Node.js overhead

### Why Vite (not Webpack)?
- **Fast dev server**: Sub-second HMR
- **Native ES modules**: No bundling needed in dev
- **Fast build**: Production builds are blazingly fast
- **Smaller config**: Simple vite.config.ts vs webpack.config.js

### Why SQLite (not PostgreSQL)?
- **Local-first design**: No external database needed
- **Multi-user ready**: WAL mode + transactions
- **File-based**: Easy backup + migration
- **Embedded**: Comes with Node (better-sqlite3)
- **Scalable**: Good performance for 10k-100k records

### Why Rate-Based Calculation?
- **Excel calibration**: Rates directly from Thomson Press PDF
- **Audit trail**: Every rate change is tracked
- **Role-based admin**: Only admins can modify rates
- **Multi-tenant support**: Different customers can have different rates

---

## 📚 KEY FILES TO UNDERSTAND FIRST

1. **src/utils/calculations/estimator.ts** — Full 16-step pipeline (START HERE)
2. **src/types/index.ts** — Type hierarchy (EstimationInput, EstimationResult)
3. **src/stores/estimationStore.ts** — Estimation state management
4. **src/pages/NewEstimate.tsx** — UI flow rendering
5. **server/src/db.js** — Database schema
6. **server/src/index.js** — Express routes
7. **src/constants/index.ts** — All TP rates + machine specs
8. **src/utils/calculations/paper.ts** — Paper physics engine

---

## 🎯 CURRENT STATE & NEXT STEPS

### What's Working
✅ 15-step wizard (clean, no auto-planning)
✅ Full calculation pipeline (16 steps)
✅ Quotation creation & persistence
✅ CSV export
✅ PDF generation (jsPDF)
✅ Tauri desktop build
✅ Admin rate card editing
✅ Backend API (Express + SQLite)
✅ JWT authentication
✅ Dark mode

### Known Limitations
⚠️ Some pages still use mocked data (Inventory, Reports)
⚠️ Email sending not fully integrated (Nodemailer configured but needs SMTP setup)
⚠️ Stripe integration (payment endpoints created but not fully tested)
⚠️ Rate-limiting more relaxed than production (adjust in production)
⚠️ Tauri packaging requires platform-specific native dependencies
⚠️ Desktop auto-updates not implemented

### Next Priority Items
🔄 Complete Inventory page (real stock tracking)
🔄 Implement Reports dashboard (charting, analytics)
🔄 Email delivery workflow (quote sending)
🔄 User role management (admin panel)
🔄 Database backup/restore functionality
🔄 Advanced optimization (Monte Carlo simulations for cost sensitivity)
🔄 Mobile responsive improvements
🔄 Performance optimizations (virtualization for large lists)
🔄 Test coverage (unit + integration tests)
🔄 Production deployment documentation

---

## 📞 KEY CONTACTS & RESOURCES

### Documentation
- **Backend API:** `docs/backend-api.md`
- **Browser Compatibility:** `docs/browser-compatibility.md`
- **Rate Limiting:** `docs/rate-limiting.md`
- **Implementation TODO:** `TODO_IMPLEMENTATION.md`

### External Package Docs
- Tauri: https://tauri.app/
- React Router: https://reactrouter.com/
- Zustand: https://github.com/pmndrs/zustand
- Tailwind CSS: https://tailwindcss.com/
- jsPDF: https://parallaxes.github.io/jspdf/
- Recharts: https://recharts.org/

### Common Tasks

**Add a new wizard step:**
1. Create component in `src/components/wizard/StepXyz.tsx`
2. Add to WIZARD_STEPS in `src/constants/index.ts`
3. Export from `WizardStepRenderer.tsx`
4. Add EstimationInput field in `src/types/index.ts`

**Add a new rate to the rate card:**
1. Define in `src/constants/index.ts` (in DEFAULT_RATES)
2. Create DB entry via `server/routes/rates.js` POST
3. Update calculation logic in `src/utils/calculations/*.ts`
4. Add to rate card UI in `src/pages/RateCard.tsx`

**Connect a new page to backend:**
1. Create API methods in `server/routes/*.js`
2. Define types in `server/src/routes/*` or use Zod
3. Call via `apiClient.*()` in `src/api/client.ts`
4. Wire up to page component with useQuery/useMutation
5. Display results in component, handle errors

---

## 📝 HANDOFF CHECKLIST

When handing off to another developer:

- [ ] Clone repo and install dependencies: `npm install`
- [ ] Create `.env` file with DATABASE_URL, JWT_SECRET
- [ ] Run `npm run dev:full` and verify port 1420 (frontend) + 4000 (backend) working
- [ ] Load test data: Check `src/stores/dataStore.ts` for mock data initialization
- [ ] Explore NewEstimate.tsx → create a test quotation end-to-end
- [ ] Review calculation engine (`estimator.ts`) + calibration values
- [ ] Check database schema (`server/src/db.js`) and understand relationships
- [ ] Understand Zustand stores and how data persists to localStorage
- [ ] Read through `WIZARD_STEPS` configuration in `constants/index.ts`
- [ ] Run tests: `npm test`
- [ ] Review linting: `npm run lint`
- [ ] Test Docker build: `docker-compose up --build`
- [ ] Understand rate tables and how to modify them
- [ ] Review authentication flow (`server/routes/auth.js`)
- [ ] Test quotation export to CSV and PDF

---

## 🚨 CRITICAL GOTCHAS

1. **Wastage is ADDITIVE** — `total = net_sheets + mr_waste_sheets + running_waste_sheets`, NOT multiplicative
2. **Exchange rates are vs INR** — If another currency, divide final price by rate, don't multiply
3. **Machine hours calculation** — Must account for duplexing factor (perfector reduces time)
4. **Bulk factors vary by paper type** — "Bible Paper" = 0.7, "HB" = 2.3, so spine thickness can vary greatly
5. **Impression rates by SHEET SIZE** — Not just by machine, must check 23×36 vs 28×40 rates
6. **PVC aggregation** — Don't forget endleaves, jacket, covering material costs
7. **Selling price formula (V189)** — MAX of two options, not simple markup
8. **First user = admin** — Automatically assigned admin role on first registration
9. **Rate-limiting is global** — All users share the 600 req/15min limit, be careful in production
10. **Tauri CSP** — Set to `null` for dev, tighten in production build

---

**END OF HANDOFF DOCUMENT**

Start with reading `estimator.ts` for full understanding of the calculation pipeline. That's the heart of the application.

Good luck! 🚀
