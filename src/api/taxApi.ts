/**
 * API Layer for Tax Calculation
 * Thin wrapper over TaxCalculationEngine - validates input and returns structured output.
 * Use this from HTTP handlers, CLI, or other consumers.
 */

import { calculateTax } from '../engine/TaxCalculationEngine';
import { ValidationError } from '../errors';
import {
  SECTION_80C_MAX,
  SECTION_80CCD1B_MAX,
  SECTION_80D_MAX,
  SECTION_80TTA_MAX,
  MAX_GROSS_INCOME,
} from '../constants/ay2025-26';
import type {
  IncomeHeads,
  PresumptiveBusiness,
  DeductionsInput,
  TaxCalculationOutput,
  AssesseeType,
} from '../types';

export interface CalculateTaxRequest {
  incomeHeads: IncomeHeads;
  presumptiveBusiness?: PresumptiveBusiness;
  deductions?: DeductionsInput;
  assesseeType?: AssesseeType;
}

/**
 * Default zero income heads - use for partial input
 */
export const ZERO_INCOME_HEADS: IncomeHeads = {
  salary: 0,
  houseProperty: 0,
  business: 0,
  capitalGainsOther: 0,
  otherSources: 0,
  vda: 0,
  stcgListedEquity: 0,
  ltcgListedEquity: 0,
};

/**
 * Validate income heads (no negative values, finite numbers)
 */
function validateIncomeHeads(incomeHeads: IncomeHeads): void {
  const keys = Object.keys(incomeHeads) as (keyof IncomeHeads)[];
  for (const k of keys) {
    const v = incomeHeads[k];
    if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) {
      throw new ValidationError(
        'INVALID_INCOME_HEAD',
        `Invalid income head "${k}": must be a non-negative finite number`,
        k
      );
    }
  }
}

/**
 * Validate presumptive business input
 */
function validatePresumptive(presumptive?: PresumptiveBusiness): void {
  if (!presumptive) return;
  if (presumptive.section44AD) {
    const { turnover, isDigitalReceipts } = presumptive.section44AD;
    if (typeof turnover !== 'number' || turnover < 0 || !Number.isFinite(turnover)) {
      throw new ValidationError(
        'INVALID_PRESUMPTIVE_BUSINESS',
        'presumptiveBusiness.section44AD.turnover must be non-negative finite number',
        'section44AD.turnover'
      );
    }
    if (typeof isDigitalReceipts !== 'boolean') {
      throw new ValidationError(
        'INVALID_PRESUMPTIVE_BUSINESS',
        'presumptiveBusiness.section44AD.isDigitalReceipts must be boolean',
        'section44AD.isDigitalReceipts'
      );
    }
  }
  if (presumptive.section44ADA) {
    const { grossReceipts } = presumptive.section44ADA;
    if (typeof grossReceipts !== 'number' || grossReceipts < 0 || !Number.isFinite(grossReceipts)) {
      throw new ValidationError(
        'INVALID_PRESUMPTIVE_BUSINESS',
        'presumptiveBusiness.section44ADA.grossReceipts must be non-negative finite number',
        'section44ADA.grossReceipts'
      );
    }
  }
}

/**
 * Deduction caps - statutory maximums
 */
const DEDUCTION_CAPS: Partial<Record<keyof DeductionsInput, number>> = {
  section80C: SECTION_80C_MAX,
  section80CCD1B: SECTION_80CCD1B_MAX,
  section80D: SECTION_80D_MAX,
  section80TTA: SECTION_80TTA_MAX,
};

/**
 * Validate deductions (non-negative, finite, within caps)
 */
function validateDeductions(deductions?: DeductionsInput): void {
  if (!deductions) return;
  const entries = Object.entries(deductions) as [keyof DeductionsInput, number | undefined][];
  for (const [k, v] of entries) {
    if (v === undefined) continue;
    if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) {
      throw new ValidationError(
        'INVALID_DEDUCTION',
        `Invalid deduction "${k}": must be non-negative finite number`,
        k
      );
    }
    // Check statutory caps
    const cap = DEDUCTION_CAPS[k];
    if (cap !== undefined && v > cap) {
      throw new ValidationError(
        'DEDUCTION_EXCEEDS_LIMIT',
        `Deduction "${k}" exceeds statutory limit of ₹${cap.toLocaleString('en-IN')}`,
        k
      );
    }
  }
}

/**
 * Validate gross income is within sanity limits
 */
function validateGrossIncome(incomeHeads: IncomeHeads): void {
  const gross =
    incomeHeads.salary +
    incomeHeads.houseProperty +
    incomeHeads.business +
    incomeHeads.capitalGainsOther +
    incomeHeads.otherSources +
    incomeHeads.vda +
    incomeHeads.stcgListedEquity +
    incomeHeads.ltcgListedEquity;

  if (gross > MAX_GROSS_INCOME) {
    throw new ValidationError(
      'GROSS_INCOME_EXCEEDS_LIMIT',
      `Gross income (₹${gross.toLocaleString('en-IN')}) exceeds maximum allowed (₹${MAX_GROSS_INCOME.toLocaleString('en-IN')})`,
      'incomeHeads'
    );
  }
}

/**
 * Calculate income tax for AY 2025-26 (FY 2024-25).
 * Returns detailed JSON with both regimes and recommendation.
 *
 * @throws ValidationError if input fails validation
 */
export function calculateTaxApi(request: CalculateTaxRequest): TaxCalculationOutput {
  validateIncomeHeads(request.incomeHeads);
  validateGrossIncome(request.incomeHeads);
  validatePresumptive(request.presumptiveBusiness);
  validateDeductions(request.deductions);

  const assesseeType = request.assesseeType ?? 'individual';
  if (assesseeType !== 'individual' && assesseeType !== 'huf') {
    throw new ValidationError(
      'INVALID_ASSESSEE_TYPE',
      'assesseeType must be "individual" or "huf"',
      'assesseeType'
    );
  }

  return calculateTax({
    incomeHeads: request.incomeHeads,
    presumptiveBusiness: request.presumptiveBusiness,
    deductions: request.deductions,
    assesseeType,
  });
}
