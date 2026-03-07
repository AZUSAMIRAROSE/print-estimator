# QUICK REFERENCE GUIDE — PRINT ESTIMATOR PRO

## File Locations Quick Map

### Core Logic (MUST READ IN THIS ORDER)
1. `src/utils/calculations/estimator.ts` — 16-step main pipeline
2. `src/utils/calculations/paper.ts` — Paper cost + imposition
3. `src/utils/calculations/printing.ts` — Machine + impression rates
4. `src/utils/calculations/binding.ts` — Binding methods
5. `src/constants/index.ts` — All rates + machine specs

### State Management
- `src/stores/appStore.ts` — User, theme, notifications
- `src/stores/estimationStore.ts` — Wizard state + calculation
- `src/stores/dataStore.ts` — Jobs, quotes, customers, drafts
- `src/stores/machineStore.ts` — Machine definitions
- `src/stores/rateCardStore.ts` — Industry rates

### Pages (Routes)
- `src/pages/NewEstimate.tsx` — 15-step wizard (START HERE for UI)
- `src/pages/Dashboard.tsx` — KPI overview
- `src/pages/RateCard.tsx` — Admin rate editor
- `src/pages/Quotations.tsx` — Quote list + export
- `src/pages/Jobs.tsx` — Job history

### Components
- `src/components/wizard/` — 15 step form components
- `src/components/results/EstimationResults.tsx` — Cost breakdown table
- `src/components/layout/MainLayout.tsx` — Sidebar + Header
- `src/components/ui/` — Buttons, forms, modals

### Backend
- `server/src/index.js` — Express app (routes, middleware)
- `server/src/db.js` — SQLite schema + init
- `server/src/routes/auth.js` — Login/Register (JWT)
- `server/src/routes/quotes.js` — Quote CRUD
- `server/src/routes/rates.js` — Rate card endpoints
- `server/src/middleware/auth.js` — JWT verification

### Types
- `src/types/index.ts` — EstimationInput, EstimationResult, all domain types
- `src/types/machine.types.ts` — Machine interface (CANONICAL)
- `src/api/types.ts` — API request/response types

### Config
- `vite.config.ts` — Port 1420, proxy /api → localhost:4000
- `tailwind.config.js` — Design tokens (colors, spacing)
- `tsconfig.json` — ES2021, strict mode, path aliases
- `src-tauri/tauri.conf.json` — Tauri desktop config

---

## Data Flow Diagram

```
┌──────────────────────────────────────┐
│  User Input (NewEstimate.tsx)        │
│  15-step wizard form                 │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  State Management (estimationStore)  │
│  EstimationInput object persisted    │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Validation (validate.ts)            │
│  Check for mandatory fields          │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Calculation Engine (estimator.ts)   │
│  16-step pipeline execution          │
│  ├─ paper.ts (Step 1-5)              │
│  ├─ printing.ts (Step 7)             │
│  ├─ binding.ts (Step 8)              │
│  ├─ finishing.ts (Step 9)            │
│  ├─ packing.ts (Step 13)             │
│  ├─ freight.ts (Step 14)             │
│  └─ Selling Price (Step 15)          │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│  Results (EstimationResult[])        │
│  Cost per copy, total, breakdown     │
└──────────────────┬──────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
┌─────────────┐           ┌────────────────┐
│   Display   │           │   Save Quote   │
│   Results   │           │   (Backend)    │
│   Component │           └────────────────┘
└─────────────┘                  │
                                 ▼
                         ┌──────────────────┐
                         │  SQLite Database │
                         │  quotes table    │
                         └──────────────────┘
```

---

## Database Schema At A Glance

### Minimal Version (Core)
```sql
-- Users
users: id, email, password_hash, name, role

-- Estimation Results
quotes: id, quote_number, customer_name, payload_json, total_amount, status, created_by

-- Rate Management
rates: id, category, item_key, value, updated_by

-- Audit Trail
audit_logs: id, user_id, action, entity_type, entity_id, details_json

-- Supporting
files: id, owner_id, storage_name, size_bytes
customers: id, code, name, email, contact details
jobs: id, job_number, title, customer_id, status, payload_json
inventory: id, name, sku, stock, cost_per_unit
```

### One Row Example (Quote)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "quote_number": "QT-2026-003",
  "customer_name": "Culinary Press",
  "customer_email": "sales@culinary.in",
  "payload_json": {
    "estimationInput": { ... 15 step data ... },
    "results": [ ... cost breakdown ... ]
  },
  "total_amount": 613950,  // Rs (or converted to target currency)
  "status": "draft",  // draft|sent|accepted|rejected
  "created_by": "user-123",
  "created_at": "2026-03-07T10:30:00Z",
  "updated_at": "2026-03-07T10:30:00Z"
}
```

---

## Environment Variables Checklist

### Backend (.env)
```bash
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:1420

DB_PATH=./server/data/app.db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=8h

