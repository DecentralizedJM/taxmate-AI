/**
 * Knowledge Base Ingestion Script
 * Reads markdown files and ingests them into Qdrant vector store
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createGeminiClient } from '../llm/gemini';
import { createKnowledgeStore, type TaxKnowledgeStore } from './qdrant';
import type { KnowledgeMetadata } from '../types/agent';

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../knowledge');

interface ChunkConfig {
  maxChunkSize: number;
  overlap: number;
}

const DEFAULT_CONFIG: ChunkConfig = {
  maxChunkSize: 1000, // characters
  overlap: 100,
};

/**
 * Split text into chunks with overlap
 */
function chunkText(text: string, config: ChunkConfig = DEFAULT_CONFIG): string[] {
  const { maxChunkSize, overlap } = config;
  const chunks: string[] = [];

  // Split by sections (##)
  const sections = text.split(/(?=^## )/gm);

  for (const section of sections) {
    if (section.trim().length === 0) continue;

    if (section.length <= maxChunkSize) {
      chunks.push(section.trim());
    } else {
      // Further split large sections by paragraphs
      const paragraphs = section.split(/\n\n+/);
      let currentChunk = '';

      for (const para of paragraphs) {
        if ((currentChunk + para).length <= maxChunkSize) {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = para;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
    }
  }

  return chunks.filter((c) => c.length > 50); // Skip very small chunks
}

/**
 * Extract metadata from markdown content and filename
 */
function extractMetadata(filename: string, content: string, dir: string): KnowledgeMetadata {
  const basename = path.basename(filename, '.md');
  const title = content.match(/^# (.+)$/m)?.[1] || basename;

  // Determine source type from directory
  let source: KnowledgeMetadata['source'] = 'general';
  if (dir.includes('sections')) source = 'it_act';
  else if (dir.includes('deductions')) source = 'deduction';
  else if (dir.includes('faqs')) source = 'faq';
  else if (dir.includes('circulars')) source = 'circular';

  // Extract section from filename (e.g., "80C", "24b", "HRA")
  const section = basename.match(/^(\d+[A-Za-z]*|HRA|VDA|STCG|LTCG)/i)?.[1];

  // Extract keywords from content
  const keywords: string[] = [];
  if (section) keywords.push(section);

  // Add common keyword patterns
  const keywordPatterns = [
    /deduction|exemption|rebate|relief/gi,
    /PPF|ELSS|NPS|EPF|LIC/gi,
    /salary|rent|interest|premium/gi,
  ];
  for (const pattern of keywordPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      keywords.push(...matches.map((m) => m.toUpperCase()));
    }
  }

  return {
    source,
    section,
    title,
    keywords: [...new Set(keywords)],
    assessmentYear: '2025-26',
  };
}

/**
 * Read all markdown files from a directory
 */
function readMarkdownFiles(dir: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      files.push(...readMarkdownFiles(fullPath));
    } else if (item.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({ path: fullPath, content });
    }
  }

  return files;
}

/**
 * Ingest all knowledge files into the vector store
 */
export async function ingestKnowledge(options?: {
  clear?: boolean;
  verbose?: boolean;
}): Promise<{ total: number; chunks: number }> {
  const { clear = false, verbose = true } = options || {};

  const log = verbose ? console.log.bind(console) : () => {};

  // Initialize clients
  const llm = createGeminiClient();
  const store = createKnowledgeStore();
  await store.init();

  // Clear existing data if requested
  if (clear) {
    log('Clearing existing knowledge base...');
    await store.clear();
  }

  // Read all markdown files
  const files = readMarkdownFiles(KNOWLEDGE_BASE_PATH);
  log(`Found ${files.length} knowledge files`);

  let totalChunks = 0;

  // Process each file
  for (const file of files) {
    const relativePath = path.relative(KNOWLEDGE_BASE_PATH, file.path);
    const dir = path.dirname(file.path);
    const metadata = extractMetadata(file.path, file.content, dir);

    log(`Processing: ${relativePath} (${metadata.source})`);

    // Chunk the content
    const chunks = chunkText(file.content);
    log(`  - ${chunks.length} chunks`);

    // Generate embeddings and store
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${path.basename(file.path, '.md')}_chunk_${i}`;

      try {
        const embedding = await llm.embed(chunk);

        await store.upsert(chunkId, chunk, embedding, {
          ...metadata,
          title: i === 0 ? metadata.title : `${metadata.title} (part ${i + 1})`,
        });

        totalChunks++;
      } catch (error) {
        console.error(`Error processing chunk ${chunkId}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  log(`\nIngestion complete: ${files.length} files, ${totalChunks} chunks`);

  // Verify
  const info = await store.getInfo();
  log(`Vector store now has ${info.pointsCount} points`);

  return { total: files.length, chunks: totalChunks };
}

/**
 * CLI entry point
 */
async function main() {
  console.log('TaxMate AI Knowledge Base Ingestion');
  console.log('====================================\n');

  const clear = process.argv.includes('--clear');
  if (clear) {
    console.log('⚠️  Will clear existing data\n');
  }

  try {
    await ingestKnowledge({ clear, verbose: true });
  } catch (error) {
    console.error('Ingestion failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
