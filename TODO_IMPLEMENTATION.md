# New Estimate Page - Clean Rebuild

## What Was Done:

### 1. NewEstimate.tsx - Completely Rewritten
- Removed "Auto-Plan All" button completely
- Clean, simple 3-column layout:
  - Left: 15 step navigation tabs
  - Center: Step content with header
  - Right: Live preview panel
- Simple navigation: Previous/Next buttons
- Reset and Save Draft buttons
- Calculate button on final step
- Live book preview with spine visualization
- Validation errors shown inline
- All working automatically

### 2. estimationStore.ts - Cleaned
- Removed auto-planning imports
- Removed all auto-planning logic from update functions
- Simple, clean state management
- No more "planningMode", "recommendedPaperSizeLabel", etc.
- Fields update directly without triggering auto-planning

### 3. Wizard Steps - Cleaned
- StepTextSections.tsx - Removed auto-planning noise
- StepCover.tsx - Removed auto-planning noise  
- StepJacket.tsx - Removed auto-planning noise
- WizardStepRenderer.tsx - Clean export only
- All wizard steps now work with direct updates

### 4. Removed Files
- CustomPaperModal.tsx (deleted)
- AutoPlanningStatus.tsx (deleted)
- usePaperSource.ts (deleted)

## How It Works Now:

1. User enters trim size and pages in Book Spec
2. User selects paper, GSM, machine in Text Sections
3. User configures Cover with fold type (gatefold, wrap-around, etc.)
4. User configures Jacket and Endleaves if needed
5. User selects Binding type
6. All fields update directly - no auto-planning
7. User clicks "Create Estimate" on Step 15
8. System calculates based on entered values

## Tab Structure (15 Steps):
1. Basic Info - Job title, customer
2. Book Spec - Trim size, quantities  
3. Text Sections - Paper, GSM, machine
4. Cover - Paper, fold type
5. Jacket - Optional dust jacket
6. Endleaves - Optional endpapers
7. Binding - Method selection
8. Finishing - Lamination, UV, etc.
9. Packing - Cartons, pallets
10. Delivery - Destination, freight
11. Pre-Press - Proofs, origination
12. Pricing - Margin, currency
13. Additional - Extra costs
14. Notes - Special instructions
15. Review - Summary before calculation

