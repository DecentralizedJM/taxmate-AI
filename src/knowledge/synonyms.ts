/**
 * Natural Language Synonym Mapping
 * Maps common terms to tax concepts for better understanding
 */

/**
 * Mapping of natural language terms to tax sections and concepts
 */
export const TERM_MAPPINGS: Record<string, string[]> = {
  // Housing Related
  'house rent': ['HRA', '10(13A)', 'house rent allowance', 'rent deduction'],
  'rent i pay': ['HRA', '10(13A)', '80GG', 'rent deduction'],
  'rent allowance': ['HRA', '10(13A)', 'house rent allowance'],
  'paying rent': ['HRA', '10(13A)', '80GG', 'rent deduction'],
  'accommodation': ['HRA', '10(13A)', 'house rent'],
  'landlord': ['HRA', 'rent receipt', '10(13A)'],
  
  // Home Loan
  'home loan': ['24(b)', '80EE', '80EEA', 'housing loan', 'mortgage'],
  'housing loan': ['24(b)', '80EE', '80EEA', 'home loan interest'],
  'home loan interest': ['24(b)', 'housing loan interest'],
  'mortgage': ['24(b)', 'home loan', 'housing loan'],
  'emi': ['24(b)', '80C', 'home loan', 'principal', 'interest'],
  
  // Insurance
  'medical insurance': ['80D', 'health insurance', 'mediclaim'],
  'health insurance': ['80D', 'medical insurance', 'mediclaim'],
  'health policy': ['80D', 'health insurance', 'medical insurance'],
  'mediclaim': ['80D', 'health insurance'],
  'life insurance': ['80C', 'LIC', 'insurance premium'],
  'term insurance': ['80C', 'life insurance'],
  'lic': ['80C', 'life insurance', 'LIC premium'],
  
  // Investments
  'ppf': ['80C', 'public provident fund', 'PPF'],
  'provident fund': ['80C', 'EPF', 'PPF', 'provident fund'],
  'epf': ['80C', 'employee provident fund', 'PF'],
  'nps': ['80CCD', '80CCD(1B)', 'national pension scheme', 'pension'],
  'national pension': ['80CCD', 'NPS', 'national pension scheme'],
  'pension fund': ['80CCD', 'NPS', 'pension'],
  'elss': ['80C', 'equity linked savings', 'tax saving mutual fund'],
  'tax saving fund': ['80C', 'ELSS', 'tax saving mutual fund'],
  'mutual fund': ['ELSS', '80C', 'capital gains', 'STCG', 'LTCG'],
  'fixed deposit': ['80C', 'FD', 'tax saving FD'],
  'fd': ['80C', 'fixed deposit', 'tax saving FD'],
  
  // Crypto / Digital Assets
  'crypto': ['115BBH', 'VDA', 'virtual digital assets', 'cryptocurrency'],
  'bitcoin': ['115BBH', 'VDA', 'cryptocurrency', 'crypto'],
  'ethereum': ['115BBH', 'VDA', 'cryptocurrency', 'crypto'],
  'nft': ['115BBH', 'VDA', 'non-fungible token', 'digital asset'],
  'digital currency': ['115BBH', 'VDA', 'cryptocurrency'],
  'virtual currency': ['115BBH', 'VDA', 'cryptocurrency'],
  
  // Capital Gains
  'stocks': ['capital gains', 'STCG', 'LTCG', '111A', '112A', 'shares'],
  'shares': ['capital gains', 'STCG', 'LTCG', '111A', '112A', 'equity'],
  'equity': ['capital gains', 'STCG', 'LTCG', '111A', '112A'],
  'short term': ['STCG', '111A', 'short term capital gains'],
  'long term': ['LTCG', '112A', 'long term capital gains'],
  
  // Business / Profession
  'freelance': ['44AD', '44ADA', 'business income', 'presumptive taxation'],
  'consulting': ['44ADA', '44AD', 'professional income', 'freelance'],
  'self employed': ['44AD', '44ADA', 'business income', 'professional'],
  'business': ['44AD', 'business income', 'presumptive taxation'],
  'profession': ['44ADA', 'professional income', 'presumptive taxation'],
  'turnover': ['44AD', 'business income', 'presumptive'],
  
  // Education
  'education loan': ['80E', 'education loan interest', 'study loan'],
  'study loan': ['80E', 'education loan', 'education loan interest'],
  'tuition fees': ['80C', 'children education', 'school fees'],
  'school fees': ['80C', 'tuition fees', 'children education'],
  
  // Donations
  'donation': ['80G', 'charitable donation', 'contribution'],
  'charity': ['80G', 'donation', 'charitable contribution'],
  'ngo donation': ['80G', 'charitable donation'],
  
  // Senior Citizens
  'senior citizen': ['80TTB', '80D senior', 'higher exemption'],
  'parents': ['80D parents', 'health insurance parents'],
  
  // Salary Components
  'salary': ['income from salary', 'standard deduction', '16(ia)'],
  'basic salary': ['salary', 'basic', 'HRA calculation'],
  'da': ['dearness allowance', 'salary', 'HRA calculation'],
  
  // Tax Concepts
  'tax saving': ['80C', '80D', 'deductions', 'tax planning'],
  'deduction': ['Chapter VI-A', '80C', '80D', 'exemption'],
  'exemption': ['deduction', 'rebate', 'tax free'],
  'rebate': ['87A', 'tax rebate', 'relief'],
  'cess': ['health education cess', '4% cess', 'surcharge'],
  
  // Regimes
  'new regime': ['new tax regime', 'default regime', 'lower slabs'],
  'old regime': ['old tax regime', 'with deductions', 'higher slabs'],
  
  // Filing
  'itr': ['income tax return', 'tax filing', 'return filing'],
  'tax return': ['ITR', 'income tax return', 'filing'],
  'form 16': ['salary certificate', 'TDS certificate', 'employer form'],
  'tds': ['tax deducted at source', 'advance tax', 'withholding'],
};