ALLOW_ANONYMOUS_API=false  # true for dev/testing
UPLOAD_DIR=./server/uploads
```

### Frontend (vite config, no .env needed for dev)
```
Built-in defaults:
API_BASE = /api/v1 (proxied by Vite)
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose | Auth | Response |
|--------|----------|---------|------|----------|
| POST | `/api/v1/auth/register` | Create user | None | `{token, user}` |
| POST | `/api/v1/auth/login` | Authenticate | None | `{token, user}` |
| GET | `/api/v1/auth/me` | Get current user | JWT | `{user}` |
| GET | `/api/v1/quotes` | List quotes | JWT | `{quotes: []}` |
| POST | `/api/v1/quotes` | Create quote | JWT | `{id, ...}` |
| PATCH | `/api/v1/quotes/:id/status` | Update status | JWT | Updated quote |
| GET | `/api/v1/rates` | List rates | JWT | `{rates: []}` |
| POST | `/api/v1/rates` | Create rate | JWT + Admin | Created rate |
| GET | `/api/v1/customers` | List customers | JWT | `{customers: []}` |
| POST | `/api/v1/customers` | Create customer | JWT | Created customer |
| GET | `/api/v1/jobs` | List jobs | JWT | `{jobs: []}` |
| POST | `/api/v1/jobs` | Create job | JWT | Created job |
| GET | `/api/v1/inventory` | List inventory | JWT | `{items: []}` |
| POST | `/api/v1/inventory` | New item | JWT | Created item |

---

## Common Tasks & Quick Solutions

### Task: Add new machine to rate card
```typescript
// 1. Define in constants/index.ts
export const DEFAULT_MACHINES = [
  // ... existing ...
  {
    id: "new-machine",
    name: "New Model Press",
    maxSheetWidth: 28,
    maxSheetHeight: 40,
    speedSPH: 7000,
    // ... other specs ...
  }
];

// 2. Update IMPRESSION_RATES if rates differ
// 3. Machine appears in wizard dropdowns automatically
```

### Task: Change paper rate
```typescript
// Option A: Admin UI (RateCard.tsx) — preferred
// 1. Admin login
// 2. Navigate to /rate-card
// 3. Find paper in table, click edit, update cost
// 4. Save — updates DB, all future quotes use new rate

// Option B: Direct DB (dev only)
// 1. sqlite3 server/data/app.db
// 2. INSERT or UPDATE rates where category='paper_rates'
```

### Task: Fix calculation for edge case
```typescript
// 1. Enable debug trace
// In browser: window.__PRINT_DEBUG__ = true
// Or in estimator.ts: const trace = createTrace(..., true)

// 2. Run calculation
// 3. Check console output for step-by-step breakdown
// 4. Compare against expected values

// 5. Edit calculation file (e.g., paper.ts)
// 6. Re-import constants if rates changed
// 7. Test again
```

### Task: Add new validation rule
```typescript
// In src/utils/calculations/validate.ts:

function validateJob(estimation: EstimationInput) {
  // ... existing checks ...
  
  // NEW CHECK
  if (estimation.bookSpec.spineThickness > 50) {
    errors.push("Spine too thick (>50mm) — consider splitting into volumes");
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

### Task: Connect new backend endpoint to UI
```typescript
// 1. Create route in server/routes/newfeature.js
// export POST /api/v1/newfeature/action

// 2. Add to index.js
// app.use("/api/v1/newfeature", newfeatureRoutes);

// 3. Add API client method in src/api/client.ts
// export const apiClient = {
//   ...
//   myNewAction: (payload) => request("/newfeature/action", { method: "POST", body: JSON.stringify(payload) }),
// }

// 4. Use in component
// const { mutate } = useMutation(apiClient.myNewAction, {
//   onSuccess: (data) => { /* handle */ }
// });
```

---

## Debugging Checklist

### Frontend Issue: Calculation gives wrong price
- [ ] Check validation errors (displayed above calculate button)
- [ ] Enable debug trace: `window.__PRINT_DEBUG__= true`
- [ ] Verify quantities are > 0
- [ ] Check paper rate in rate card
- [ ] Check machine speed in rate card
- [ ] Compare result against Excel calibration file

### Frontend Issue: API not called
- [ ] Check backend is running on port 4000
- [ ] Check `vite.config.ts` proxy is configured
- [ ] Check JWT token in localStorage
- [ ] Verify Content-Type is application/json
- [ ] Check Network tab for request/response

### Backend Issue: Quote not saving
- [ ] Check DB file exists: `ls -la server/data/app.db`
- [ ] Verify user is authenticated (valid JWT)
- [ ] Check Zod schema validation (may reject fields)
- [ ] Look for SQL errors in server console

### General: Lost data after refresh
- [ ] Check localStorage (F12 → Storage → Local Storage)
- [ ] Verify Zustand persist middleware is active
- [ ] Backend auto-save not working? Switch to manual "Save Draft"

---

## Deployment Checklist

### Docker
```bash
# Build images
docker build -f Dockerfile.frontend -t estimator-web:latest .
docker build -f Dockerfile.backend -t estimator-api:latest .

# Run stack
docker-compose up

