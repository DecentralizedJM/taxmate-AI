/**
 * Example: Calculate tax for AY 2025-26 and print detailed JSON.
 * Run: npm run dev (or npx ts-node src/example.ts)
 */

import { calculateTaxApi } from './api/taxApi';
import { ZERO_INCOME_HEADS } from './api/taxApi';

const incomeHeads = {
  ...ZERO_INCOME_HEADS,
  salary: 12_00_000,
  otherSources: 50_000,
};

const result = calculateTaxApi({
  incomeHeads,
  deductions: {
    section80C: 1_50_000,
    section80D: 25_000,
  },
  assesseeType: 'individual',
});

console.log(JSON.stringify(result, null, 2));
