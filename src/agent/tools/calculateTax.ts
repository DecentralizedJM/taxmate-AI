/**
 * Calculate Tax Tool
 * Wraps the existing TaxCalculationEngine for the agent
 */

import type { AgentTool } from '../../types/agent';
import { calculateTaxApi, ZERO_INCOME_HEADS } from '../../api/taxApi';
import type { IncomeHeads, DeductionsInput, PresumptiveBusiness } from '../../types';

/**
 * Calculate tax tool definition
 */
export const calculateTaxTool: AgentTool = {
  name: 'calculate_tax',
  description: `Calculate income tax for both New and Old tax regimes for AY 2025-26. 
Returns detailed breakdown including gross income, deductions, slab-wise tax, special tax (VDA/STCG/LTCG), rebate 87A, cess, and total tax liability.
Also provides a recommendation on which regime is better.`,

  parameters: {
    type: 'object',
    properties: {
      salary: {
        type: 'number',
        description: 'Annual salary income in INR (before deductions)',
      },
      houseProperty: {
        type: 'number',
        description: 'Income/loss from house property in INR',
      },
      business: {
        type: 'number',
        description: 'Business or profession income in INR',
      },
      capitalGainsOther: {
        type: 'number',
        description: 'Capital gains (other than STCG/LTCG on listed equity) in INR',
      },
      otherSources: {
        type: 'number',
        description: 'Income from other sources (interest, etc.) in INR',
      },
      vda: {
        type: 'number',
        description: 'Virtual Digital Assets (crypto) gains in INR - taxed at 30%',
      },
      stcgListedEquity: {
        type: 'number',
        description: 'Short-term capital gains on listed equity in INR - taxed at 20%',
      },
      ltcgListedEquity: {
        type: 'number',
        description: 'Long-term capital gains on listed equity in INR - taxed at 12.5% above ₹1.25L',
      },
      section80C: {
        type: 'number',
        description: 'Deduction under 80C (PPF, ELSS, LIC, etc.) - max ₹1,50,000',
      },
      section80CCD1B: {
        type: 'number',
        description: 'Additional NPS contribution under 80CCD(1B) - max ₹50,000',
      },
      section80D: {
        type: 'number',
        description: 'Health insurance premium under 80D',
      },
      section80G: {
        type: 'number',
        description: 'Donations under 80G',
      },
      section80E: {
        type: 'number',
        description: 'Education loan interest under 80E',
      },
      section80TTA: {
        type: 'number',
        description: 'Interest on savings account under 80TTA - max ₹10,000',
      },
      assesseeType: {
        type: 'string',
        enum: ['individual', 'huf'],
        description: 'Type of taxpayer',
      },
      presumptive44AD: {
        type: 'object',
        description: 'Presumptive business income under Section 44AD',
        properties: {
          turnover: { type: 'number' },
          isDigitalReceipts: { type: 'boolean' },
        },
      },
      presumptive44ADA: {
        type: 'object',
        description: 'Presumptive professional income under Section 44ADA',
        properties: {
          grossReceipts: { type: 'number' },
        },
      },
    },
    required: [],
  },

  execute: async (args: Record<string, unknown>) => {
    // Build income heads from args
    const incomeHeads: IncomeHeads = {
      ...ZERO_INCOME_HEADS,
      salary: (args.salary as number) || 0,
      houseProperty: (args.houseProperty as number) || 0,
      business: (args.business as number) || 0,
      capitalGainsOther: (args.capitalGainsOther as number) || 0,
      otherSources: (args.otherSources as number) || 0,
      vda: (args.vda as number) || 0,
      stcgListedEquity: (args.stcgListedEquity as number) || 0,
      ltcgListedEquity: (args.ltcgListedEquity as number) || 0,
    };

    // Build deductions from args
    const deductions: DeductionsInput = {};
    if (args.section80C) deductions.section80C = args.section80C as number;
    if (args.section80CCD1B) deductions.section80CCD1B = args.section80CCD1B as number;
    if (args.section80D) deductions.section80D = args.section80D as number;
    if (args.section80G) deductions.section80G = args.section80G as number;
    if (args.section80E) deductions.section80E = args.section80E as number;
    if (args.section80TTA) deductions.section80TTA = args.section80TTA as number;

    // Build presumptive business if provided
    let presumptiveBusiness: PresumptiveBusiness | undefined;
    if (args.presumptive44AD) {
      const p = args.presumptive44AD as { turnover?: number; isDigitalReceipts?: boolean };
      if (p.turnover) {
        presumptiveBusiness = {
          section44AD: {
            turnover: p.turnover,
            isDigitalReceipts: p.isDigitalReceipts ?? true,
          },
        };
      }
    }
    if (args.presumptive44ADA) {
      const p = args.presumptive44ADA as { grossReceipts?: number };
      if (p.grossReceipts) {
        presumptiveBusiness = {
          ...presumptiveBusiness,
          section44ADA: {
            grossReceipts: p.grossReceipts,
          },
        };
      }
    }

    // Calculate tax
    const result = calculateTaxApi({
      incomeHeads,
      deductions,
      presumptiveBusiness,
      assesseeType: (args.assesseeType as 'individual' | 'huf') || 'individual',
    });

    // Return formatted result
    return {
      assessmentYear: result.assessmentYear,
      financialYear: result.financialYear,
      grossIncome: result.newRegime.grossIncome,
      newRegime: {
        totalIncome: result.newRegime.totalIncome,
        standardDeduction: result.newRegime.standardDeduction,
        taxOnSlabs: result.newRegime.taxOnSlabs,
        specialTax: result.newRegime.specialTax,
        rebate87A: result.newRegime.rebate87A,
        healthEducationCess: result.newRegime.healthEducationCess,
        totalTaxLiability: result.newRegime.totalTaxLiability,
      },
      oldRegime: {
        totalIncome: result.oldRegime.totalIncome,
        standardDeduction: result.oldRegime.standardDeduction,
        chapter6ADeductions: result.oldRegime.chapter6ADeductions,
        taxOnSlabs: result.oldRegime.taxOnSlabs,
        specialTax: result.oldRegime.specialTax,
        rebate87A: result.oldRegime.rebate87A,
        healthEducationCess: result.oldRegime.healthEducationCess,
        totalTaxLiability: result.oldRegime.totalTaxLiability,
      },
      recommendedRegime: result.recommendedRegime,
      taxSaved: Math.abs(result.taxDifference),
      taxSavedBy: result.taxDifference > 0 ? 'new' : result.taxDifference < 0 ? 'old' : 'same',
    };
  },
};
