/**
 * RAG Retriever for Tax Knowledge
 * Retrieves relevant context from the knowledge base
 */

import type { GeminiClient } from '../llm/gemini';
import type { TaxKnowledgeStore } from './qdrant';
import type { KnowledgeChunk, KnowledgeMetadata } from '../types/agent';

export interface RetrieverConfig {
  topK?: number;
  minScore?: number;
  includeMetadata?: boolean;
}

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.5;

/**
 * Tax Knowledge Retriever
 * Uses embeddings to find relevant tax rules and information
 */
export class TaxRetriever {
  private llm: GeminiClient;
  private store: TaxKnowledgeStore;
  private config: Required<RetrieverConfig>;

  constructor(
    llm: GeminiClient,
    store: TaxKnowledgeStore,
    config: RetrieverConfig = {}
  ) {
    this.llm = llm;
    this.store = store;
    this.config = {
      topK: config.topK ?? DEFAULT_TOP_K,
      minScore: config.minScore ?? DEFAULT_MIN_SCORE,
      includeMetadata: config.includeMetadata ?? true,
    };
  }

  /**
   * Search for relevant knowledge chunks
   */
  async search(
    query: string,
    filter?: Partial<KnowledgeMetadata>
  ): Promise<KnowledgeChunk[]> {
    // Generate query embedding
    const queryEmbedding = await this.llm.embed(query);

    // Search vector store
    const results = await this.store.search(
      queryEmbedding,
      this.config.topK,
      filter
    );

    // Filter by minimum score
    return results.filter((r) => r.score >= this.config.minScore);
  }

  /**
   * Get formatted context string for LLM
   */
  async getContext(
    query: string,
    filter?: Partial<KnowledgeMetadata>
  ): Promise<string> {
    const chunks = await this.search(query, filter);

    if (chunks.length === 0) {
      return '';
    }

    // Format chunks as context
    const contextParts = chunks.map((chunk, i) => {
      let header = `[${i + 1}]`;
      if (chunk.metadata.section) {
        header += ` Section ${chunk.metadata.section}`;
      }
      if (chunk.metadata.title) {
        header += ` - ${chunk.metadata.title}`;
      }
      return `${header}:\n${chunk.content}`;
    });

    return contextParts.join('\n\n');
  }

  /**
   * Search with query expansion using synonyms
   */
  async searchWithExpansion(
    query: string,
    synonyms: Record<string, string[]>
  ): Promise<KnowledgeChunk[]> {
    // Expand query with synonyms
    let expandedQuery = query.toLowerCase();
    for (const [term, alternatives] of Object.entries(synonyms)) {
      if (expandedQuery.includes(term)) {
        expandedQuery += ` ${alternatives.join(' ')}`;
      }
    }

    return this.search(expandedQuery);
  }

  /**
   * Get chunks by section (e.g., "80C", "10(13A)")
   */
  async getBySection(section: string): Promise<KnowledgeChunk[]> {
    return this.search(`Section ${section}`, { section });
  }

  /**
   * Get all deduction-related chunks
   */
  async getDeductionInfo(deductionType: string): Promise<KnowledgeChunk[]> {
    return this.search(`${deductionType} deduction eligibility limits`, {
      source: 'deduction',
    });
  }
}

/**
 * Create retriever with dependencies
 */
export function createRetriever(
  llm: GeminiClient,
  store: TaxKnowledgeStore,
  config?: RetrieverConfig
): TaxRetriever {
  return new TaxRetriever(llm, store, config);
}