# Verify
curl http://localhost:4000/api/v1/system/health
curl http://localhost:8080/
```

### Environment (Production)
```bash
# Backend .env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://estimator.yourcompany.com
JWT_SECRET=GENERATE_STRONG_SECRET
ALLOW_ANONYMOUS_API=false
UPLOAD_DIR=/var/estimator/uploads
DB_PATH=/var/estimator/data/app.db

# Tauri desktop
# Requires build machine with Rust/Node
npm run tauri build
# Outputs: src-tauri/target/release/
```

---

## Performance Tips

1. **Memoize heavy calculations:**
   ```typescript
   const spineThickness = useMemo(() => calculateSpineThickness(...), [deps]);
   ```

2. **Lazy load large lists:**
   ```typescript
   // Use react-table with virtualization for 10k+ jobs
   import { useVirtual } from "react-virtual";
   ```

3. **Cache API responses:**
   ```typescript
   // React Query already handles this, staleTime=5min
   ```

4. **Reduce wizard re-renders:**
   ```typescript
   // Use individual update functions, not updateEstimation
   updateEstimationField("bookSpec.widthMM", value);
   ```

---

## Testing Commands

```bash
# Type check (catch TS errors)
npx tsc --noEmit

# Linting
npm run lint

# Format code
npm run format

# Unit tests
npm test

# Benchmark calculations
npm run benchmark
```

---

## Rate Table Structure

All rates are **indexed by category**:

```typescript
const rates = {
  "impression_rates": { machineId: { qty_range: price } },
  "paper_rates": { paperType: { gsm: { size: price } } },
  "binding_rates": { method: { pageRange: price } },
  "finishing_rates": { operation: { type: price } },
  "packing_rates": { carton_type: price },
  "machine_makeready": { machineId: cost },
  "labour_rates": { category: hourlyRate },
  "ctp_rates": { sheetSize: costPerPlate },
  "freight_rates": { zone: pricePerKG },
  "wastage_table": { qty_range: { color: percentage } },
}
```

To add a new rate:
1. Identify category
2. Identify lookup key (machine, paper type, etc.)
3. Insert row in DB via Rate Card UI or API
4. Calculation logic automatically looks it up

---

## Key Version Info

| Component | Version | Notes |
|-----------|---------|-------|
| React | 19.2.4 | Latest, with Server Components |
| TypeScript | 5.8.3 | Strict mode on |
| Tailwind CSS | 3.4.19 | With custom tokens |
| Vite | 7.3.1 | Sub-second HMR |
| Node.js | 20/22 | Backend requirement |
| SQLite | 3.x | Via better-sqlite3 |
| Tauri | 2.x | Desktop shell |

---

## Gotchas & Warnings ⚠️

1. **Don't use multiplicative wastage:**
   ```javascript
   // WRONG: qty × (1 + waste1) × (1 + waste2)
   // RIGHT: qty + waste1_sheets + waste2_sheets
   ```

2. **Selling price uses MAX logic:**
   ```javascript
   // Take the maximum of two formulas, not minimum!
   price = MAX(overhead_approach, margin_approach)
   ```

3. **Exchange rates are vs INR:**
   ```javascript
   // To convert INR to GBP: price_inr / 108.5
   // NOT price_inr × 108.5 (that's backwards!)
   ```

4. **Machine speed changes with duplex:**
   ```javascript
   // Perfector = 60% of simplex speed (factor: 0.6)
   // Account for this in machine hours calculation
   ```

5. **First user becomes admin:**
   ```javascript
   // If app has no users, first registrant is automatic admin
   // Useful for initial setup, dangerous in shared environments
   ```

6. **localStorage is not secure:**
   ```javascript
   // API token stored in localStorage (visible to JS)
   // Fine for internal tools, risky for public SaaS
   // Solution: httpOnly cookies in production
   ```

7. **Rate limits are global:**
   ```javascript
   // All users share 600 requests/15min for /api/v1
   // Create separate rate limit config for each user in production
   ```

---

## Links & Resources

- **Tauri Docs:** https://tauri.app/
- **React Router:** https://reactrouter.com/
- **Zustand:** https://github.com/pmndrs/zustand
- **Tailwind:** https://tailwindcss.com/
- **jsPDF:** https://parallaxes.github.io/jspdf/
- **SQLite Browser:** https://sqlitebrowser.org/ (inspect DB locally)
- **Postman:** For testing API endpoints

---

## Project Success Metrics

- ✅ Calculations match Excel calibration (±0.5%)
- ✅ Quote generation < 1 second
- ✅ 1000+ quotations in database (no performance degradation)
- ✅ Offline functionality (works without internet)
- ✅ Desktop build < 100MB
- ✅ 100% test coverage on calculation engine
- ✅ All endpoints documented + tested

---

## Final Notes

**This is a sophisticated cost estimation system.** Every number flows through validated formulas. When something is wrong, it's usually:

1. **Input data** — Check the form values
2. **Rate tables** — Check the database
3. **Business logic** — Check the calculation code
4. **Display** — Check component prop passing

Start by understanding the **16-step pipeline** in `estimator.ts`. That's the heart.

Good luck! 🚀
