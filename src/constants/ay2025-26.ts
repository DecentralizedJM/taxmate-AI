/**
 * Indian Income Tax constants for Assessment Year 2025-26 (FY 2024-25)
 * Budget 2024 amendments applied.
 * All amounts in INR (₹).
 */

import type { TaxSlab } from '../types';

/** AY and FY labels */
export const ASSESSMENT_YEAR = '2025-26';
export const FINANCIAL_YEAR = '2024-25';

/** Standard deduction (Budget 2024) */
export const STANDARD_DEDUCTION_NEW_REGIME = 75_000;  // Salaried - New regime
export const STANDARD_DEDUCTION_OLD_REGIME = 50_000;  // Salaried - Old regime

/** Rebate u/s 87A - income limit below which tax is fully rebated */
export const REBATE_87A_INCOME_LIMIT_NEW = 7_00_000;
export const REBATE_87A_INCOME_LIMIT_OLD = 5_00_000;

/** Health & Education Cess (on tax) */
export const HEALTH_EDUCATION_CESS_RATE = 0.04; // 4%

// --- New Tax Regime Slabs (Budget 2024) ---
// 0-3L Nil, 3-7L 5%, 7-10L 10%, 10-12L 15%, 12-15L 20%, 15L+ 30%
export const NEW_REGIME_SLABS: TaxSlab[] = [
  { min: 0,           max: 3_00_000,  rate: 0,    label: '0 - ₹3,00,000 (Nil)' },
  { min: 3_00_001,    max: 7_00_000,  rate: 0.05, label: '₹3,00,001 - ₹7,00,000 (5%)' },
  { min: 7_00_001,    max: 10_00_000, rate: 0.10, label: '₹7,00,001 - ₹10,00,000 (10%)' },
  { min: 10_00_001,   max: 12_00_000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000 (15%)' },
  { min: 12_00_001,   max: 15_00_000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000 (20%)' },
  { min: 15_00_001,   max: Infinity,  rate: 0.30, label: 'Above ₹15,00,000 (30%)' },
];

// --- Old Tax Regime Slabs ---
// 0-2.5L Nil, 2.5-5L 5%, 5-10L 20%, 10L+ 30%
export const OLD_REGIME_SLABS: TaxSlab[] = [
  { min: 0,         max: 2_50_000,  rate: 0,    label: '0 - ₹2,50,000 (Nil)' },
  { min: 2_50_001,  max: 5_00_000,  rate: 0.05, label: '₹2,50,001 - ₹5,00,000 (5%)' },
  { min: 5_00_001,  max: 10_00_000, rate: 0.20, label: '₹5,00,001 - ₹10,00,000 (20%)' },
  { min: 10_00_001, max: Infinity,  rate: 0.30, label: 'Above ₹10,00,000 (30%)' },
];

/** Section 115BBH - VDA (Crypto) - flat rate, no deduction, no set-off */
export const VDA_TAX_RATE = 0.30; // 30%

/** Section 111A - STCG on listed equity - flat rate */
export const STCG_LISTED_EQUITY_RATE = 0.20; // 20%

/** Section 112A - LTCG on listed equity */
export const LTCG_LISTED_EQUITY_EXEMPT_LIMIT = 1_25_000; // ₹1,25,000
export const LTCG_LISTED_EQUITY_RATE = 0.125; // 12.5%

/** Section 44AD - Presumptive business rates */
export const SECTION_44AD_RATE_DIGITAL = 0.08; // 8%
export const SECTION_44AD_RATE_CASH = 0.06;    // 6%

/** Section 44ADA - Presumptive profession - 50% of gross receipts */
export const SECTION_44ADA_RATE = 0.50; // 50%

// --- Deduction caps (statutory limits) ---
/** Section 80C, 80CCC, 80CCD(1) combined max */
export const SECTION_80C_MAX = 1_50_000; // ₹1,50,000
/** Section 80CCD(1B) - NPS additional contribution max */
export const SECTION_80CCD1B_MAX = 50_000; // ₹50,000
/** Section 80D - Health insurance max (self + family, non-senior) */
export const SECTION_80D_MAX = 25_000; // ₹25,000 (can be higher with parents/seniors)
/** Section 80TTA - Interest on savings max */
export const SECTION_80TTA_MAX = 10_000; // ₹10,000

// --- Sanity limits ---
/** Maximum gross income accepted (10 Crore) - protects against overflow/input errors */
export const MAX_GROSS_INCOME = 10_00_00_000; // ₹10 Crore
