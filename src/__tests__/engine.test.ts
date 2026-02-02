/**
 * Sanity tests for TaxCalculationEngine (AY 2025-26)
 * Run: npm test
 */

import { calculateTax } from '../engine/TaxCalculationEngine';
import { ZERO_INCOME_HEADS } from '../api/taxApi';

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

// New regime: total income ≤ ₹7,00,000 → full rebate 87A → tax = 0
const result7L = calculateTax({
  incomeHeads: { ...ZERO_INCOME_HEADS, salary: 7_00_000 },
  assesseeType: 'individual',
});
assert(
  result7L.newRegime.totalIncome <= 7_00_000 && result7L.newRegime.totalTaxLiability === 0,
  'New regime: income ≤ 7L should have 0 tax (Rebate 87A)'
);

// Old regime: total income ≤ ₹5,00,000 → full rebate 87A → tax = 0
const result5L = calculateTax({
  incomeHeads: { ...ZERO_INCOME_HEADS, salary: 5_00_000 },
  deductions: {},
  assesseeType: 'individual',
});
assert(
  result5L.oldRegime.totalIncome <= 5_00_000 && result5L.oldRegime.totalTaxLiability === 0,
  'Old regime: income ≤ 5L should have 0 tax (Rebate 87A)'
);

// VDA: 30% flat
const resultVDA = calculateTax({
  incomeHeads: { ...ZERO_INCOME_HEADS, vda: 1_00_000 },
  assesseeType: 'individual',
});
assert(
  resultVDA.newRegime.specialTaxBreakdown.vda?.tax === 30_000,
  'VDA 1L should attract 30% = 30,000'
);

// LTCG: first 1,25,000 exempt; rest at 12.5%
const resultLTCG = calculateTax({
  incomeHeads: { ...ZERO_INCOME_HEADS, ltcgListedEquity: 2_25_000 },
  assesseeType: 'individual',
});
const taxableLTCG = 2_25_000 - 1_25_000;
assert(
  resultLTCG.newRegime.specialTaxBreakdown.ltcgListedEquity?.tax === Math.round(taxableLTCG * 0.125),
  'LTCG 2.25L: 1L taxable at 12.5% = 12,500'
);

console.log('All sanity tests passed.');
process.exit(0);
