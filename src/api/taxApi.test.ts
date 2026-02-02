/**
 * Unit tests for taxApi validation layer
 */

import { describe, it, expect } from 'vitest';
import { calculateTaxApi, ZERO_INCOME_HEADS } from './taxApi';
import { ValidationError } from '../errors';
import { SECTION_80C_MAX, SECTION_80CCD1B_MAX, MAX_GROSS_INCOME } from '../constants/ay2025-26';

describe('taxApi validation', () => {
  describe('Income heads validation', () => {
    it('Should accept valid income heads', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
      });
      expect(result.newRegime.grossIncome).toBe(10_00_000);
    });

    it('Should reject negative income', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: -1000 },
        })
      ).toThrow(ValidationError);

      try {
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: -1000 },
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        expect((e as ValidationError).code).toBe('INVALID_INCOME_HEAD');
        expect((e as ValidationError).field).toBe('salary');
      }
    });

    it('Should reject NaN income', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: NaN },
        })
      ).toThrow(ValidationError);
    });

    it('Should reject Infinity income', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: Infinity },
        })
      ).toThrow(ValidationError);
    });
  });

  describe('Gross income limit', () => {
    it('Should accept income up to MAX_GROSS_INCOME', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: MAX_GROSS_INCOME },
      });
      expect(result.newRegime.grossIncome).toBe(MAX_GROSS_INCOME);
    });

    it('Should reject income exceeding MAX_GROSS_INCOME', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: MAX_GROSS_INCOME + 1 },
        })
      ).toThrow(ValidationError);

      try {
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: MAX_GROSS_INCOME + 1 },
        });
      } catch (e) {
        expect((e as ValidationError).code).toBe('GROSS_INCOME_EXCEEDS_LIMIT');
      }
    });
  });

  describe('Deduction validation', () => {
    it('Should accept valid deductions', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
        deductions: { section80C: 1_00_000 },
      });
      expect(result.oldRegime.chapter6ADeductions).toBe(1_00_000);
    });

    it('Should reject negative deductions', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
          deductions: { section80C: -1000 },
        })
      ).toThrow(ValidationError);
    });

    it('Should reject section80C exceeding ₹1.5L', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
          deductions: { section80C: SECTION_80C_MAX + 1 },
        })
      ).toThrow(ValidationError);

      try {
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
          deductions: { section80C: SECTION_80C_MAX + 1 },
        });
      } catch (e) {
        expect((e as ValidationError).code).toBe('DEDUCTION_EXCEEDS_LIMIT');
        expect((e as ValidationError).field).toBe('section80C');
      }
    });

    it('Should reject section80CCD1B exceeding ₹50,000', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
          deductions: { section80CCD1B: SECTION_80CCD1B_MAX + 1 },
        })
      ).toThrow(ValidationError);
    });

    it('Should accept deductions at exact limits', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
        deductions: {
          section80C: SECTION_80C_MAX,
          section80CCD1B: SECTION_80CCD1B_MAX,
        },
      });
      expect(result.oldRegime.chapter6ADeductions).toBe(SECTION_80C_MAX + SECTION_80CCD1B_MAX);
    });
  });

  describe('Presumptive business validation', () => {
    it('Should accept valid 44AD input', () => {
      const result = calculateTaxApi({
        incomeHeads: ZERO_INCOME_HEADS,
        presumptiveBusiness: {
          section44AD: { turnover: 50_00_000, isDigitalReceipts: true },
        },
      });
      expect(result.newRegime.grossIncome).toBe(4_00_000); // 8%
    });

    it('Should reject negative turnover', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: ZERO_INCOME_HEADS,
          presumptiveBusiness: {
            section44AD: { turnover: -1000, isDigitalReceipts: true },
          },
        })
      ).toThrow(ValidationError);
    });

    it('Should accept valid 44ADA input', () => {
      const result = calculateTaxApi({
        incomeHeads: ZERO_INCOME_HEADS,
        presumptiveBusiness: {
          section44ADA: { grossReceipts: 20_00_000 },
        },
      });
      expect(result.newRegime.grossIncome).toBe(10_00_000); // 50%
    });

    it('Should reject negative gross receipts', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: ZERO_INCOME_HEADS,
          presumptiveBusiness: {
            section44ADA: { grossReceipts: -1000 },
          },
        })
      ).toThrow(ValidationError);
    });
  });

  describe('Assessee type validation', () => {
    it('Should accept "individual"', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
        assesseeType: 'individual',
      });
      expect(result.assesseeType).toBe('individual');
    });

    it('Should accept "huf"', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
        assesseeType: 'huf',
      });
      expect(result.assesseeType).toBe('huf');
    });

    it('Should reject invalid assessee type', () => {
      expect(() =>
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
          assesseeType: 'company' as any,
        })
      ).toThrow(ValidationError);

      try {
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
          assesseeType: 'invalid' as any,
        });
      } catch (e) {
        expect((e as ValidationError).code).toBe('INVALID_ASSESSEE_TYPE');
      }
    });

    it('Should default to "individual" when not provided', () => {
      const result = calculateTaxApi({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
      });
      expect(result.assesseeType).toBe('individual');
    });
  });

  describe('ValidationError structure', () => {
    it('ValidationError should have code, message, and field', () => {
      try {
        calculateTaxApi({
          incomeHeads: { ...ZERO_INCOME_HEADS, salary: -1 },
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        const err = e as ValidationError;
        expect(err.code).toBeDefined();
        expect(err.message).toBeDefined();
        expect(err.field).toBeDefined();
        expect(err.name).toBe('ValidationError');
      }
    });

    it('ValidationError.toJSON() should return serializable object', () => {
      const error = new ValidationError('INVALID_INCOME_HEAD', 'Test message', 'testField');
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'ValidationError',
        code: 'INVALID_INCOME_HEAD',
        message: 'Test message',
        field: 'testField',
      });
    });
  });
});
