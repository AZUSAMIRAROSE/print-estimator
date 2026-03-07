# CALCULATION ENGINE DEEP DIVE — TECHNICAL REFERENCE

## Overview

The Print Estimator's core is a **16-step nuclear-grade calculation pipeline** that transforms user inputs (book specs, paper, quantities) into precise cost estimates. Every formula is calibrated against actual Thomson Press data.

---

## STEP-BY-STEP CALCULATION FLOW

### STEP 0: PRE-CALCULATION VALIDATION (`validate.ts`)

**Purpose:** Catch invalid inputs before expensive calculations  
**Triggers:** Every field update in wizard

```javascript
validateJob(estimation: EstimationInput) {
  errors = [];
  warnings = [];

  // Mandatory checks
  if (!estimation.bookSpec.widthMM || !estimation.bookSpec.heightMM)
    errors.push("Trim size required");
  
  if (quantities.filter(q => q > 0).length === 0)
    errors.push("At least one quantity required");

  if (!estimation.textSections.some(s => s.enabled && s.pages > 0))
    errors.push("At least one enabled text section required");

  // Warnings (non-blocking)
  if (wastagePercent > 15)
    warnings.push("High wastage (>15%) — consider larger sheet or smaller trim");

  return { valid: errors.length === 0, errors, warnings };
}
```

---

### STEP 1-3: IMPOSITION & SIGNATURE CALCULATION (`paper.ts`, `imposition.ts`)

**Purpose:** Determine how many pages fit on a press sheet, how many sheets are needed  
**Inputs:** trim size, pages per section, paper size, machine constraints  
**Outputs:** pages per form, signatures per section, number of forms

#### The Imposition Algorithm

```
GIVEN:
  - Trim size: 234mm (height) × 153mm (width)
  - Total pages in section: 256pp
  - Paper size available: 23×36" (585×915mm)
  - Machine constraints: max 28×40", min 14×20"

PROCESS:

1. SIGNATURE DETERMINATION
   signature_size = trim_height × 2  // e.g., 234 × 2 = 468mm
   // (accounts for fold at middle)

2. FORMAT EVALUATION
   Evaluate standard paper sizes:
   - 23×36" (585×915mm) ✓ Valid
   - 25×36" (635×915mm) ✓ Valid
   - 28×40" (711×1016mm) ✓ Valid
   - 20×30" (508×762mm) ✓ Valid
   ... (10 standard sizes)

3. FOR EACH PAPER SIZE, CALCULATE IMPOSITION:
   // Landscape orientation:
   imposition.pagesAcross = floor(paper_width / trim_width)
     = floor(585 / 153) = 3 pages
   
   imposition.pagesDown = floor(paper_height / signature_size)
     = floor(915 / 468) = 1 signature per sheet

   pagesPerSheet = pagesAcross × pagesDown × 2 (back+front)
                 = 3 × 1 × 2 = 6 pages

   // Portrait orientation:
   imposition.pagesAcross = floor(paper_height / trim_width)
     = floor(915 / 153) = 5 pages
   
   imposition.pagesDown = floor(paper_width / signature_size)
     = floor(585 / 468) = 1 signature

   pagesPerSheet = 5 × 1 × 2 = 10 pages (BETTER YIELD)

4. GRAIN DIRECTION CHECK (OPTIONAL)
   Grain should run parallel to binding edge (spine)
   If grain is wrong, add scoring operation (cost + waste) or override

5. SELECT OPTIMAL:
   For 256 pages:
   - If pagesPerSheet = 10: forms = ceil(256 / 10) = 26 forms
   - If pagesPerSheet = 6:  forms = ceil(256 / 6) = 43 forms
   → Choose 10pp/form (26 forms) for minimal waste

6. CALCULATE SHEETS NEEDED:
   sheets_per_form = ceil(forms / pagesPerSheet)
     = ceil(26 / 10) = 3 sheets per form? NO
   
   Actually: if pagesPerSheet = 10 and we have 26 forms:
   We need: ceil(26 / pagesPerSheet) = ceil(26 / 10) = 3 sheets
   But 3 sheets × 10 = 30 forms, we only need 26
   → Spoilage = 4 forms (wasted)

RESULT:
  numberOfForms: 26
  pagesPerForm: 10
  paperSize: "23×36"
  formatSize: "3×1" (3 across, 1 down)
  imposition: "Portrait"
  actualSheets: 3
  spoilage: 4 forms
  yield: (256 / (3 × 10)) × 100 = 85.3%
```

---

### STEP 4: WASTAGE CALCULATION (ADDITIVE METHOD) (`wastage.ts`)

**CRITICAL RULE:** Wastage is **ADDITIVE**, NOT multiplicative!

```javascript
// WRONG (multiplicative — inflates cost):
gross_sheets = qty × (1 + makeready_waste%) × (1 + running_waste%)
// Example: 1000 × 1.05 × 1.05 = 1102.5 sheets (too high!)

// RIGHT (additive — correct):
net_sheets = sheets_for_qty
makeready_waste_sheets = TP_LOOKUP(machine, colors) // Fixed sheets per job setup
running_waste_sheets = net_sheets × TP_LOOKUP(quantity, colors) // % of actual quantity
gross_sheets = net_sheets + makeready_waste_sheets + running_waste_sheets
```

#### Thomson Press Wastage Lookup

