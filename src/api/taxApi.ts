/**
 * API Layer for Tax Calculation
 * Thin wrapper over TaxCalculationEngine - validates input and returns structured output.
 * Use this from HTTP handlers, CLI, or other consumers.
 */

import { calculateTax } from '../engine/TaxCalculationEngine';
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
 * Validate income heads (no negative values)
 */
function validateIncomeHeads(incomeHeads: IncomeHeads): void {
  const keys = Object.keys(incomeHeads) as (keyof IncomeHeads)[];
  for (const k of keys) {
    const v = incomeHeads[k];
    if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) {
      throw new Error(`Invalid income head "${k}": must be a non-negative finite number`);
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
      throw new Error('presumptiveBusiness.section44AD.turnover must be non-negative finite number');
    }
    if (typeof isDigitalReceipts !== 'boolean') {
      throw new Error('presumptiveBusiness.section44AD.isDigitalReceipts must be boolean');
    }
  }
  if (presumptive.section44ADA) {
    const { grossReceipts } = presumptive.section44ADA;
    if (typeof grossReceipts !== 'number' || grossReceipts < 0 || !Number.isFinite(grossReceipts)) {
      throw new Error('presumptiveBusiness.section44ADA.grossReceipts must be non-negative finite number');
    }
  }
}

/**
 * Validate deductions (optional, non-negative)
 */
function validateDeductions(deductions?: DeductionsInput): void {
  if (!deductions) return;
  const entries = Object.entries(deductions) as [keyof DeductionsInput, number | undefined][];
  for (const [k, v] of entries) {
    if (v === undefined) continue;
    if (typeof v !== 'number' || v < 0 || !Number.isFinite(v)) {
      throw new Error(`Invalid deduction "${k}": must be non-negative finite number`);
    }
  }
}

/**
 * Calculate income tax for AY 2025-26 (FY 2024-25).
 * Returns detailed JSON with both regimes and recommendation.
 *
 * @throws Error if validation fails
 */
export function calculateTaxApi(request: CalculateTaxRequest): TaxCalculationOutput {
  validateIncomeHeads(request.incomeHeads);
  validatePresumptive(request.presumptiveBusiness);
  validateDeductions(request.deductions);

  const assesseeType = request.assesseeType ?? 'individual';
  if (assesseeType !== 'individual' && assesseeType !== 'huf') {
    throw new Error('assesseeType must be "individual" or "huf"');
  }

  return calculateTax({
    incomeHeads: request.incomeHeads,
    presumptiveBusiness: request.presumptiveBusiness,
    deductions: request.deductions,
    assesseeType,
  });
}
