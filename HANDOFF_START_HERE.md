# HANDOFF DOCUMENTATION INDEX

Welcome! This project has been comprehensively documented for handoff to another AI system. Choose your starting point below:

---

## 📚 Documentation Files (Read in This Order)

### 1. **START HERE: Quick Reference** (`QUICK_REFERENCE.md`)
**Read First!** 10-minute overview of everything you need to know.

Contains:
- File location quick map
- Environment variables checklist
- Common tasks & how to do them
- Debugging checklist
- Key gotchas & warnings
- Project structure at a glance

**When to use:** First time opening the project, quick lookup, "how do I..." questions

---

### 2. **Project Handoff Document** (`PROJECT_HANDOFF.md`)
**The Complete Picture** — 95% comprehensive breakdown of the entire system.

Contains:
- Executive summary (what this app does)
- Complete project structure (all folders, all files explained)
- Database schema (SQLite tables + relationships)
- Authentication & authorization (JWT flow)
- State management (Zustand stores)
- Calculation engine overview (16-step pipeline at high level)
- 15 wizard steps explained
- All dependencies & versions
- How to run (dev, Docker, build)
- Environment variables
- Design system & styling
- Security measures
- Error handling & logging
- Architecture decisions (why Tauri, why Zustand, etc.)
- Current state & limitations
- Next priority items
- Handoff checklist

**When to use:** Deep dive into the system, understand all components, new feature planning, deployment prep

---

### 3. **Calculation Engine Technical Guide** (`CALCULATION_ENGINE_TECHNICAL.md`)
**The Math** — Complete formula breakdowns, step-by-step examples, calibration details.

Contains:
- Complete 16-step calculation pipeline explained
- Every formula with code + examples
- Paper physics & imposition algorithm
- Wastage calculation (critical ADDITIVE vs multiplicative note)
- CTP, printing, binding costs with rate lookup
- Finishing, packing, freight calculations
- Selling price formula (Excel V189 MAX logic)
- Currency conversion
- Complete worked example (3000 copy book with all steps shown)
- Precision & rounding rules
- Calibration targets

**When to use:** Understanding cost calculations, debugging price mismatches, adding new calculation logic, rate table changes

---

## 🎯 By Your Role / Task

### "I'm taking over development"
1. Read `QUICK_REFERENCE.md` (10 min)
2. Follow handoff checklist in `PROJECT_HANDOFF.md`
3. Run the app: `npm run dev:full`
4. Read `CALCULATION_ENGINE_TECHNICAL.md` for deep understanding
5. Explore the 5 main calc files: `estimator.ts`, `paper.ts`, `printing.ts`, `binding.ts`, `constants.ts`

### "I need to fix a cost calculation issue"
1. Check `QUICK_REFERENCE.md` "Debugging" section
2. Read the relevant step in `CALCULATION_ENGINE_TECHNICAL.md`
3. Enable debug traces in code (see debugging section)
4. Check against calibration targets (Thomson Press PDF rates)
5. Review the rate table
6. Edit the calculation file
7. Test with multiple quantities

### "I need to add a new feature"
1. Read feature category in `PROJECT_HANDOFF.md` (e.g., "Add a new wizard step")
2. Check `QUICK_REFERENCE.md` "Common Tasks" for pattern to follow
3. Understand which store(s) need updating (`estimationStore`, `dataStore`, etc.)
4. Create components, types, validation
5. Test end-to-end with calculation