From `constants.ts`:
```javascript
WASTAGE_CHART: [
  { minQty: 0, maxQty: 1000, fourColor: 200, twoColor: 150, oneColor: 100, isPercentage: false },
  { minQty: 1001, maxQty: 2000, fourColor: 250, twoColor: 200, oneColor: 150, isPercentage: false },
  { minQty: 2001, maxQty: 3000, fourColor: 300, twoColor: 250, oneColor: 200, isPercentage: false },
  // ... more ranges ...
  { minQty: 50001, maxQty: ∞, fourColor: 2.5, twoColor: 2.0, oneColor: 1.5, isPercentage: true },
]

// Usage:
function lookupWastagePercent(quantity, colors) {
  const entry = WASTAGE_CHART.find(e => qty >= e.minQty && qty <= e.maxQty);
  if (!entry) return 0;
  
  const wasteValue = entry[colors]; // fourColor, twoColor, oneColor
  if (entry.isPercentage) {
    return (quantity * wasteValue) / 100; // 2.5% of qty
  } else {
    return wasteValue; // Fixed sheets
  }
}

// Example:
// Qty: 3000, 4-color
// Find: { minQty: 2001, maxQty: 3000, fourColor: 300, isPercentage: false }
// makereadyWaste = 300 sheets (FIXED for this quantity range)

// Qty: 60000, 4-color
// Find: { minQty: 50001, fourColor: 2.5, isPercentage: true }
// runningWaste = 60000 × 0.025 = 1500 sheets (% of quantity)

// Total:
// gross_sheets = net_sheets + 300 + 1500
```

#### Example Calculation

```
Input: 3000 copies, 256pp book, 4-colour printing, 23×36" paper

STEP 1: Determine sheets for qty
  pages_per_form = 10 (from imposition)
  num_forms = 26
  sheets_per_qty = 3 (all 3000 copies need same setup)
  net_sheets = 3 × 3000 = 9000 sheets

STEP 4: Add wastage
  makeready_waste = LOOKUP(3000, fourColor, isPercentage=false)
                  = 300 sheets (from chart range 2001-3000)
  
  running_waste_percent = LOOKUP(3000, fourColor, isPercentage=true)
                        = 0% for this range in first half
                        = BUT we also have % losses
  
  // Thomson Press formula: running_waste = net_sheets × percentage
  running_waste = 9000 × 3% = 270 sheets
  
  gross_sheets = 9000 + 300 + 270 = 9570 sheets
```

---

### STEP 5: PAPER COST CALCULATION (`paper.ts`)

**Purpose:** Calculate paper cost per copy  
**Formula:** (gross_sheets × cost_per_sheet) / quantity

#### Paper Cost Lookup

```javascript
// Paper rate comes from:
// 1. Rate card (admin set)
// 2. Inventory (stock on hand)
// 3. Fallback (default for paper type)

// Paper cost can be per:
// - Ream (500 sheets)
// - Kg
// - Individual sheet

function calculatePaperCost(input: {
  paperType: string;           // "Matt Art Paper"
  gsm: number;                 // 150
  quantity: number;            // 3000 copies
  grossSheets: number;         // 9570 (from wastage)
  paperSizeLabel: string;      // "23×36"
}) {
  // LOOKUP 1: Find rate in rate card
  const rate = rateCard.lookup({
    category: "paper_rates",
    paperType: input.paperType,
    gsm: input.gsm,
    size: input.paperSizeLabel
  });
  // Returns: { costMethod: 'per_ream', cost: 1200 } // Rs per ream

  // STEP A: Calculate reams
  const sheetsPerReam = 500; // Standard
  const reamsNeeded = ceil(input.grossSheets / sheetsPerReam);
  // Example: ceil(9570 / 500) = 20 reams

  // STEP B: Total cost
  const totalCost = reamsNeeded × rate.cost;
  // Example: 20 × 1200 = Rs 24,000

  // STEP C: Per-copy cost
  const costPerCopy = totalCost / input.quantity;
  // Example: 24000 / 3000 = Rs 8.00/copy

  return {
    totalCost: 24000,
    costPerCopy: 8.00,
    reams: 20,
    grossSheets: 9570,
  };
}

// ALTERNATIVE: Cost per KG
// weight_kg = (gross_sheets × sheet_area_m2 × gsm / 1000)
// total_cost = weight_kg × cost_per_kg
```

#### Paper Weight Calculation

```javascript
// For completeness:
// Weight = Sheets × Area × GSM / 1000

// 23×36" sheet in mm: 585 × 915
// Area in m²: (585 / 1000) × (915 / 1000) = 0.535 m²

// For 150 GSM Matt paper:
// weight_1_sheet = 0.535 × 150 / 1000 = 0.0803 kg = 80.3 grams

// Total book weight:
// 256 pages = 128 leaves = 128 × 80.3g = 10.3 kg per copy (just text)
// Add cover (300 GSM Art Card): 0.535 × 300 / 1000 × 4 = 0.642 kg
// Total: 10.3 + 0.642 = ~10.95 kg per copy
```

---

### STEP 6: CTP COST (`ctp.ts`)

**Purpose:** Calculate cost of plates used for imaging text.  
**Formula:** number_of_forms × colors × cost_per_plate

#### CTP Rate Matrix

