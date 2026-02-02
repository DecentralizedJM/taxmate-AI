/**
 * Search Tax Rules Tool
 * Uses RAG to find relevant tax information
 */

import type { AgentTool } from '../../types/agent';
import type { TaxRetriever } from '../../rag/retriever';

/**
 * Static tax rules (fallback when RAG is not available)
 */
const STATIC_RULES: Record<string, string> = {
  '80C': `Section 80C allows deduction up to ₹1,50,000 for investments in:
- Public Provident Fund (PPF)
- Employee Provident Fund (EPF)
- Equity Linked Savings Scheme (ELSS)
- Life Insurance Premium
- National Savings Certificate (NSC)
- 5-year Tax Saving Fixed Deposit
- Tuition fees for children (max 2)
- Home loan principal repayment`,

  '80D': `Section 80D allows deduction for health insurance premiums:
- Self, spouse, children: up to ₹25,000 (₹50,000 if senior citizen)
- Parents: additional ₹25,000 (₹50,000 if senior citizen)
- Preventive health checkup: ₹5,000 (within overall limit)`,

  '80CCD': `Section 80CCD covers National Pension System (NPS):
- 80CCD(1): Employee contribution - within 80C limit of ₹1.5L
- 80CCD(1B): Additional ₹50,000 deduction beyond 80C limit
- 80CCD(2): Employer contribution - up to 10% of salary (14% for govt)`,

  'HRA': `House Rent Allowance (HRA) exemption under Section 10(13A):
Exempt amount is MINIMUM of:
1. Actual HRA received
2. Rent paid minus 10% of basic salary
3. 50% of basic salary (metro) or 40% (non-metro)

Requirements:
- Must receive HRA as part of salary
- Must pay rent for residential accommodation
- Must not own the house you're claiming rent for`,

  '80GG': `Section 80GG - Rent deduction without HRA:
- For those who don't receive HRA from employer
- Deduction is MINIMUM of:
  1. ₹5,000 per month
  2. 25% of total income
  3. Rent paid minus 10% of total income
- You, spouse, or minor child should not own house in the city of employment`,

  '24b': `Section 24(b) - Home Loan Interest:
- Self-occupied property: up to ₹2,00,000 per year
- Let-out property: entire interest (no limit)
- Under construction: interest allowed in 5 equal installments after completion
- Condition: Loan must be taken for purchase/construction/repair/renovation`,

  'VDA': `Virtual Digital Assets (Crypto) - Section 115BBH:
- Flat 30% tax on gains (no slab benefit)
- No deduction allowed except cost of acquisition
- No set-off of losses against any income
- 1% TDS on transactions above ₹50,000 (₹10,000 for specified persons)`,

  'STCG': `Short-Term Capital Gains on Listed Equity - Section 111A:
- Flat 20% tax rate (Budget 2024)
- Applicable when holding period < 12 months
- For listed shares/equity mutual funds sold on recognized exchange
- STT must be paid on sale`,

  'LTCG': `Long-Term Capital Gains on Listed Equity - Section 112A:
- 12.5% tax on gains above ₹1,25,000 (Budget 2024)
- Applicable when holding period >= 12 months
- For listed shares/equity mutual funds
- STT must be paid on both purchase and sale
- No indexation benefit`,

  '44AD': `Section 44AD - Presumptive Taxation for Business:
- Turnover limit: ₹3 crore (₹2 crore if cash > 5%)
- Deemed profit: 8% of turnover (6% for digital receipts)
- No need to maintain books of accounts
- Can show higher profit if actual is more`,

  '44ADA': `Section 44ADA - Presumptive Taxation for Professionals:
- Applicable to specified professions (doctor, lawyer, architect, etc.)
- Gross receipts limit: ₹75 lakhs (₹50 lakhs if cash > 5%)
- Deemed profit: 50% of gross receipts
- No need to maintain books of accounts`,
};

/**
 * Search rules tool (static fallback)
 */
export const searchRulesTool: AgentTool = {
  name: 'search_tax_rules',
  description: `Search for tax rules, sections, and deductions. 
Use this to find accurate information about eligibility, limits, and procedures for various tax provisions.`,

  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query - can be a section number (80C, 80D) or topic (HRA, home loan, crypto)',
      },
    },
    required: ['query'],
  },

  execute: async (args: Record<string, unknown>) => {
    const query = (args.query as string).toUpperCase();

    // Try exact match first
    for (const [key, value] of Object.entries(STATIC_RULES)) {
      if (query.includes(key.toUpperCase())) {
        return { found: true, section: key, content: value };
      }
    }

    // Try keyword matching
    const keywords: Record<string, string[]> = {
      '80C': ['PPF', 'ELSS', 'LIC', 'INVESTMENT', 'TAX SAVING'],
      '80D': ['HEALTH', 'MEDICAL', 'INSURANCE'],
      '80CCD': ['NPS', 'PENSION', 'NATIONAL PENSION'],
      'HRA': ['HOUSE RENT', 'RENT ALLOWANCE', 'RENT I PAY'],
      '80GG': ['RENT WITHOUT HRA', 'NO HRA'],
      '24b': ['HOME LOAN', 'HOUSING LOAN', 'INTEREST ON LOAN'],
      'VDA': ['CRYPTO', 'BITCOIN', 'DIGITAL ASSET'],
      'STCG': ['SHORT TERM', 'STOCK', 'SHARES'],
      'LTCG': ['LONG TERM', 'CAPITAL GAIN'],
      '44AD': ['BUSINESS', 'TURNOVER', 'PRESUMPTIVE'],
      '44ADA': ['PROFESSION', 'FREELANCE', 'CONSULTING'],
    };

    for (const [section, kws] of Object.entries(keywords)) {
      if (kws.some((kw) => query.includes(kw))) {
        return { found: true, section, content: STATIC_RULES[section] };
      }
    }

    return {
      found: false,
      message: 'No specific rule found. Please try a different search term or ask about a specific section.',
    };
  },
};

/**
 * Create search rules tool with RAG retriever
 */
export function createSearchRulesTool(retriever: TaxRetriever): AgentTool {
  return {
    ...searchRulesTool,
    execute: async (args: Record<string, unknown>) => {
      const query = args.query as string;

      try {
        const chunks = await retriever.search(query);

        if (chunks.length > 0) {
          return {
            found: true,
            results: chunks.map((c) => ({
              section: c.metadata.section,
              content: c.content,
              source: c.metadata.source,
              score: c.score,
            })),
          };
        }
      } catch (error) {
        console.warn('RAG search failed, falling back to static rules:', error);
      }

      // Fallback to static rules
      return searchRulesTool.execute(args);
    },
  };
}
