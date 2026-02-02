/**
 * Agent Tools - Functions the AI agent can call
 */

export { calculateTaxTool } from './calculateTax';
export { searchRulesTool } from './searchRules';
export { getDeadlinesTool } from './getDeadlines';
export { suggestSavingsTool } from './suggestSavings';

import type { AgentTool } from '../../types/agent';
import { calculateTaxTool } from './calculateTax';
import { searchRulesTool, createSearchRulesTool } from './searchRules';
import { getDeadlinesTool } from './getDeadlines';
import { suggestSavingsTool } from './suggestSavings';
import type { TaxRetriever } from '../../rag/retriever';

/**
 * Get all available agent tools
 */
export function getAllTools(retriever?: TaxRetriever): AgentTool[] {
  const tools: AgentTool[] = [
    calculateTaxTool,
    getDeadlinesTool,
    suggestSavingsTool,
  ];

  // Add search tool with retriever if available
  if (retriever) {
    tools.push(createSearchRulesTool(retriever));
  } else {
    tools.push(searchRulesTool);
  }

  return tools;
}