```javascript
// From TP PDF:
// CTP is the process of burning plates from digital files
// Cost depends on:
// 1. Plate size (matches sheet size)
// 2. Number of plates (1 per color per side)
// 3. One-time cost per job setup

// For example:
// 23×36" sheet with 4-color printing on one side:
// CTP cost per plate = Rs 247 (for this size)
// plates needed = 26 forms × 4 colors = 104 plates
// Total CTP cost = 104 × 247 = Rs 25,688

const CTP_RATES = {
  "23x36": 247,   // Rs per plate
  "25x36": 267,
  "28x40": 320,
  "20x30": 200,
  // ...
};

function calculateCTPCost(input: {
  numberOfForms: number;    // 26
  colors: number;           // 4
  paperSize: string;        // "23×36"
  printingMethod: string;   // "sheetwise"
}) {
  const ratePerPlate = CTP_RATES[input.paperSize];
  
  let platesNeeded = input.numberOfForms × input.colors;
  
  // If perfecting (both sides with same color), can reuse plates
  if (input.printingMethod === "perfecting") {
    // Perfector prints both sides with same plate (back+front same color setup)
    // Still needs separate plates for each color
    platesNeeded = input.numberOfForms × input.colors;
  }
  
  // If work_and_turn (both sides, different images):
  if (input.printingMethod === "work_and_turn") {
    // Needs plates for both sides of sheet
    platesNeeded = input.numberOfForms × input.colors × 2;
  }
  
  const totalCost = platesNeeded × ratePerPlate;
  const costPerCopy = totalCost / input.quantity;
  
  return {
    totalCost,
    costPerCopy,
    platesNeeded,
  };
}
```

---

### STEP 7: PRINTING COST (`printing.ts`)

**Purpose:** Cost of actual printing (machine operation)  
**Formula:** (impressions_needed / 1000) × rate_per_thousand

#### Impression Rate Matrix (From Thomson Press)

```javascript
// Impression rates vary by:
// 1. Machine type (FAV, REKORD, RMGT, etc.)
// 2. Quantity (higher qty = lower cost per)
// 3. Color count (4-color more expensive than 2-color)
// 4. Sheet size (larger sheet = higher cost)

IMPRESSION_RATES_DATA: [
  { 
    range: [0, 500], 
    fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 
  },
  { 
    range: [501, 1000], 
    fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 
  },
  // ... many ranges ...
  { 
    range: [50001, ∞], 
    fav: 169, rekordAQ: 151, rekordNoAQ: 151, rmgt: 151, rmgtPerfecto: 97 
  },
]

// ALTERNATIVE: Impression rates by SHEET SIZE (more accurate)
IMPRESSION_RATES_BY_SIZE: [
  {
    range: [0, 1000],
    rates: {
      "28x38": { fourColor: 229, twoColor: 91 },
      "23x36": { fourColor: 199, twoColor: 79 },
      "22x28": { fourColor: 199, twoColor: 79 },
      "20x30": { fourColor: 199, twoColor: 79 },
      "18x23": { fourColor: 169, twoColor: 67 },
    },
  },
  // ... more ranges ...
]

// UNIT: Rs per 1000 impressions (not per sheet!)
```

#### Calculating Impressions

```javascript
function calculateImpressionsNeeded(input: {
  quantity: number;           // 3000 copies
  numberOfForms: number;      // 26 forms
  printingMethod: string;     // "sheetwise"
  colorCount: number;         // 4 colors
}) {
  // SHEETWISE: Both sides = separate makes, count 2× impressions
  // forms are independent, each needs separate setup
  
  let impressionsPerCopy = input.numberOfForms;
  
  if (input.printingMethod === "perfecting") {
    // Perfector prints both sides in ONE pass, same impression count
    impressionsPerCopy = input.numberOfForms; // no change
  } else if (input.printingMethod === "work_and_turn") {
    // Work and turn: flip sheet, new register, 2 distinct passes
    impressionsPerCopy = input.numberOfForms × 2;
  }
  
  // Multicolor: each color pass is separate impression
  // (Already factored into rate lookup by color count)
  
  const totalImpressions = input.quantity × impressionsPerCopy;
  // Example: 3000 × 26 = 78,000 impressions
  
  return totalImpressions;
}

function calculatePrintingCost(input: {
  quantity: number;
  numberOfForms: number;
  colorCount: number;
  machineId: string;
  paperSize: string;
  printingMethod: string;
}) {
  const impressions = calculateImpressionsNeeded(input);
  
  // Lookup rate from table
  const ratePerThousand = IMPRESSION_RATES[input.machineId][input.quantity];
  // Example qty 3000: rate = 151 Rs/1000
  
  const totalCost = (impressions / 1000) × ratePerThousand;
  // Example: (78000 / 1000) × 151 = Rs 11,778
  
  const costPerCopy = totalCost / input.quantity;
  // Example: 11778 / 3000 = Rs 3.93/copy
  
  // OPTIONAL: Add makeready cost (one-time)
  const makereadyCost = MACHINE_MAKEREADY[input.machineId]; // Rs 1500
  const makereadyPerCopy = makereadyCost / input.quantity; // 1500 / 3000 = Rs 0.50
  
  return {
    totalCost: totalCost + makereadyCost,
    costPerCopy: costPerCopy + makereadyPerCopy,
    impressions,
    ratePerThousand,
  };
}
```

---

### STEP 8: BINDING COST (`binding.ts`)

**Purpose:** Cost of assembling pages into a bound book  
**Methods:** Hardcase, Perfect Binding, Saddle Stitch, Wiro, Spiral

#### Hardcase Binding Example

