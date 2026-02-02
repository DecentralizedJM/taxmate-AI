# TaxMate AI – Indian Income Tax Calculation Engine

**Assessment Year 2025-26 (Financial Year 2024-25)**  
TypeScript/Node.js engine that mirrors the Indian Income Tax Department logic with **Budget 2024** amendments.

---

## Features

- **Dual regime**: Computes tax under **New** and **Old** regime simultaneously and recommends the lower tax option.
- **New regime (default)**: Standard deduction ₹75,000; slabs 0–3L (Nil), 3–7L (5%), 7–10L (10%), 10–12L (15%), 12–15L (20%), 15L+ (30%); Rebate 87A if total income ≤ ₹7,00,000.
- **Old regime**: Standard deduction ₹50,000; slabs 0–2.5L (Nil), 2.5–5L (5%), 5–10L (20%), 10L+ (30%); Rebate 87A if total income ≤ ₹5,00,000.
- **Special rates**: VDA/Crypto (30% – Sec 115BBH), STCG listed equity (20% – Sec 111A), LTCG listed equity (12.5% above ₹1,25,000 – Sec 112A).
- **Presumptive**: Section 44AD (8%/6%) and 44ADA (50%).
- **HUF**: Same slab rates as individual.
- **4% Health & Education Cess** on total tax after rebates.
- **Strict TypeScript** interfaces; business logic separated from API layer.

---

## Verification Against Official Tables

Use these for manual checks:

| Regime | Slab (₹)        | Rate |
|--------|------------------|------|
| **New** | 0 – 3,00,000     | Nil  |
| **New** | 3,00,001 – 7,00,000  | 5%  |
| **New** | 7,00,001 – 10,00,000 | 10% |
| **New** | 10,00,001 – 12,00,000| 15% |
| **New** | 12,00,001 – 15,00,000| 20% |
| **New** | Above 15,00,000  | 30% |
| **Old** | 0 – 2,50,000     | Nil  |
| **Old** | 2,50,001 – 5,00,000  | 5%  |
| **Old** | 5,00,001 – 10,00,000 | 20% |
| **Old** | Above 10,00,000  | 30% |

- **Standard deduction**: New ₹75,000, Old ₹50,000 (salary only).
- **Rebate 87A**: New – full rebate if total income ≤ ₹7,00,000; Old – full rebate if total income ≤ ₹5,00,000.
- **Cess**: 4% on tax (after rebate).

---

## Quick Start

**Backend (engine + example):**
```bash
npm install
npm run build
npm run dev   # runs example and prints JSON
```

**Frontend (React UI):**
```bash
cd frontend
npm install
npm run dev   # open http://localhost:5173
npm run build # output in frontend/dist
```

---

## Usage

### Programmatic (trusted input)

```ts
import { calculateTax } from 'taxmate-ai';

const output = calculateTax({
  incomeHeads: {
    salary: 12_00_000,
    houseProperty: 0,
    business: 0,
    capitalGainsOther: 0,
    otherSources: 50_000,
    vda: 0,
    stcgListedEquity: 0,
    ltcgListedEquity: 0,
  },
  deductions: {
    section80C: 1_50_000,
    section80D: 25_000,
  },
  assesseeType: 'individual',
});
```

### API layer (validates input)

```ts
import { calculateTaxApi, ZERO_INCOME_HEADS } from 'taxmate-ai';

const result = calculateTaxApi({
  incomeHeads: { ...ZERO_INCOME_HEADS, salary: 9_00_000, vda: 1_00_000 },
  presumptiveBusiness: {
    section44AD: { turnover: 50_00_000, isDigitalReceipts: true },
  },
  deductions: { section80C: 1_50_000 },
});
// result.newRegime, result.oldRegime, result.recommendedRegime, result.taxDifference
```

### Output shape

`TaxCalculationOutput` includes:

- `assessmentYear`, `financialYear`, `assesseeType`
- `incomeHeads`, `presumptiveBusiness` (if any)
- `newRegime` / `oldRegime`: `grossIncome`, `standardDeduction`, `chapter6ADeductions`, `totalIncome`, `taxOnSlabs`, `slabBreakdown`, `rebate87A`, `taxAfterRebate`, `specialTax`, `specialTaxBreakdown`, `totalTaxBeforeCess`, `healthEducationCess`, `totalTaxLiability`
- `recommendedRegime`, `taxDifference`

---

## Project Structure

```
├── src/                  # Backend (TaxCalculationEngine)
│   ├── types/            # TypeScript interfaces
│   ├── constants/       # AY 2025-26 slabs, limits, rates
│   ├── engine/          # Core calculation
│   ├── api/              # API layer (validation + wrapper)
│   ├── example.ts        # Example run
│   └── index.ts          # Public exports
├── frontend/             # React (Vite) UI – uses engine via alias
│   ├── src/App.tsx       # Income form + result display
│   └── ...
└── taxmate-AI1-frontend/ # Cloned from github.com/DecentralizedJM/taxmate-AI1 (README only)
```

---

## License

MIT
