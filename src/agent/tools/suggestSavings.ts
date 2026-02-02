/**
 * Suggest Tax Savings Tool
 * Analyzes user profile and suggests ways to save tax
 * Provides proactive recommendations based on income profile
 */

import type { AgentTool, TaxSuggestion } from '../../types/agent';
import {
  SECTION_80C_MAX,
  SECTION_80CCD1B_MAX,
  SECTION_80D_MAX,
  SECTION_80TTA_MAX,
} from '../../constants/ay2025-26';

/**
 * Generate tax saving suggestions based on income and current deductions
 */
function generateSuggestions(
  income: Record<string, number>,
  deductions: Record<string, number>
): TaxSuggestion[] {
  const suggestions: TaxSuggestion[] = [];
  const totalIncome =
    (income.salary || 0) +
    (income.business || 0) +
    (income.otherSources || 0);

  // Skip if very low income
  if (totalIncome < 300000) {
    suggestions.push({
      category: 'General',
      title: 'No Tax Payable',
      description: 'Your income is below the basic exemption limit. No tax saving needed.',
      priority: 'low',
    });
    return suggestions;
  }

  // 80C suggestions
  const current80C = deductions.section80C || 0;
  if (current80C < SECTION_80C_MAX) {
    const remaining = SECTION_80C_MAX - current80C;
    const potentialSaving = Math.round(remaining * 0.3); // Assuming 30% tax bracket

    suggestions.push({
      category: 'Section 80C',
      title: `Maximize 80C Deduction (₹${remaining.toLocaleString('en-IN')} remaining)`,
      description: `You can invest up to ₹${remaining.toLocaleString('en-IN')} more in 80C instruments like PPF, ELSS, or tax-saving FDs.`,
      potentialSaving,
      section: '80C',
      priority: remaining > 100000 ? 'high' : 'medium',
    });

    if (current80C === 0) {
      suggestions.push({
        category: 'Section 80C',
        title: 'Consider ELSS for Tax Saving',
        description: 'ELSS (Equity Linked Savings Scheme) has the shortest lock-in (3 years) among 80C investments and potential for higher returns.',
        section: '80C',
        priority: 'high',
      });
    }
  }

  // 80CCD(1B) - NPS
  const current80CCD1B = deductions.section80CCD1B || 0;
  if (current80CCD1B < SECTION_80CCD1B_MAX) {
    const remaining = SECTION_80CCD1B_MAX - current80CCD1B;
    const potentialSaving = Math.round(remaining * 0.3);

    suggestions.push({
      category: 'Section 80CCD(1B)',
      title: `Additional NPS Contribution (₹${remaining.toLocaleString('en-IN')} remaining)`,
      description: `Invest in NPS to get additional ₹${remaining.toLocaleString('en-IN')} deduction beyond 80C limit.`,
      potentialSaving,
      section: '80CCD(1B)',
      priority: 'medium',
    });
  }

  // 80D - Health Insurance
  const current80D = deductions.section80D || 0;
  if (current80D < SECTION_80D_MAX) {
    const remaining = SECTION_80D_MAX - current80D;

    suggestions.push({
      category: 'Section 80D',
      title: 'Health Insurance Premium',
      description: `Get health insurance for yourself and family. You can claim up to ₹${SECTION_80D_MAX.toLocaleString('en-IN')} for self/family and additional ₹25,000 for parents.`,
      potentialSaving: Math.round(remaining * 0.3),
      section: '80D',
      priority: current80D === 0 ? 'high' : 'medium',
    });
  }

  // HRA suggestion for salaried
  if (income.salary && income.salary > 500000) {
    suggestions.push({
      category: 'HRA Exemption',
      title: 'Claim HRA if Paying Rent',
      description: 'If you receive HRA and pay rent, you can claim HRA exemption under Section 10(13A). Keep rent receipts and landlord PAN if rent > ₹1 lakh/year.',
      section: '10(13A)',
      priority: 'medium',
    });
  }

  // Home loan suggestion
  if (totalIncome > 1000000 && !deductions.section24b) {
    suggestions.push({
      category: 'Section 24(b)',
      title: 'Home Loan Interest Deduction',
      description: 'If you have a home loan, you can claim up to ₹2 lakh interest deduction under Section 24(b) for self-occupied property.',
      potentialSaving: 60000, // 2L at 30%
      section: '24(b)',
      priority: 'low',
    });
  }

  // New vs Old regime
  if (totalIncome > 700000) {
    suggestions.push({
      category: 'Tax Regime',
      title: 'Compare New vs Old Regime',
      description: 'With your income level, compare both regimes. New regime has lower rates but fewer deductions. Old regime allows 80C, 80D, HRA, etc.',
      priority: 'high',
    });
  }

  // Proactive suggestions based on income level
  if (totalIncome > 1500000) {
    // High income earners
    suggestions.push({
      category: 'Tax Planning',
      title: 'Consider Professional Tax Planning',
      description: 'With income above ₹15 lakhs, consulting a CA can help identify additional saving opportunities through salary restructuring, HRA optimization, and long-term investments.',
      priority: 'medium',
    });
  }

  // Savings account interest
  if (!deductions.section80TTA && income.otherSources) {
    suggestions.push({
      category: 'Section 80TTA',
      title: 'Claim Savings Account Interest Deduction',
      description: `Deduction up to ₹${SECTION_80TTA_MAX.toLocaleString('en-IN')} on interest from savings accounts under 80TTA (Old regime only).`,
      potentialSaving: Math.round(SECTION_80TTA_MAX * 0.2),
      section: '80TTA',
      priority: 'low',
    });
  }

  // Advance tax reminder for business/professional income
  if (income.business && income.business > 1000000) {
    suggestions.push({
      category: 'Advance Tax',
      title: 'Plan for Advance Tax Payments',
      description: 'With significant business income, ensure you pay advance tax in quarterly installments to avoid interest under Section 234B and 234C.',
      priority: 'high',
    });
  }

  return suggestions;
}