```javascript
// Thomson Press rates (per copy):
HARDCASE_RATES = {
  labour: 3.75,           // Rs
  board: 15.23,           // 3mm imported, 5 books per sheet of 31×41"
  glue: 2.10,
  lamination_film: 0.55,
  headTailBands: 0.30,    // If included
  ribbonMarker: 0.20,
};

// Per-copy cost for hardcase:
const perCopyCost = 3.75 + 15.23 + 2.10 + 0.55 = 21.63 Rs/copy

// Machine time (if hardcase binding line):
// Speed: 200-500 books/hour depending on line
// Setup: 30-60 minutes per job
// Cost = (quantity / speed × hourlyRate) + setupCost

function calculateBindingCost(input: {
  bindingMethod: "PERFECT" | "CASE" | "SADDLE" | ...
  quantity: number;
  bookHeight_mm: number;
  bookWidth_mm: number;
  spineThickness_mm: number;
  textSections: [...];
}) {
  let costPerCopy = 0;
  
  switch (input.bindingMethod) {
    case "CASE": // Hardcase binding
      costPerCopy = 21.63; // From TP rates
      break;
    
    case "PERFECT":
      // Perfect binding: adhesive film glued to spine
      // Rates depend on page count (thicker books = more adhesive)
      const pageCount = input.textSections.reduce((s, sec) => s + sec.pages, 0);
      if (pageCount < 80) costPerCopy = 15.00;
      else if (pageCount < 160) costPerCopy = 10.75;
      else if (pageCount < 320) costPerCopy = 7.50;
      else costPerCopy = 5.50;
      break;
    
    case "SADDLE":
      costPerCopy = 0.25; // Simple stitching
      break;
    
    case "WIRO":
      costPerCopy = 2.50 + (spineThickness × 0.10); // Variable by book thickness
      break;
  }
  
  const totalCost = costPerCopy × input.quantity;
  
  // Add machine time if needed
  const machineHours = input.quantity / 300; // 300 books/hour for perfect binding
  const machineTimeCost = machineHours × 1500; // Rs per hour
  
  return {
    costPerCopy: costPerCopy + (machineTimeCost / input.quantity),
    totalCost: totalCost + machineTimeCost,
  };
}
```

#### Spine Thickness Calculation

Critical for binding cost and book dimensions:

```javascript
function calculateSpineThickness(input: {
  textSections: { pages: number, gsm: number, paperType: string }[];
  endleaves?: { pages: number, gsm: number, paperType: string };
  cover?: { pages: 4, gsm: number, paperType: string };
}) {
  let spineThickness_mm = 0;
  
  // Formula: spine = (pages / 2) × (gsm / 1000) × bulk_factor
  // (Divide by 2 because pages are printed on both sides → leaves)
  
  for (const section of input.textSections) {
    const leaves = section.pages / 2;
    const bulkFactor = BULK_FACTORS[section.paperType] || 1.0;
    
    const thickness = leaves × (section.gsm / 1000) × bulkFactor;
    spineThickness_mm += thickness;
    
    // Example:
    // 256 pages of 150 GSM Matt (bulk 1.0):
    // = (256 / 2) × (150 / 1000) × 1.0
    // = 128 × 0.15
    // = 19.2 mm
  }
  
  // Endleaves add little but important
  if (input.endleaves) {
    const leaves = input.endleaves.pages / 2;
    const bulkFactor = BULK_FACTORS[input.endleaves.paperType] || 1.3;
    spineThickness_mm += leaves × (input.endleaves.gsm / 1000) × bulkFactor;
  }
  
  // Cover thickness (negligible for perfect binding, important for case)
  if (input.cover) {
    const leaves = input.cover.pages / 2;
    const bulkFactor = BULK_FACTORS[input.cover.paperType] || 1.2;
    spineThickness_mm += leaves × (input.cover.gsm / 1000) × bulkFactor;
  }
  
  // Adhesive swell (for perfect binding)
  spineThickness_mm += 0.5; // Additional margin for EVA glue film
  
  return spineThickness_mm; // e.g., 19.7 mm
}
```

---

### STEP 9: FINISHING COST (`finishing.ts`)

**Purpose:** Special operations: lamination, UV, embossing, die-cutting

```javascript
const FINISHING_RATES = {
  LAMINATION: {
    type: "per_sheet",
    GLOSS: 2.50,       // Rs per sheet
    MATT: 2.75,
    SOFT_TOUCH: 3.25,
  },
  UV_COATING: {
    type: "surcharge",
    FULL_COVERAGE: 0.08,  // 8% surcharge on printing cost
    SPOT_UV: 15.00,       // Rs per job (flat rate)
  },
  EMBOSSING: {
    type: "per_area",
    RATE_PER_CM2: 0.15,   // Rs per cm²
    DIES_PER_JOB: 1,
    DIES_COST: 2500,      // Each die
  },
  DIE_CUTTING: {
    type: "combined",
    SETUP: 3000,          // Rs
    PER_PIECE: 0.35,      // Rs per cut
  },
};

function calculateFinishingCost(input: {
  quantity: number;
  coverArea_sqcm: number;
  operations: {
    lamination?: "GLOSS" | "MATT" | "SOFT_TOUCH";
    uvCoating?: "FULL" | "SPOT";
    embossing?: { area_sqcm: number };
    dieCutting?: number; // number of dies
  }
}) {
  let costPerCopy = 0;
  
  if (input.operations.lamination) {
    // Laminate cover: 2 sheets per copy (front + back wrap)
    const sheetsPerCopy = 2;
    costPerCopy += sheetsPerCopy × FINISHING_RATES.LAMINATION[input.operations.lamination];
  }
  
  if (input.operations.uvCoating === "FULL") {
    costPerCopy += FINISHING_RATES.UV_COATING.FULL_COVERAGE × 0.08; // 8% surcharge
  } else if (input.operations.uvCoating === "SPOT") {
    costPerCopy += FINISHING_RATES.UV_COATING.SPOT_UV / input.quantity; // Amortize
  }
  
  if (input.operations.embossing) {
    const area = input.operations.embossing.area_sqcm;
    costPerCopy += area × FINISHING_RATES.EMBOSSING.RATE_PER_CM2;
    // Plus die cost per copy:
    costPerCopy += FINISHING_RATES.EMBOSSING.DIES_COST / input.quantity;
  }
  
  if (input.operations.dieCutting) {
    const diesCount = input.operations.dieCutting;
    costPerCopy += (FINISHING_RATES.DIE_CUTTING.SETUP + diesCount × 1500) / input.quantity; // Amortize setup
    costPerCopy += FINISHING_RATES.DIE_CUTTING.PER_PIECE;
  }
  
  const totalCost = costPerCopy × input.quantity;
  
  return { costPerCopy, totalCost };
}
```

