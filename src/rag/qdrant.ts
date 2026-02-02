/**
 * Qdrant Vector Database Client
 * Optimized for Railway + Qdrant Cloud / self-hosted
 * - URL normalization (Railway private network)
 * - Retry with exponential backoff
 * - Timeout for operations
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type { KnowledgeChunk, KnowledgeMetadata } from '../types/agent';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName?: string;
  /** Connection timeout in ms (default 10000) */
  timeout?: number;
  /** Max retries for init (default 3) */
  maxRetries?: number;
}

const DEFAULT_COLLECTION = 'tax_knowledge';
const VECTOR_SIZE = 768; // Gemini text-embedding-004 dimension
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const INIT_RETRY_DELAY_MS = 1000;

/**
 * Normalize Qdrant URL for Railway / Cloud
 * Railway private networking may give host:port; ensure protocol.
 */
export function normalizeQdrantUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Assume http for local/private (Railway internal, localhost)
  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

/**
 * Sleep for ms (for retry backoff)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run fn with retries and exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  label: string
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delayMs = INIT_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[Qdrant] ${label} attempt ${attempt}/${maxRetries} failed, retry in ${delayMs}ms:`, lastError.message);
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Qdrant client wrapper for tax knowledge base
 */
export class TaxKnowledgeStore {
  private client: QdrantClient;
  private collectionName: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: QdrantConfig) {
    const url = normalizeQdrantUrl(config.url);
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

    this.client = new QdrantClient({
      url,
      apiKey: config.apiKey,
      timeout: this.timeout,
    });
    this.collectionName = config.collectionName || DEFAULT_COLLECTION;
  }

  /**
   * Initialize collection if it doesn't exist (with retry)
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = withRetry(async () => {
      if (this.initialized) return;

      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
      }

      this.initialized = true;
    }, this.maxRetries, 'init');

    await this.initPromise;
  }

  /**
   * Upsert a knowledge chunk with its embedding
   */
  async upsert(
    id: string,
    content: string,
    embedding: number[],
    metadata: KnowledgeMetadata
  ): Promise<void> {
    await this.init();

    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: {
            content,
            ...metadata,
          },
        },
      ],
    });
  }

  /**
   * Upsert multiple chunks at once
   */
  async upsertBatch(
    chunks: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: KnowledgeMetadata;
    }>
  ): Promise<void> {
    await this.init();

    const points = chunks.map((chunk) => ({
      id: chunk.id,
      vector: chunk.embedding,
      payload: {
        content: chunk.content,
        ...chunk.metadata,
      },
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  /**
   * Search for similar knowledge chunks
   */
  async search(
    queryEmbedding: number[],
    limit: number = 5,
    filter?: Partial<KnowledgeMetadata>
  ): Promise<KnowledgeChunk[]> {
    await this.init();

    // Build filter if provided
    const qdrantFilter = filter
      ? {
          must: Object.entries(filter)
            .filter(([, v]) => v !== undefined)
            .map(([key, value]) => ({
              key,
              match: { value },
            })),
        }
      : undefined;

    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      filter: qdrantFilter,
      with_payload: true,
    });

    return results.map((r) => ({
      id: String(r.id),
      content: (r.payload?.content as string) || '',
      score: r.score,
      metadata: {
        source: (r.payload?.source as KnowledgeMetadata['source']) || 'general',
        section: r.payload?.section as string | undefined,
        keywords: r.payload?.keywords as string[] | undefined,
        assessmentYear: r.payload?.assessmentYear as string | undefined,
        title: r.payload?.title as string | undefined,
      },
    }));
  }

  /**
   * Delete a chunk by ID
   */
  async delete(id: string): Promise<void> {
    await this.init();
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id],
    });
  }

  /**
   * Get collection info
   */
  async getInfo(): Promise<{ pointsCount: number }> {
    await this.init();
    const info = await this.client.getCollection(this.collectionName);
    return {
      pointsCount: info.points_count || 0,
    };
  }

  /**
   * Clear all data (use with caution)
   */
  async clear(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      this.initialized = false;
      await this.init();
    } catch (error) {
      // Collection might not exist
      await this.init();
    }
  }
}

/**
 * Create Qdrant store from environment (Railway-friendly)
 * QDRANT_URL: e.g. https://xxx.railway.app or host:port for private network
 */
export function createKnowledgeStore(): TaxKnowledgeStore {
  const url = process.env.QDRANT_URL || 'http://localhost:6333';
  const apiKey = process.env.QDRANT_API_KEY;
  const timeout = process.env.QDRANT_TIMEOUT_MS
    ? parseInt(process.env.QDRANT_TIMEOUT_MS, 10)
    : DEFAULT_TIMEOUT_MS;
  const maxRetries = process.env.QDRANT_MAX_RETRIES
    ? parseInt(process.env.QDRANT_MAX_RETRIES, 10)
    : DEFAULT_MAX_RETRIES;

  return new TaxKnowledgeStore({
    url,
    apiKey: apiKey || undefined,
    collectionName: process.env.QDRANT_COLLECTION || DEFAULT_COLLECTION,
    timeout: Number.isFinite(timeout) ? timeout : DEFAULT_TIMEOUT_MS,
    maxRetries: Number.isFinite(maxRetries) ? maxRetries : DEFAULT_MAX_RETRIES,
  });
}

/**
 * Check if Qdrant is reachable (for health/readiness)
 */
export async function checkQdrantConnection(url?: string): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = url || process.env.QDRANT_URL;
  if (!baseUrl) return { ok: false, error: 'QDRANT_URL not set' };

  try {
    const normalized = normalizeQdrantUrl(baseUrl);
    const client = new QdrantClient({
      url: normalized,
      apiKey: process.env.QDRANT_API_KEY,
      timeout: 5000,
    });
    await client.getCollections();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
