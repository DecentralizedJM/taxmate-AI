/**
 * Structured error types for TaxMate AI
 * Machine-readable codes for API clients and frontends.
 */

/** Validation error codes */
export type ValidationErrorCode =
  | 'INVALID_INCOME_HEAD'
  | 'INVALID_DEDUCTION'
  | 'DEDUCTION_EXCEEDS_LIMIT'
  | 'GROSS_INCOME_EXCEEDS_LIMIT'
  | 'INVALID_ASSESSEE_TYPE'
  | 'INVALID_PRESUMPTIVE_BUSINESS';

/**
 * ValidationError - thrown when input fails validation.
 * Contains machine-readable `code` and optional `field` for client handling.
 */
export class ValidationError extends Error {
  readonly code: ValidationErrorCode;
  readonly field?: string;

  constructor(code: ValidationErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      field: this.field,
    };
  }
}