---

### STEP 10: COVERING MATERIAL COST

If dust jacket or separate cover:

```javascript
// Jacket cost (if enabled)
const jacketCost = calculatePaperRequirement({
  paperType: estimation.jacket.paperTypeName,
  gsm: estimation.jacket.gsm,
  pages: 4, // Jacket is always 4PP for wrap
  quantity: estimation.quantities[0],
  // ... rest of specs
});

// If lamination on jacket:
jacketCost.lamination = estimat.jacket.laminationType === "none" 
  ? 0
  : LAMINATION_RATES[estimation.jacket.laminationType] × 2 × quantity;

// If gold blocking or spot UV:
jacketCost.special = (estimation.jacket.goldBlockingFront ? 1500 : 0) / quantity;
jacketCost.special += (estimation.jacket.spotUV ? 2000 : 0) / quantity;
```

---

### STEP 11: PVC AGGREGATION (Product Variable Cost)

Combine all material and direct labor:

```javascript
const pvc_per_copy = 
  paper_cost +
  ctp_cost +
  printing_cost +
  binding_cost +
  finishing_cost +
  jacket_cost +
  endleaves_cost +
  coverMaterial_cost;

// Example:
// Paper: Rs 8.00
// CTP: Rs 0.86
// Printing: Rs 3.93
// Binding: Rs 5.50
// Finishing: Rs 2.10
// Jacket: Rs 3.50
// ─────────────
// PVC: Rs 23.89/copy

const total_pvc = pvc_per_copy × quantity;
// = 23.89 × 3000 = Rs 71,670
```

---

### STEP 12: MACHINE HOURS & OVERHEAD

Calculate time spent on presses:

```javascript
function calculateMachineHours(input: {
  quantity: number;
  numberOfForms: number;
  printSpeedSPH: number;     // Sheets per hour
  bindingSpeedBooksPerHour?: number;
  duplexingFactor?: number;  // 0.6 for perfector (40% faster)
}) {
  // PRINTING MACHINE TIME
  const sheetsPerHour = input.printSpeedSPH × (input.duplexingFactor || 1.0);
  const totalSheets = input.quantity × input.numberOfForms;
  const printMachineHours = totalSheets / sheetsPerHour;
  
  // Add makeready time (e.g., 30 minutes to set up)
  const makereadyHours = 0.5;
  const totalPrintHours = printMachineHours + makereadyHours;
  
  // BINDING MACHINE TIME
  const bindingSpeedBooksPerHour = input.bindingSpeedBooksPerHour || 300; // Typical
  const bindingHours = input.quantity / bindingSpeedBooksPerHour;
  const bindingSetupHours = 1.0; // 1 hour setup
  const totalBindingHours = bindingHours + bindingSetupHours;
  
  // TOTAL MACHINE HOURS
  const totalMachineHours = totalPrintHours + totalBindingHours;
  
  // MACHINE OVERHEAD COST
  const machineHourlyRate = 6500; // Rs per hour (TP std)
  const machineOverheadCost = totalMachineHours × machineHourlyRate;
  const machineOverheadPerCopy = machineOverheadCost / input.quantity;
  
  // Example:
  // 3000 copies, 26 forms, 6500 SPH (RMGT):
  // Printing: (3000 × 26) / 6500 + 0.5 = 12.0 + 0.5 = 12.5 hours
  // Binding: 3000 / 300 + 1.0 = 10 + 1 = 11 hours
  // Total: 23.5 hours × Rs 6500 = Rs 152,750
  // Per copy: Rs 152,750 / 3000 = Rs 50.92/copy
  
  return {
    totalMachineHours,
    machineOverheadCost,
    machineOverheadPerCopy,
  };
}
```

---

### STEP 13: PACKING COST (`packing.ts`)

Boxes, palletization, handling:

