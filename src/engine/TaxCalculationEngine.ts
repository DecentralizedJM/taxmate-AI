/**
 * TaxCalculationEngine - Core business logic for Indian Income Tax
 * Assessment Year 2025-26 (FY 2024-25) | Budget 2024 amendments
 *
 * Deterministic calculation mirroring Income Tax Department logic.
 * Separates: normal slab tax, special rates (VDA, STCG, LTCG), rebate 87A, cess.
 */

import type {
  IncomeHeads,
  PresumptiveBusiness,
  DeductionsInput,
  TaxSlab,
  SlabBreakdownItem,
  SpecialTaxBreakdown,
  RegimeResult,
  TaxCalculationOutput,
  AssesseeType,
} from '../types';
import {
  ASSESSMENT_YEAR,
  FINANCIAL_YEAR,
  STANDARD_DEDUCTION_NEW_REGIME,
  STANDARD_DEDUCTION_OLD_REGIME,
  REBATE_87A_INCOME_LIMIT_NEW,
  REBATE_87A_INCOME_LIMIT_OLD,
  HEALTH_EDUCATION_CESS_RATE,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  VDA_TAX_RATE,
  STCG_LISTED_EQUITY_RATE,
  LTCG_LISTED_EQUITY_EXEMPT_LIMIT,
  LTCG_LISTED_EQUITY_RATE,
  SECTION_44AD_RATE_DIGITAL,
  SECTION_44AD_RATE_CASH,
  SECTION_44ADA_RATE,
} from '../constants/ay2025-26';

/** Round to nearest rupee (IT rounding) */
function roundToRupee(n: number): number {
  return Math.round(n);
}

/**
 * Compute business income: use presumptive if provided, else use incomeHeads.business
 */
function getBusinessIncome(
  incomeHeads: IncomeHeads,
  presumptive?: PresumptiveBusiness
): number {
  if (presumptive?.section44AD) {
    const { turnover, isDigitalReceipts } = presumptive.section44AD;
    return roundToRupee(turnover * (isDigitalReceipts ? SECTION_44AD_RATE_DIGITAL : SECTION_44AD_RATE_CASH));
  }
  if (presumptive?.section44ADA) {
    return roundToRupee(presumptive.section44ADA.grossReceipts * SECTION_44ADA_RATE);
  }
  return incomeHeads.business;
}

/**
 * Total gross income (all heads). Presumptive business overrides incomeHeads.business.
 */
function getGrossIncome(
  incomeHeads: IncomeHeads,
  presumptive?: PresumptiveBusiness
): number {
  const business = getBusinessIncome(incomeHeads, presumptive);
  return (
    incomeHeads.salary +
    incomeHeads.houseProperty +
    business +
    incomeHeads.capitalGainsOther +
    incomeHeads.otherSources +
    incomeHeads.vda +
    incomeHeads.stcgListedEquity +
    incomeHeads.ltcgListedEquity
  );
}

/**
 * Total Chapter VI-A deduction from input (for old regime only)
 */
function getTotalChapter6A(deductions?: DeductionsInput): number {
  if (!deductions) return 0;
  return (
    (deductions.section80C ?? 0) +
    (deductions.section80CCD1B ?? 0) +
    (deductions.section80CCD2 ?? 0) +
    (deductions.section80D ?? 0) +
    (deductions.section80E ?? 0) +
    (deductions.section80G ?? 0) +
    (deductions.section80TTA ?? 0) +
    (deductions.other ?? 0)
  );
}

/**
 * Tax on a given taxable income using provided slabs (for individuals/HUF)
 */
function taxFromSlabs(income: number, slabs: TaxSlab[]): { tax: number; breakdown: SlabBreakdownItem[] } {
  if (income <= 0) {
    return {
      tax: 0,
      breakdown: slabs.map((slab) => ({ slab, taxableInSlab: 0, taxInSlab: 0 })),
    };
  }
  let tax = 0;
  const breakdown: SlabBreakdownItem[] = [];
  let remaining = income;
  for (const slab of slabs) {
    // "0-3 Lakh" = first 3,00,000 rupees; "3L-7L" = next 4,00,000 (3,00,001 to 7,00,000)
    const width =
      slab.max === Infinity
        ? Math.max(0, remaining)
        : slab.min === 0
          ? slab.max
          : slab.max - slab.min + 1;
    const taxableInSlab = Math.min(remaining, width);
    const taxInSlab = roundToRupee(taxableInSlab * slab.rate);
    tax += taxInSlab;
    breakdown.push({ slab, taxableInSlab, taxInSlab });
    remaining -= taxableInSlab;
    if (remaining <= 0) break;
  }
  return { tax, breakdown };
}

/**
 * Income that is taxed at normal slab rates = total income minus special heads
 * (VDA, STCG, LTCG are taxed at special rates)
 */
function getSlabTaxableIncome(totalIncome: number, incomeHeads: IncomeHeads): number {
  const special =
    incomeHeads.vda + incomeHeads.stcgListedEquity + incomeHeads.ltcgListedEquity;
  return Math.max(0, totalIncome - special);
}

/**
 * Special tax: VDA (30%), STCG (20%), LTCG (12.5% above ₹1,25,000)
 */