### "I need to deploy to production"
1. Read "Deployment" section in `QUICK_REFERENCE.md`
2. Follow "Environment (Production)" checklist
3. Read Docker setup in `PROJECT_HANDOFF.md`
4. Review security measures section
5. Read rate-limiting configuration (adjust for production)
6. Set up proper JWT_SECRET (don't use dev default)
7. Configure backup strategy

### "I need to understand the business logic"
1. Read Executive Summary in `PROJECT_HANDOFF.md`
2. Read Features section in README.md
3. Understand user roles: admin (edit rates) vs user (view-only)
4. Read about quotation workflow
5. Understand currency & margin calculations

### "I need to add a new machine type"
1. `QUICK_REFERENCE.md` → "Add new machine to rate card"
2. Edit `src/constants/index.ts` → `DEFAULT_MACHINES`
3. Add rates in `IMPRESSION_RATES_DATA` if different
4. Test in wizard (appears in dropdowns automatically)
5. Test calculation with new machine

### "I need to add a new rate table"
1. `QUICK_REFERENCE.md` → "Rate Table Structure"
2. Identify category & lookup key
3. Add to backend API (`server/routes/rates.js`)
4. Add to Rate Card UI if admin-editable
5. Reference in calculation logic (`utils/calculations/*.ts`)

### "The app won't start / API not responding"
1. Check all environment variables (`.env` file exists?)
2. Check ports: `npm run dev` uses 1420 (frontend) + 4000 (backend)
3. Check Node version: requires 20+
4. Delete `node_modules`, run `npm install` again
5. Check SQLite DB file: `server/data/app.db` exists?
6. Check logs in terminal for actual error

---

## 🔍 By Technical Topic

### Database
- Structure: `PROJECT_HANDOFF.md` → "Database Schema"
- Migrations: `server/src/db.js` (runs on startup)
- View/edit: Use SQLite Browser or `sqlite3 server/data/app.db`

### Authentication
- JWT flow: `PROJECT_HANDOFF.md` → "Authentication & Authorization"
- Code: `server/routes/auth.js` + `server/middleware/auth.js`
- Token storage: browser localStorage `print-estimator-api-token`

### State Management
- Architecture: `PROJECT_HANDOFF.md` → "Frontend Data Flow"
- Stores: `src/stores/*.ts` (all use Zustand + localStorage)
- Persistence: Automatic, updates localStorage on change

### Routing
- Frontend: React Router in `App.tsx` (15 pages)
- Backend: Express in `server/src/index.js` (10 route files)
- Port mapping: Vite proxy 1420 → backend 4000

### Calculations
- Pipeline: `CALCULATION_ENGINE_TECHNICAL.md` (16 steps explained)
- Main file: `src/utils/calculations/estimator.ts`
- Sub-calculations: `paper.ts`, `printing.ts`, `binding.ts`, `finishing.ts`, etc.
- Rates: `src/constants/index.ts` (all Thomson Press data)

### UI/Components
- Layout: `MainLayout.tsx` (sidebar + header)
- Wizard: `src/components/wizard/` (15 step forms)
- Results: `EstimationResults.tsx` (cost breakdown table)
- Design: Tailwind CSS with custom tokens in `tailwind.config.js`

### Validation
- Input validation: `src/utils/validation/estimation.ts`
- Type validation: Zod schemas in routes
- Pre-calculation: `src/utils/calculations/validate.ts`

### Testing
- Commands: `QUICK_REFERENCE.md` → "Testing Commands"
- Test files: `tests/*.test.ts`
- Benchmark: `benchmarks/estimator-benchmark.ts`

### API Client
- Fetch wrapper: `src/api/client.ts` (handles auth, errors)
- Types: `src/api/types.ts` (API request/response shapes)
- Usage: `useQuery`/`useMutation` from React Query

---

## 📋 Information Architecture

```
Documentation Hierarchy:

QUICK_REFERENCE.md (10 min read, lookup reference)
│
├─→ PROJECT_HANDOFF.md (90 min read, complete system map)
│   │
│   ├─→ CALCULATION_ENGINE_TECHNICAL.md (120 min read, math deep-dive)
│   │   │
│   │   └─→ estimator.ts + supporting calc files (code review)
│   │
│   └─→ All source files (code exploration)
│
└─→ README.md (5 min read, project overview)
```

---

## 🚀 Quickstart Sequence

**Total Time: ~30 minutes to get app running**

### Step 1: Setup (5 min)
```bash
git clone <repo>
cd print-estimator
npm install
cp .env.example .env  # Create env file
```

### Step 2: Start (5 min)
```bash
# Terminal 1
npm run dev

# Terminal 2 (after seeing "vite v7.x.x ready")
npm run api:dev
```

### Step 3: Test (10 min)
- Open http://localhost:1420
- Create test account
- Create test quotation (follow wizard)
- Click "Calculate" on final step
- See results

### Step 4: Explore (10 min)
- Dashboard: Overview of jobs/quotations
- RateCard: See all rates (admin-only features gated)
- Quotations: Export to CSV
- Check browser console for telemetry logs
- Check Chrome DevTools for React state

### Step 5: Read (async)
- Start with `QUICK_REFERENCE.md`
- Deep dive with `PROJECT_HANDOFF.md`
- Math deep-dive with `CALCULATION_ENGINE_TECHNICAL.md`

---

## 🎓 Learning Paths by Experience

### If you're new to web development:
1. Start with README.md (5 min)
2. Read `QUICK_REFERENCE.md` (10 min)
3. Run the app and explore UI (15 min)
4. Read "Frontend Data Flow" in `PROJECT_HANDOFF.md` (20 min)
5. Look at one page component (e.g., `Dashboard.tsx`)
6. Look at one store (e.g., `appStore.ts`)

### If you're experienced in React/TypeScript:
1. Skim `QUICK_REFERENCE.md` (5 min)
2. Open `src/pages/NewEstimate.tsx`, understand structure (15 min)
3. Trace through `estimationStore.ts` (10 min)
4. Read `CALCULATION_ENGINE_TECHNICAL.md` sections 1-8 (30 min)
5. Review `estimator.ts` in detail (30 min)

### If you're a backend/database person:
1. Read database schema in `PROJECT_HANDOFF.md` (10 min)
2. Review `server/src/db.js` (10 min)
3. Review `server/src/routes/*.js` (20 min)
4. Read auth flow in `PROJECT_HANDOFF.md` (15 min)
5. Review `CALCULATION_ENGINE_TECHNICAL.md` sections 1-3 (20 min)

### If you're a business analyst:
1. Read README.md (5 min)
2. Read Executive Summary in `PROJECT_HANDOFF.md` (10 min)
3. Read "15 Wizard Steps" in `PROJECT_HANDOFF.md` (10 min)
4. Read business logic sections in `CALCULATION_ENGINE_TECHNICAL.md` (30 min)
5. Run app, create a quotation, export CSV (15 min)

---

## 🆘 Common Questions

**Q: Where's the startup code?**  
A: Frontend: `src/main.tsx`. Desktop: `src-tauri/src/main.rs`. Backend: `server/src/index.js`.

**Q: How do rates get updated?**  
A: Admin logs in → /rate-card page → Edit tables → Saves to SQLite → Next quote uses new rates.

**Q: Can users do X?**  
A: Check role in `appStore.ts` — "admin" vs "user". Backend enforces with `requireRole()` middleware.

**Q: Why is calculation so complex?**  
A: Every formula is calibrated to actual Thomson Press (India) data. It's reverse-engineered from their PDF manual.

**Q: Where are the rates?**  
A: `src/constants/index.ts` (hardcoded defaults) and SQLite `rates` table (runtime updates).

**Q: Can I add a new currency?**  
A: Yes! Add to `DEFAULT_CURRENCIES` in `constants/index.ts` and `CURRENCY_RATES` in `appStore.ts`.

**Q: How do I test ?**  
A: `npm test` for unit tests, `npm run benchmark` for calculation performance.

**Q: Why localStorage?**  
A: Local-first design — app works offline. Backend stores data for sharing/audit trail.

**Q: What's the bottleneck?**  
A: Large datasets (10k+ quotes) in Quotations page. Use react-virtual/react-table for pagination.

---

## 📝 Notes for the Next Developer

This codebase is:
- ✅ **Complete** — All features work end-to-end
- ✅ **Well-structured** — Clear separation of concerns
- ✅ **Type-safe** — TypeScript strict mode
- ✅ **Tested** — Unit tests for calculations
- ✅ **Documented** — You're reading it!

To succeed:
1. **Understand the 16-step calculation** — It's the core
2. **Respect the rate tables** — They're calibrated to real data
3. **Use the debug trace** — When debugging costs
4. **Check the todo list** — Priority items for next sprints
5. **Test your changes** — Run the app, create a quotation
6. **Update documentation** — If you add major features

Good luck! This is a sophisticated system, but well-organized. Read the main handoff doc first, then dive into the code.

---

## 📞 Quick Links

- **Main Handoff:** [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md)
- **Calculation Guide:** [CALCULATION_ENGINE_TECHNICAL.md](CALCULATION_ENGINE_TECHNICAL.md)
- **Quick Reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **README:** [README.md](README.md)
- **Todos:** [TODO_IMPLEMENTATION.md](TODO_IMPLEMENTATION.md)

---

**Last Updated:** March 7, 2026  
**Version:** 2.0.0  
**Status:** Ready for Handoff ✅