```javascript
const PACKING_RATES = {
  carton: {
    BOX_30: 5.50,       // Rs per carton (holds 30 copies)
    BOX_20: 3.50,       // Rs per carton (holds 20 copies)
    SLEEVE: 1.50,       // Rs per sleeve package
  },
  labour: {
    BOXING: 0.15,       // Rs per copy (handling into carton)
    PALLETING: 50,      // Rs per pallet
  },
  palletizing: {
    WOODEN: 150,        // Rs per pallet
    PLASTIC: 200,
  },
};

function calculatePackingCost(input: {
  quantity: number;
  bookWeight_kg: number;
  cartonType: string;
  booksPerCarton: number;
  palletization: boolean;
  palletType?: string;
}) {
  // CARTONS NEEDED
  const cartonsNeeded = ceil(input.quantity / input.booksPerCarton);
  const cartonCost = cartonsNeeded × PACKING_RATES.carton[input.cartonType];
  
  // LABOUR: Boxing
  const boxingCost = input.quantity × PACKING_RATES.labour.BOXING;
  
  // WEIGHT & HANDLING
  const totalWeight_kg = input.quantity × input.bookWeight_kg;
  
  let palletsNeeded = 0;
  let palletCost = 0;
  if (input.palletization && totalWeight_kg > 500) {
    palletsNeeded = ceil(totalWeight_kg / 1000); // ~1 ton per pallet
    palletCost = palletsNeeded × PACKING_RATES.palletizing[input.palletType || "WOODEN"];
  }
  
  const totalPackingCost = cartonCost + boxingCost + palletCost;
  const costPerCopy = totalPackingCost / input.quantity;
  
  // Example:
  // 3000 copies @ 11kg each in BOX_30 (5.50 Rs):
  // Cartons: ceil(3000 / 30) = 100 cartons × 5.50 = Rs 550
  // Boxing labour: 3000 × 0.15 = Rs 450
  // Palletization: 33 tons / 1 = 33 pallets × 150 = Rs 4,950
  // Total: Rs 5,950 / 3000 = Rs 1.98/copy
  
  return {
    totalCost: totalPackingCost,
    costPerCopy,
    cartonsNeeded,
    palletsNeeded,
  };
}
```

---

### STEP 14: FREIGHT COST (`freight.ts`)

Logistics, transport, delivery:

```javascript
const FREIGHT_RATES = {
  // Rs per KG by zone/distance
  LOCAL_RADIUS: 0.15,      // Within city
  STATEWIDE: 0.25,         // Same state
  PAN_INDIA: 0.40,         // Cross-state
  EXPORT: 2.50,            // FCL/LCL pricing
};

function calculateFreightCost(input: {
  quantity: number;
  bookWeight_kg: number;
  destination: string;
  deliveryMode: "GROUND" | "EXPRESS" | "AIR";
}) {
  const totalWeight_kg = input.quantity × input.bookWeight_kg;
  
  // Determine zone based on destination
  const zone = determineFreightZone(input.destination);
  let baseRate = FREIGHT_RATES[zone];
  
  // MODE SURCHARGE
  switch (input.deliveryMode) {
    case "EXPRESS":
      baseRate *= 1.5; // 50% surcharge
      break;
    case "AIR":
      baseRate *= 3.0; // 200% surcharge
      break;
  }
  
  // TERMINAL HANDLING CHARGE
  const terminalHandlingCost = 500; // Flat Rs per shipment
  
  // INSURANCE (optional, ~1% of book value)
  // Assuming ~Rs 50/copy retail value:
  const insuranceCost = (totalWeight_kg * baseRate) * 0.01;
  
  const totalFreightCost = (totalWeight_kg * baseRate) + terminalHandlingCost + insuranceCost;
  const costPerCopy = totalFreightCost / input.quantity;
  
  // Example:
  // 3000 copies @ 11kg = 33,000 kg
  // Pan-India, Ground: 33,000 × 0.40 + 500 + fees = Rs 13,700
  // Per copy: Rs 13,700 / 3000 = Rs 4.57/copy
  
  return {
    totalCost: totalFreightCost,
    costPerCopy,
    totalWeight_kg,
  };
}
```

---

### STEP 15: SELLING PRICE CALCULATION (`estimator.ts`)

**CRITICAL FORMULA FROM EXCEL V189:**

```javascript
// The selling price is determined by TWO options, take the MAXIMUM:

function calculateSellingPriceTP(input: {
  baseCostPerCopy: number;      // V188: PVC per copy
  machineHourlyRate: number;    // B224: Rs 6,500/hour
  totalMachineHours: number;    // B223: total hours calculated
  quantity: number;             // D8: print qty
  conversionFactor: number;     // I207: binding-type factor
  marginPercent: number;        // T189: 0.25 = 25%
  discountPercent: number;      // AK189: 0.05 = 5%
}) {
  // OPTION A: Cost + Machine Overhead
  // V189 formula A = ((baseCost + MachineOverhead/Qty/ConvFactor) / (1 - Margin%))
  
  const machineOverheadPerCopy = 
    (input.machineHourlyRate * input.totalMachineHours) / 
    Math.max(1, input.quantity) / 
    Math.max(0.01, input.conversionFactor);
  
  const costWithOverhead = input.baseCostPerCopy + machineOverheadPerCopy;
  const priceA = costWithOverhead / Math.max(0.01, 1 - input.marginPercent);
  const priceARounded = Math.ceil(priceA * 1000) / 1000; // ROUNDUP to 3 decimals
  
  // OPTION B: Cost + Margin + Discount
  // V189 formula B = (baseCost / (1 - Discount%) / (1 - Margin%))
  
  const priceB = 
    input.baseCostPerCopy / 
    Math.max(0.01, 1 - input.discountPercent) / 
    Math.max(0.01, 1 - input.marginPercent);
  const priceBRounded = Math.ceil(priceB * 1000) / 1000;
  
  // FINAL: Take maximum
  const sellingPrice = Math.max(priceARounded, priceBRounded);
  const method = priceARounded >= priceBRounded ? "overhead" : "margin";
  
  // Example with real numbers:
  // baseCost = 23.89 Rs/copy (from PVC)
  // machineOverhead = (6500 × 23.5) / 3000 / 0.8 = 63.51 Rs/copy
  // costWithOverhead = 23.89 + 63.51 = 87.40
  // 
  // Option A: 87.40 / (1 - 0.25) = 87.40 / 0.75 = 116.53 Rs/copy
  // Option B: 23.89 / (1 - 0.05) / (1 - 0.25)
  //         = 23.89 / 0.95 / 0.75  
  //         = 33.33 Rs/copy
  //
  // MIN = Option A (116.53) — protects against low margin on high volume
  // MAX = Option A (116.53) ✓
  
  return {
    sellingPricePerCopy: sellingPrice,
    method,
    baseCost: input.baseCostPerCopy,
    machineOverhead: machineOverheadPerCopy,
  };
}

// INTERPRETATION:
// Option A ensures we don't lose money on machine overhead
// Option B ensures we maintain margin after discount
// We take the MAX to be conservative (price, not aggressive), ensuring profitability
```

