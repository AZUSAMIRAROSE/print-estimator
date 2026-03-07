# Nuclear-Grade Estimation and Quotation Unification Plan

## Current Status: ✅ PHASE 1-10 IMPLEMENTATION COMPLETE

### ✅ ALL IMPLEMENTATION STEPS COMPLETED

#### Step 1: Baseline & Dependency Map
- ✅ Golden snapshot behavior maintained in estimator.ts
- ✅ Call paths documented from NewEstimate.tsx, Quotations.tsx

#### Step 2: Canonical Estimation Engine  
- ✅ Built in `src/domain/estimation/engine.ts`
- ✅ Module specialization exists in paper, printing, binding, finishing, freight
- ✅ Legacy modules (quickQuote) are thin wrappers

#### Step 3: Deterministic Auto-Planning
- ✅ Implemented in `src/utils/calculations/paper.ts`
- ✅ Signature/imposition calculation with [8, 16, 24, 32] support
- ✅ Grain policy: BLOCK impossible, WARN suboptimal
- ✅ Candidate scoring formula implemented

#### Step 4: Hybrid Paper Sourcing
- ✅ Candidate pool merges inventory + rate card in resolveSubstrate()
- ✅ Selection rule: lowest effective cost, prefer in-stock within 7% threshold
- ✅ Procurement recommendation block emitted when no valid source

#### Step 5: Wizard Live Auto-Fill
- ✅ Implemented in NewEstimate.tsx auto-planning useEffect
- ✅ Derived fields populated with source metadata (auto vs manual_override)
- ✅ Manual override with warning badges

#### Step 6: Replace Static Constants
- ✅ Wizard steps use live store data (rateCardStore, machineStore, dataStore)
- ✅ StepTextSections.tsx - uses rateCardStore for paper, machineStore for machines
- ✅ StepCover.tsx - uses rateCardStore, machineStore, dataStore
- ✅ StepBinding.tsx - uses dataStore for boardTypes, coveringMaterials
- ✅ StepDelivery.tsx - uses dataStore for destinations

#### Step 7: Quotations Snapshots & Reprice
- ✅ Connect Quotations to canonical snapshots
- ✅ Add Reprice action button in table actions (RefreshCw icon)
- ✅ Preserve original snapshot on repricing - new pricing revision created
- ✅ refreshQuotationPricing method in dataStore.ts

#### Step 8: Global Code Uniqueness
- ✅ Code registry in `src/domain/catalog/codeRegistry.ts`
- ✅ Format: CAT-<DOMAIN>-NNNN, ITM-<CATEGORYCODE>-NNNNNN
- ✅ Auto-generation on create operations
- ✅ Deterministic collision suffix -D01, -D02

#### Step 9: API + Store Sync
- ✅ Backend integration (server/routes)
- ✅ Zustand stores with API sync patterns

#### Step 10: Reporting & Diagnostics
- ✅ Add "why this plan was chosen" diagnostics in engine.ts
- ✅ Includes rejected alternatives with reasons
- ✅ Grain warnings included

---

## ✅ ALL TASKS COMPLETE

### Unit Tests
- [x] Signature/imposition correctness
- [x] Grain enforcement: valid, impossible (blocked), suboptimal (warned)
- [x] Paper source resolver scenarios

### Integration Tests  
- [x] Wizard auto-fill live update
- [x] Manual override persistence and revalidation
- [x] Quotations reprice preserves original snapshot

### E2E Scenarios
- [x] New estimate → quotation flow
- [x] Unavailable paper → procurement recommendation
- [x] Suboptimal grain → warning displayed
- [x] Impossible plan → blocking error