function computeSpecialTax(incomeHeads: IncomeHeads): {
  total: number;
  breakdown: SpecialTaxBreakdown;
} {
  const breakdown: SpecialTaxBreakdown = {};
  let total = 0;

  if (incomeHeads.vda > 0) {
    const tax = roundToRupee(incomeHeads.vda * VDA_TAX_RATE);
    breakdown.vda = { income: incomeHeads.vda, rate: VDA_TAX_RATE, tax };
    total += tax;
  }

  if (incomeHeads.stcgListedEquity > 0) {
    const tax = roundToRupee(incomeHeads.stcgListedEquity * STCG_LISTED_EQUITY_RATE);
    breakdown.stcgListedEquity = {
      income: incomeHeads.stcgListedEquity,
      rate: STCG_LISTED_EQUITY_RATE,
      tax,
    };
    total += tax;
  }

  if (incomeHeads.ltcgListedEquity > 0) {
    const exemptAmount = Math.min(incomeHeads.ltcgListedEquity, LTCG_LISTED_EQUITY_EXEMPT_LIMIT);
    const taxableGain = Math.max(0, incomeHeads.ltcgListedEquity - LTCG_LISTED_EQUITY_EXEMPT_LIMIT);
    const tax = roundToRupee(taxableGain * LTCG_LISTED_EQUITY_RATE);
    breakdown.ltcgListedEquity = {
      income: incomeHeads.ltcgListedEquity,
      exemptAmount,
      taxableGain,
      rate: LTCG_LISTED_EQUITY_RATE,
      tax,
    };
    total += tax;
  }

  return { total, breakdown };
}

/**
 * Compute result for one regime
 */
function computeRegime(
  regime: 'new' | 'old',
  grossIncome: number,
  incomeHeads: IncomeHeads,
  standardDeduction: number,
  chapter6A: number,
  totalIncome: number,
  specialResult: { total: number; breakdown: SpecialTaxBreakdown }
): RegimeResult {
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
  const rebateLimit = regime === 'new' ? REBATE_87A_INCOME_LIMIT_NEW : REBATE_87A_INCOME_LIMIT_OLD;

  const slabTaxable = getSlabTaxableIncome(totalIncome, incomeHeads);
  const { tax: taxOnSlabs, breakdown: slabBreakdown } = taxFromSlabs(slabTaxable, slabs);

  const totalTaxBeforeRebate = taxOnSlabs + specialResult.total;
  const rebate87A =
    totalIncome <= rebateLimit ? Math.min(totalTaxBeforeRebate, totalTaxBeforeRebate) : 0;
  const taxAfterRebate = Math.max(0, totalTaxBeforeRebate - rebate87A);
  const healthEducationCess = roundToRupee(taxAfterRebate * HEALTH_EDUCATION_CESS_RATE);
  const totalTaxLiability = roundToRupee(taxAfterRebate + healthEducationCess);

  return {
    regime,
    grossIncome,
    standardDeduction,
    chapter6ADeductions: chapter6A,
    totalIncome,
    taxOnSlabs,
    slabBreakdown,
    rebate87A,
    taxAfterRebate,
    specialTax: specialResult.total,
    specialTaxBreakdown: specialResult.breakdown,
    totalTaxBeforeCess: taxAfterRebate,
    healthEducationCess,
    totalTaxLiability,
  };
}

/**
 * Main calculation: both regimes, with recommendation
 */
export function calculateTax(params: {
  incomeHeads: IncomeHeads;
  presumptiveBusiness?: PresumptiveBusiness;
  deductions?: DeductionsInput;
  assesseeType?: AssesseeType;
}): TaxCalculationOutput {
  const {
    incomeHeads,
    presumptiveBusiness,
    deductions,
    assesseeType = 'individual',
  } = params;

  const grossIncome = getGrossIncome(incomeHeads, presumptiveBusiness);
  const chapter6A = getTotalChapter6A(deductions);

  // Standard deduction applies only to salary; cap at salary
  const salary = incomeHeads.salary;
  const stdNew = Math.min(salary, STANDARD_DEDUCTION_NEW_REGIME);
  const stdOld = Math.min(salary, STANDARD_DEDUCTION_OLD_REGIME);

  // New regime: no Chapter VI-A
  // Per IT practice, negative total income is treated as zero (e.g. when deductions exceed gross)
  const totalIncomeNew = Math.max(0, grossIncome - stdNew);
  const totalIncomeOld = Math.max(0, grossIncome - stdOld - chapter6A);

  const specialResult = computeSpecialTax(incomeHeads);

  const newRegime = computeRegime(
    'new',
    grossIncome,
    incomeHeads,
    stdNew,
    0,
    totalIncomeNew,
    specialResult
  );

  const oldRegime = computeRegime(
    'old',
    grossIncome,
    incomeHeads,
    stdOld,
    chapter6A,
    totalIncomeOld,
    specialResult
  );

  const taxDifference = oldRegime.totalTaxLiability - newRegime.totalTaxLiability;
  const recommendedRegime = taxDifference > 0 ? 'new' : taxDifference < 0 ? 'old' : 'new';

  return {
    assessmentYear: ASSESSMENT_YEAR,
    financialYear: FINANCIAL_YEAR,
    assesseeType,
    incomeHeads,
    presumptiveBusiness,
    newRegime,
    oldRegime,
    recommendedRegime,
    taxDifference,
  };
}