/**
 * Expand a query with synonyms for better RAG retrieval
 */
export function expandQueryWithSynonyms(query: string): string {
  const lowerQuery = query.toLowerCase();
  const expansions: string[] = [query];

  for (const [term, synonyms] of Object.entries(TERM_MAPPINGS)) {
    if (lowerQuery.includes(term)) {
      // Add relevant synonyms
      expansions.push(...synonyms.slice(0, 3)); // Limit to top 3
    }
  }

  return [...new Set(expansions)].join(' ');
}

/**
 * Get the tax section for a natural language term
 */
export function getRelevantSections(term: string): string[] {
  const lowerTerm = term.toLowerCase();
  const sections: string[] = [];

  for (const [key, values] of Object.entries(TERM_MAPPINGS)) {
    if (lowerTerm.includes(key)) {
      // Extract section numbers from values
      for (const v of values) {
        const match = v.match(/^(\d+[A-Za-z()]*)/);
        if (match) sections.push(match[1]);
      }
    }
  }

  return [...new Set(sections)];
}

/**
 * Normalize user input to standard tax terms
 */
export function normalizeTerms(input: string): string {
  let normalized = input;

  const normalizations: Record<string, string> = {
    'house rent allowance': 'HRA',
    'public provident fund': 'PPF',
    'employee provident fund': 'EPF',
    'national pension scheme': 'NPS',
    'equity linked savings scheme': 'ELSS',
    'virtual digital asset': 'VDA',
    'short term capital gain': 'STCG',
    'long term capital gain': 'LTCG',
    'health and education cess': 'cess',
  };

  for (const [long, short] of Object.entries(normalizations)) {
    normalized = normalized.replace(new RegExp(long, 'gi'), short);
  }

  return normalized;
}
