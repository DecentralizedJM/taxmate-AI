/**
 * TaxMate AI - Indian Income Tax Calculation Engine
 * Assessment Year 2025-26 (Financial Year 2024-25) | Budget 2024
 *
 * Public API:
 * - calculateTax() from engine (business logic)
 * - calculateTaxApi() from api (with validation)
 * - All types from types/
 * - Constants from constants/
 */

// Business logic (use for programmatic calls with trusted input)
export { calculateTax } from './engine/TaxCalculationEngine';

// API layer (use for HTTP/CLI - validates input)
export { calculateTaxApi, ZERO_INCOME_HEADS, type CalculateTaxRequest } from './api/taxApi';

// Errors
export { ValidationError, type ValidationErrorCode } from './errors';

// Types
export type {
  TaxRegime,
  AssesseeType,
  IncomeHeads,
  PresumptiveBusiness,
  DeductionsInput,
  TaxSlab,
  SlabBreakdownItem,
  SpecialTaxBreakdown,
  RegimeResult,
  TaxCalculationOutput,
} from './types';

// Constants (for verification / display)
export {
  ASSESSMENT_YEAR,
  FINANCIAL_YEAR,
  STANDARD_DEDUCTION_NEW_REGIME,
  STANDARD_DEDUCTION_OLD_REGIME,
  REBATE_87A_INCOME_LIMIT_NEW,
  REBATE_87A_INCOME_LIMIT_OLD,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
  VDA_TAX_RATE,
  STCG_LISTED_EQUITY_RATE,
  LTCG_LISTED_EQUITY_EXEMPT_LIMIT,
  LTCG_LISTED_EQUITY_RATE,
  SECTION_44AD_RATE_DIGITAL,
  SECTION_44AD_RATE_CASH,
  SECTION_44ADA_RATE,
  HEALTH_EDUCATION_CESS_RATE,
  SECTION_80C_MAX,
  SECTION_80CCD1B_MAX,
  SECTION_80D_MAX,
  SECTION_80TTA_MAX,
  MAX_GROSS_INCOME,
} from './constants/ay2025-26';
