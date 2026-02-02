/**
 * TypeScript interfaces for Indian Income Tax Calculation
 * Assessment Year 2025-26 (Financial Year 2024-25)
 * All amounts in INR (₹)
 */

// Re-export agent types
export * from './agent';

/** Tax regime: New (default from Budget 2023) or Old */
export type TaxRegime = 'new' | 'old';

/** Assessee type: Individual or HUF (same slab rates apply) */
export type AssesseeType = 'individual' | 'huf';

/**
 * Gross income breakdown by head of income (Section 14)
 * All values in INR; use 0 for absent heads.
 */
export interface IncomeHeads {
  /** Salary (Section 17) - before standard deduction */
  salary: number;
  /** Income from House Property (Section 22–27) */
  houseProperty: number;
  /** Profits and gains from business/profession (Section 28–44) */
  business: number;
  /** Capital gains (Section 45–55) - excluding VDA; use special heads for STCG/LTCG */
  capitalGainsOther: number;
  /** Income from other sources (Section 56–59) */
  otherSources: number;
  /** Virtual Digital Assets (VDA/Crypto) - Section 115BBH - flat 30%, no set-off */
  vda: number;
  /** Short-term capital gains on listed equity (Sec 111A) - flat 20% */
  stcgListedEquity: number;
  /** Long-term capital gains on listed equity (Sec 112A) - 12.5% above ₹1,25,000 */
  ltcgListedEquity: number;
}

/**
 * Presumptive business income (optional)
 * If provided, business income is computed as percentage of turnover/receipts.
 */
export interface PresumptiveBusiness {
  /** Section 44AD: 8% (digital turnover) or 6% (cash) of turnover */
  section44AD?: {
    turnover: number;
    /** true = 8% (digital), false = 6% (cash) */
    isDigitalReceipts: boolean;
  };
  /** Section 44ADA: 50% of gross receipts (profession) */
  section44ADA?: {
    grossReceipts: number;
  };
}

/**
 * Deductions under Chapter VI-A (optional inputs)
 * Applied only in OLD regime for computation of total income.
 * In NEW regime, most deductions are not available (only standard deduction for salary).
 */
export interface DeductionsInput {
  /** 80C, 80CCC, 80CCD(1) - max ₹1,50,000 combined */
  section80C?: number;
  /** 80CCD(1B) - NPS additional ₹50,000 */
  section80CCD1B?: number;
  /** 80CCD(2) - Employer NPS */
  section80CCD2?: number;
  /** 80D - Health insurance */
  section80D?: number;
  /** 80E - Education loan interest */
  section80E?: number;
  /** 80G - Donations */
  section80G?: number;
  /** 80TTA/80TTB - Interest on savings (80TTB for senior citizens) */
  section80TTA?: number;
  /** Other Chapter VI-A (total of any other) */
  other?: number;
}

/**
 * Single tax slab: min (inclusive), max (inclusive), rate (e.g. 0.05 for 5%)
 */
export interface TaxSlab {
  min: number;
  max: number;
  rate: number;
  /** Human-readable label e.g. "0-3 Lakh" */
  label: string;
}

/**
 * Slab-wise breakdown of tax computed
 */
export interface SlabBreakdownItem {
  slab: TaxSlab;
  taxableInSlab: number;
  taxInSlab: number;
}

/**
 * Special tax breakdown (VDA, STCG, LTCG - not part of normal slabs)
 */
export interface SpecialTaxBreakdown {
  /** Section 115BBH - VDA/Crypto @ 30% */
  vda?: { income: number; rate: number; tax: number };
  /** Section 111A - STCG listed equity @ 20% */
  stcgListedEquity?: { income: number; rate: number; tax: number };
  /** Section 112A - LTCG listed equity @ 12.5% on gains above ₹1,25,000 */
  ltcgListedEquity?: { income: number; exemptAmount: number; taxableGain: number; rate: number; tax: number };
}

/**
 * Result for one regime (new or old)
 */
export interface RegimeResult {
  regime: TaxRegime;
  /** Total gross income (sum of all heads, including special) */
  grossIncome: number;
  /** Standard deduction applied (salary only) */
  standardDeduction: number;
  /** Total Chapter VI-A deductions (old regime only; 0 in new regime) */
  chapter6ADeductions: number;
  /** Total income after standard deduction and Chapter VI-A */
  totalIncome: number;
  /** Tax on normal income (slab-wise) before rebate */
  taxOnSlabs: number;
  /** Slab-wise breakdown */
  slabBreakdown: SlabBreakdownItem[];
  /** Rebate u/s 87A (full tax if within limit) */
  rebate87A: number;
  /** Tax after rebate (before cess) */
  taxAfterRebate: number;
  /** Special tax (VDA + STCG + LTCG) */
  specialTax: number;
  /** Special tax breakdown */
  specialTaxBreakdown: SpecialTaxBreakdown;
  /** Total tax (slabs + special) after rebate, before cess */
  totalTaxBeforeCess: number;
  /** Health & Education Cess @ 4% */
  healthEducationCess: number;
  /** Total tax liability (rounded per IT rules) */
  totalTaxLiability: number;
}

/**
 * Full calculation output
 */
export interface TaxCalculationOutput {
  /** Assessment Year */
  assessmentYear: string;
  /** Financial Year */
  financialYear: string;
  /** Assessee type */
  assesseeType: AssesseeType;
  /** Input income heads (as provided) */
  incomeHeads: IncomeHeads;
  /** Presumptive business used (if any) */
  presumptiveBusiness?: PresumptiveBusiness;
  /** New regime result */
  newRegime: RegimeResult;
  /** Old regime result */
  oldRegime: RegimeResult;
  /** Recommended regime (lower tax) */
  recommendedRegime: TaxRegime;
  /** Difference: old regime tax - new regime tax (positive = new is lower) */
  taxDifference: number;
}