/**
 * Generate proactive suggestions for the agent to offer
 */
export function getProactiveSuggestions(context: {
  month: number;
  hasIncome: boolean;
  hasTaxProfile: boolean;
}): string[] {
  const { month, hasIncome, hasTaxProfile } = context;
  const suggestions: string[] = [];

  // End of financial year reminders (Jan-Mar)
  if (month >= 1 && month <= 3) {
    suggestions.push('🗓️ The financial year is ending soon! Have you made all your tax-saving investments?');
    suggestions.push('💡 Tip: Invest in 80C instruments like ELSS, PPF before March 31 to maximize deductions.');
  }

  // Post March suggestions (Apr-Jun)
  if (month >= 4 && month <= 6) {
    if (!hasTaxProfile) {
      suggestions.push('📊 New assessment year has started. Would you like me to help you plan your taxes for this year?');
    }
    suggestions.push('📝 Remember to collect Form 16 from your employer for the previous financial year.');
  }

  // ITR filing season (Jun-Jul)
  if (month >= 6 && month <= 7) {
    suggestions.push('⏰ ITR filing deadline (July 31) is approaching. Have you filed your return?');
    suggestions.push('📋 I can help you calculate your tax liability and compare regimes before filing.');
  }

  // Advance tax quarters
  const advanceTaxMonths = [6, 9, 12, 3]; // Jun, Sep, Dec, Mar
  if (advanceTaxMonths.includes(month) && hasIncome) {
    suggestions.push('💰 Advance tax installment is due this month. Would you like me to calculate your liability?');
  }

  return suggestions;
}

/**
 * Suggest tax savings tool definition
 */
export const suggestSavingsTool: AgentTool = {
  name: 'suggest_tax_savings',
  description: `Analyze income and current deductions to suggest ways to save tax.
Considers unused deduction limits, income type, and provides actionable recommendations.`,

  parameters: {
    type: 'object',
    properties: {
      salary: {
        type: 'number',
        description: 'Annual salary income',
      },
      business: {
        type: 'number',
        description: 'Business/profession income',
      },
      otherSources: {
        type: 'number',
        description: 'Other income',
      },
      currentSection80C: {
        type: 'number',
        description: 'Current 80C investments',
      },
      currentSection80CCD1B: {
        type: 'number',
        description: 'Current NPS contribution under 80CCD(1B)',
      },
      currentSection80D: {
        type: 'number',
        description: 'Current health insurance premium',
      },
      hasHomeLoan: {
        type: 'boolean',
        description: 'Whether user has a home loan',
      },
      paysRent: {
        type: 'boolean',
        description: 'Whether user pays rent',
      },
    },
    required: [],
  },

  execute: async (args: Record<string, unknown>) => {
    const income = {
      salary: (args.salary as number) || 0,
      business: (args.business as number) || 0,
      otherSources: (args.otherSources as number) || 0,
    };

    const deductions = {
      section80C: (args.currentSection80C as number) || 0,
      section80CCD1B: (args.currentSection80CCD1B as number) || 0,
      section80D: (args.currentSection80D as number) || 0,
      section24b: args.hasHomeLoan ? 200000 : 0,
    };

    const suggestions = generateSuggestions(income, deductions);

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      totalSuggestions: suggestions.length,
      suggestions,
      totalPotentialSavings: suggestions.reduce((sum, s) => sum + (s.potentialSaving || 0), 0),
    };
  },
};