---

### STEP 16: CURRENCY CONVERSION

If target currency is not INR:

```javascript
const CURRENCY_RATES = {
  "INR": 1.0,
  "GBP": 108.5,    // 1 GBP = 108.5 INR
  "USD": 87.30,    // 1 USD = 87.30 INR
  "EUR": 95.50,
  // ...
};

function convertPriceToTargetCurrency(input: {
  priceInINR: number;
  targetCurrency: string;
}) {
  if (input.targetCurrency === "INR") {
    return input.priceInINR;
  }
  
  const rate = CURRENCY_RATES[input.targetCurrency];
  const priceInTargetCurrency = input.priceInINR / rate;
  
  // Example:
  // 116.53 INR ÷ 108.5 (GBP rate) = 1.074 GBP/copy
  // 116.53 INR ÷ 87.30 (USD rate) = 1.335 USD/copy
  
  return priceInTargetCurrency;
}
```

---

## COMPLETE WORKED EXAMPLE

### Input Specification

```
Job Title: "Deluxe Recipe Book"
Customer: "Culinary Press"

Book Spec:
  Trim Size: Royal Octavo (153 × 234mm)
  Quantities: [3000, 5000, 0, 0, 0]

Text Section 1:
  Pages: 256
  Colors: 4+4 (full CMYK front and back)
  Paper: Matt Art Paper, 150 GSM
  Size: 23×36"
  Machine: RMGT (6500 SPH)

Cover:
  Pages: 4 (wrap-around)
  Colors: 4+0 (front only)
  Paper: Art Card, 300 GSM
  Fold: wrap_around

Binding: Perfect Binding
Finishing: Gloss lamination on cover
Packing: BOX_30 (boxes of 30)
Delivery: Pan-India, Ground
Currency: GBP
Margin: 25%
Discount: 5%
```

### Step-By-Step Calculation (Qty = 3000)

#### STEP 1-3: Imposition & Sheets

```
Trim: 153 × 234mm
Evaluate 23×36" (585 × 915mm):

Portrait:
  Pages across: floor(915 / 153) = 5
  Signatures down: floor(585 / 468) = 1
  Pages/sheet: 5 × 1 × 2 = 10pp
  Forms needed: ceil(256 / 10) = 26 forms
  
Result: 26 forms × 10 pages/form = 260 pages
(4 pages spoilage, acceptable)
```

#### STEP 4: Wastage

```
Qty: 3000, Colors: 4, Machine: RMGT
Chart lookup: isPercentage=false, fourColor=300 sheets (M/R)

Net sheets: 26 forms × 3000 copies = 78,000 sheets

Wastage:
  Makeready: 300 sheets (fixed for 2001-3000 range)
  Running: 78,000 × 3% = 2,340 sheets
  
Gross sheets: 78,000 + 300 + 2,340 = 80,640 sheets
```

#### STEP 5: Paper Cost

```
Paper: Matt Art Paper 150 GSM
Rate: Rs 1,200/ream (500 sheets)

Reams: ceil(80,640 / 500) = 162 reams
Cost: 162 × 1,200 = Rs 194,400

Per copy: 194,400 / 3,000 = Rs 64.80/copy
```

#### STEP 6: CTP Cost

```
Forms: 26
Colors: 4
Plate size: 23×36" → Rs 247/plate

Plates: 26 × 4 = 104 plates
Cost: 104 × 247 = Rs 25,688

Per copy: 25,688 / 3,000 = Rs 8.56/copy
```

#### STEP 7: Printing Cost

```
Impressions: 3,000 × 26 = 78,000
Rate (3000 qty, RMGT): Rs 151/1000
Makeready: Rs 1,500

Cost: (78,000 / 1,000) × 151 + 1,500 = 11,778 + 1,500 = Rs 13,278

Per copy: 13,278 / 3,000 = Rs 4.43/copy
```

#### STEP 8: Binding Cost

```
Perfect Binding on 256pp book:
Rate: Rs 7.50/copy

Per copy: Rs 7.50
Total: 3,000 × 7.50 = Rs 22,500
```

#### STEP 9: Finishing (Lamination)

```
Gloss lamination on cover (4 pages)
Rate: Rs 2.50/sheet × 2 (both sides)

Per copy: 2 × 2.50 = Rs 5.00
Total: 3,000 × 5.00 = Rs 15,000
```

#### STEP 10: Jacket/Endleaves

```
Not included in this example.
Add if dust jacket needed.
```

#### STEP 11: PVC Aggregation

