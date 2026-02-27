# Print Estimator Pro

Print Estimator Pro is a React + TypeScript + Tauri application for estimating book production costs across paper, printing, binding, finishing, packing, freight, and pricing.

## Features

- 15-step estimation wizard
- Multi-quantity estimation and comparison
- Detailed cost breakdown by section
- Binding and finishing calculations
- Freight and packing integration
- Quick calculator with strict validation and realistic pricing controls
- Local persistence for app state, estimation drafts, jobs, and quotations
- CSV export and print/PDF flow for estimation reports
- Dashboard, reports, inventory, and quotation flows
- Print-friendly reports
- Quote number generation and persisted quote/job history
- Advanced print modules: collation, hole punch, cutting/trimming, envelope, and large-format poster/banner options
- Role-gated rate management (admin edit mode)
- Quote email workflow (mail client integration)

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- State: Zustand + Immer
- Charts: Recharts
- Desktop shell: Tauri 2 (Rust backend)

## Project Structure

- `src/pages`: page-level routes
- `src/components`: reusable UI and wizard components
- `src/stores`: Zustand stores
- `src/utils/calculations`: core costing engine
- `src/utils/validation`: input validation helpers
- `src/constants`: rates, defaults, wizard metadata
- `src-tauri`: Tauri Rust app and config

## Prerequisites

- Node.js 20+
- npm 10+
- Rust toolchain (for Tauri desktop builds)

## Install

```bash
npm install
```

## Development

Web app:

```bash
npm run dev
```

Desktop app (Tauri):

```bash
npm run tauri dev
```

## Build

Web build:

```bash
npm run build
```

Desktop build:

```bash
npm run tauri build
```

## Validation and Calculation Notes

- Estimation input is validated before running calculations.
- Numeric fields are normalized to safe values before costing.
- Finishing lamination pricing is sheet-based for cover/jacket using calculated section sheet counts.
- Calculation failures are caught and surfaced via UI notifications.

## Accessibility

- Keyboard-operable controls for toggles and action buttons
- Focus-visible outlines for keyboard users
- ARIA live region messaging for calculation status and errors
- Form controls expose `aria-invalid` and linked error descriptions
- Results views announce tab/action updates for screen readers

## Testing

- Type check:

```bash
cmd /c .\node_modules\.bin\tsc.cmd --noEmit
```

- Lint:

```bash
npm run lint
```

- Format:

```bash
npm run format
```

- Unit tests are located under `tests/`.
- Coverage includes validation, quick pricing logic, and CSV export helpers.
- Benchmark:

```bash
npm run benchmark
```

## Known Limitations

- Some pages still use mocked data.
- Currency/legacy text encoding cleanup is partially pending in older files.
- Tauri packaging requires platform-specific native dependencies.
- Rate limiting is not applicable for local-only mode; add API gateway limits when moving to multi-tenant backend.

## Compatibility and Performance

- Browser support matrix: `docs/browser-compatibility.md`
- Benchmark suite: `benchmarks/estimator-benchmark.ts` (`npm run benchmark`)
- Backend rate-limiting blueprint: `docs/rate-limiting.md`

## Rate Management and Roles

- Rate card editing is restricted to `admin` role.
- Non-admin roles are view-only for pricing tables.

## Quote Delivery

- Quotation history is persisted locally.
- CSV export is available from Quotations.
- Email send flow opens default mail client with prefilled recipient/subject/body and marks quotation as sent.

## Print Product Modules

- Finishing step includes:
  - Collation modes (standard/booklet/sectional)
  - Hole punching (2/3/4 holes)
  - Cutting/trimming by side count
  - Envelope printing with size/color/qty/rate/setup
  - Large-format poster/banner/plotter inputs (dimensions, qty, rate/sqm)
