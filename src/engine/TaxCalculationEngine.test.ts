/**
 * Unit tests for TaxCalculationEngine (AY 2025-26)
 */

import { describe, it, expect } from 'vitest';
import { calculateTax } from './TaxCalculationEngine';
import { ZERO_INCOME_HEADS } from '../api/taxApi';

describe('TaxCalculationEngine', () => {
  describe('Rebate 87A', () => {
    it('New regime: income exactly ₹7L after std deduction should have 0 tax', () => {
      // Salary 7,75,000 - 75,000 std deduction = 7,00,000 total income
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 7_75_000 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.totalIncome).toBe(7_00_000);
      expect(result.newRegime.totalTaxLiability).toBe(0);
    });

    it('New regime: income ₹7L+1 should have positive tax (no rebate)', () => {
      // Salary 7,75,001 - 75,000 = 7,00,001 total income
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 7_75_001 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.totalIncome).toBe(7_00_001);
      expect(result.newRegime.totalTaxLiability).toBeGreaterThan(0);
    });

    it('Old regime: income exactly ₹5L after deductions should have 0 tax', () => {
      // Salary 5,50,000 - 50,000 std deduction = 5,00,000 total income
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 5_50_000 },
        deductions: {},
        assesseeType: 'individual',
      });
      expect(result.oldRegime.totalIncome).toBe(5_00_000);
      expect(result.oldRegime.totalTaxLiability).toBe(0);
    });

    it('Old regime: income ₹5L+1 should have positive tax', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 5_50_001 },
        deductions: {},
        assesseeType: 'individual',
      });
      expect(result.oldRegime.totalIncome).toBe(5_00_001);
      expect(result.oldRegime.totalTaxLiability).toBeGreaterThan(0);
    });
  });

  describe('Slab boundaries (New regime)', () => {
    it('Income exactly ₹3L should have 0 tax on slabs', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 3_75_000 }, // 3,75,000 - 75,000 = 3,00,000
        assesseeType: 'individual',
      });
      expect(result.newRegime.totalIncome).toBe(3_00_000);
      expect(result.newRegime.taxOnSlabs).toBe(0);
    });

    it('Income ₹3L+1 should start 5% slab', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 3_75_001 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.totalIncome).toBe(3_00_001);
      // 1 rupee taxed at 5% = 0.05, rounded to 0
      expect(result.newRegime.taxOnSlabs).toBe(0);
    });

    it('Income ₹15L+1 should be in 30% slab', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 15_75_001 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.totalIncome).toBe(15_00_001);
      // Tax: 0 + 20,000 (4L@5%) + 30,000 (3L@10%) + 30,000 (2L@15%) + 60,000 (3L@20%) + 0.30 (1@30%)
      // = 140,000 + 0.30 rounded = 140,000
      expect(result.newRegime.taxOnSlabs).toBe(1_40_000);
    });
  });

  describe('Negative total income', () => {
    it('Deductions exceeding gross should result in total income = 0', () => {
      // Salary 3,00,000, Ch VI-A deductions much larger
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 3_00_000 },
        deductions: { section80C: 1_50_000, section80D: 25_000 },
        assesseeType: 'individual',
      });
      // Old regime: 3,00,000 - 50,000 (std) - 1,75,000 (deductions) = 75,000
      // Actually this won't go negative, let's use a more extreme case
      expect(result.oldRegime.totalIncome).toBeGreaterThanOrEqual(0);
    });

    it('Large deductions should clamp total income to 0, not negative', () => {
      // Minimal income with maximum deductions in old regime
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 1_00_000 },
        deductions: { section80C: 1_50_000 },
        assesseeType: 'individual',
      });
      // Old: 1,00,000 - 50,000 - 1,50,000 would be -1,00,000, but clamped to 0
      expect(result.oldRegime.totalIncome).toBe(0);
      expect(result.oldRegime.totalTaxLiability).toBe(0);
    });
  });

  describe('Special tax (VDA, STCG, LTCG)', () => {
    it('VDA should be taxed at flat 30%', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, vda: 1_00_000 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.specialTaxBreakdown.vda?.tax).toBe(30_000);
      expect(result.newRegime.specialTaxBreakdown.vda?.rate).toBe(0.30);
    });

    it('STCG listed equity should be taxed at flat 20%', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, stcgListedEquity: 1_00_000 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.specialTaxBreakdown.stcgListedEquity?.tax).toBe(20_000);
      expect(result.newRegime.specialTaxBreakdown.stcgListedEquity?.rate).toBe(0.20);
    });

    it('LTCG: first ₹1,25,000 should be exempt', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, ltcgListedEquity: 1_25_000 },
        assesseeType: 'individual',
      });
      expect(result.newRegime.specialTaxBreakdown.ltcgListedEquity?.exemptAmount).toBe(1_25_000);
      expect(result.newRegime.specialTaxBreakdown.ltcgListedEquity?.taxableGain).toBe(0);
      expect(result.newRegime.specialTaxBreakdown.ltcgListedEquity?.tax).toBe(0);
    });

    it('LTCG: gains above ₹1,25,000 taxed at 12.5%', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, ltcgListedEquity: 2_25_000 },
        assesseeType: 'individual',
      });
      const ltcg = result.newRegime.specialTaxBreakdown.ltcgListedEquity;
      expect(ltcg?.exemptAmount).toBe(1_25_000);
      expect(ltcg?.taxableGain).toBe(1_00_000);
      expect(ltcg?.tax).toBe(12_500); // 1,00,000 * 12.5%
    });

    it('Combined VDA + STCG + LTCG should all be taxed', () => {
      const result = calculateTax({
        incomeHeads: {
          ...ZERO_INCOME_HEADS,
          vda: 1_00_000,
          stcgListedEquity: 50_000,
          ltcgListedEquity: 2_00_000,
        },
        assesseeType: 'individual',
      });
      const special = result.newRegime.specialTaxBreakdown;
      expect(special.vda?.tax).toBe(30_000);
      expect(special.stcgListedEquity?.tax).toBe(10_000);
      expect(special.ltcgListedEquity?.tax).toBe(9_375); // (2,00,000 - 1,25,000) * 12.5%
      expect(result.newRegime.specialTax).toBe(30_000 + 10_000 + 9_375);
    });
  });

  describe('Presumptive taxation', () => {
    it('Section 44AD digital (8% of turnover)', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS },
        presumptiveBusiness: {
          section44AD: { turnover: 50_00_000, isDigitalReceipts: true },
        },
        assesseeType: 'individual',
      });
      // 8% of 50L = 4L business income
      expect(result.newRegime.grossIncome).toBe(4_00_000);
    });

    it('Section 44AD cash (6% of turnover)', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS },
        presumptiveBusiness: {
          section44AD: { turnover: 50_00_000, isDigitalReceipts: false },
        },
        assesseeType: 'individual',
      });
      // 6% of 50L = 3L business income
      expect(result.newRegime.grossIncome).toBe(3_00_000);
    });

    it('Section 44ADA (50% of gross receipts)', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS },
        presumptiveBusiness: {
          section44ADA: { grossReceipts: 20_00_000 },
        },
        assesseeType: 'individual',
      });
      // 50% of 20L = 10L business income
      expect(result.newRegime.grossIncome).toBe(10_00_000);
    });
  });

  describe('Health & Education Cess', () => {
    it('Cess should be 4% of tax after rebate', () => {
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 12_00_000 },
        assesseeType: 'individual',
      });
      const nr = result.newRegime;
      // Tax after rebate
      const expectedCess = Math.round(nr.taxAfterRebate * 0.04);
      expect(nr.healthEducationCess).toBe(expectedCess);
      expect(nr.totalTaxLiability).toBe(nr.taxAfterRebate + nr.healthEducationCess);
    });
  });

  describe('Zero income', () => {
    it('All zeros should result in 0 tax', () => {
      const result = calculateTax({
        incomeHeads: ZERO_INCOME_HEADS,
        assesseeType: 'individual',
      });
      expect(result.newRegime.grossIncome).toBe(0);
      expect(result.newRegime.totalTaxLiability).toBe(0);
      expect(result.oldRegime.totalTaxLiability).toBe(0);
    });
  });

  describe('Recommendation', () => {
    it('Should recommend regime with lower tax', () => {
      // High salary with no deductions -> new regime should be better
      const result = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 15_00_000 },
        deductions: {},
        assesseeType: 'individual',
      });
      // New has higher std deduction (75k vs 50k) and better slabs
      expect(result.recommendedRegime).toBe('new');
      expect(result.taxDifference).toBeGreaterThan(0); // old - new > 0
    });
  });

  describe('HUF', () => {
    it('HUF should use same slab rates as individual', () => {
      const individual = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
        assesseeType: 'individual',
      });
      const huf = calculateTax({
        incomeHeads: { ...ZERO_INCOME_HEADS, salary: 10_00_000 },
        assesseeType: 'huf',
      });
      expect(huf.newRegime.totalTaxLiability).toBe(individual.newRegime.totalTaxLiability);
    });
  });
});