```
Paper:      Rs 64.80/copy
CTP:        Rs 8.56/copy
Printing:   Rs 4.43/copy
Binding:    Rs 7.50/copy
Finishing:  Rs 5.00/copy
─────────────────────────
Total PVC: Rs 90.29/copy

For 3000: Total = Rs 270,870
```

#### STEP 12: Machine Hours

```
Printing:
  Sheets: 26 forms × 3000 = 78,000
  Speed: 6,500 SPH
  Hours: 78,000 / 6,500 = 12.0 hours
  Makeready: 0.5 hours
  Total: 12.5 hours

Binding:
  Speed: 300 books/hour
  Hours: 3,000 / 300 = 10.0 hours
  Setup: 1.0 hour
  Total: 11.0 hours

Machine Overhead:
  Total hours: 12.5 + 11.0 = 23.5 hours
  Rate: Rs 6,500/hour
  Cost: 23.5 × 6,500 = Rs 152,750
  Per copy: 152,750 / 3,000 = Rs 50.92/copy
```

#### STEP 13: Packing

```
BOX_30 (5.50 Rs/carton)
Cartons: ceil(3,000 / 30) = 100
Cost: 100 × 5.50 = Rs 550

Labour: 3,000 × 0.15 = Rs 450

Total: Rs 1,000 / 3,000 = Rs 0.33/copy
```

#### STEP 14: Freight

```
Weight: 3,000 × 11kg = 33,000 kg (approx, with packaging)
Zone: Pan-India
Rate: Rs 0.40/kg

Cost: 33,000 × 0.40 + 500 = Rs 13,700
Per copy: 13,700 / 3,000 = Rs 4.57/copy
```

#### STEP 15: Selling Price

```
Base Cost (PVC + Packing + Freight):
  90.29 + 0.33 + 4.57 = Rs 95.19/copy

Machine Overhead: Rs 50.92/copy
(Already calculated)

Total Cost Per Copy: 95.19 + 50.92 = Rs 146.11/copy
Margin: 25%
Discount: 5%

Option A (Overhead-based):
  Price = (146.11) / (1 - 0.25) = 146.11 / 0.75 = Rs 194.81/copy
  
Option B (Margin-based):
  Price = 146.11 / (1 - 0.05) / (1 - 0.25) 
        = 146.11 / 0.95 / 0.75 
        = Rs 204.65/copy

Selling Price = MAX(194.81, 204.65) = Rs 204.65/copy
Method: margin-based

Total for 3,000: 204.65 × 3,000 = Rs 613,950
```

#### STEP 16: Currency Conversion

```
Target: GBP
Rate: 108.5 INR/GBP

Price per copy: 204.65 / 108.5 = GBP 1.887/copy
Rounded: GBP 1.89/copy (or keep as GBP 1.887)

Total for 3,000: GBP 1.89 × 3,000 = GBP 5,667
```

### Final Result for 3,000 Copies

| Component | Per Copy | Total |
|-----------|----------|-------|
| Paper | Rs 64.80 | Rs 194,400 |
| CTP | Rs 8.56 | Rs 25,688 |
| Printing | Rs 4.43 | Rs 13,278 |
| Binding | Rs 7.50 | Rs 22,500 |
| Finishing | Rs 5.00 | Rs 15,000 |
| **Base Cost** | **Rs 90.29** | **Rs 270,870** |
| Packing | Rs 0.33 | Rs 1,000 |
| Freight | Rs 4.57 | Rs 13,700 |
| **Direct Cost** | **Rs 95.19** | **Rs 285,570** |
| **Machine Overhead** | **Rs 50.92** | **Rs 152,750** |
| **Total Production** | **Rs 146.11** | **Rs 438,320** |
| **Selling Price (25% margin)** | **Rs 204.65** | **Rs 613,950** |
| **In GBP** | **GBP 1.89** | **GBP 5,667** |

---

## NUMERICAL PRECISION & ROUNDING

Throughout the calculation, maintain precision:

```javascript
// Always keep 3 decimal places during intermediate calculations
function round3(num: number): number {
  return Math.round(num * 1000) / 1000;
}

// Round UP (ceiling) for selling price (Excel ROUNDUP function)
function roundUpPrice(num: number): number {
  return Math.ceil(num * 1000) / 1000;
}

// When combining costs, sum with 2 decimals then round
const totalCost = round2(cost1 + cost2 + cost3 + ...);
```

---

## REFERENCES TO CODE FILES

- **Full Pipeline:** `src/utils/calculations/estimator.ts` lines 1-500
- **Paper Physics:** `src/utils/calculations/paper.ts` lines 1-600
- **Printing:** `src/utils/calculations/printing.ts` lines 1-200
- **Binding:** `src/utils/calculations/binding.ts` lines 1-400
- **Constants:** `src/constants/index.ts` lines 1-1500 (all rates)
- **Validation:** `src/utils/calculations/validate.ts`
- **Trace/Debug:** `src/utils/calculations/trace.ts` (for calibration)

---

## CONCLUSION

The calculation engine is a faithful implementation of the Thomson Press pricing model. Every formula has a corresponding line in the Excel workbook and printed PDF manuals. When making changes, always:

1. **Check the TP manual** for rate tables
2. **Validate against calibration targets** (Rs 65.25/copy for the reference job)
3. **Test with multiple quantities** (rates change by quantity brackets)
4. **Maintain additive wastage** (never use multiplicative)
5. **Use the MAX formula** for selling price (safety valve for profitability)

