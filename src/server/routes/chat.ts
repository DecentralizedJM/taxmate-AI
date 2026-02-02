/**
 * Chat API Route
 * Handles conversational interactions with the Tax Agent
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TaxAgent, createTaxAgent } from '../../agent/TaxAgent';
import { createGeminiClient } from '../../llm/gemini';
import { createKnowledgeStore } from '../../rag/qdrant';
import { createRetriever } from '../../rag/retriever';
import { getMemory } from '../../agent/memory/ConversationMemory';
import { getAllTools } from '../../agent/tools';
import { ValidationError } from '../../errors';
import pino from 'pino';

const logger = pino({ name: 'chat-api' });

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
});

// Singleton agent instance
let agentInstance: TaxAgent | null = null;

/**
 * Initialize and get the TaxAgent instance
 */
async function getAgent(): Promise<TaxAgent> {
  if (agentInstance) {
    return agentInstance;
  }

  // Check if Gemini API key is available
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required for chat functionality');
  }

  const llm = createGeminiClient();
  const memory = getMemory();

  // Try to initialize RAG if Qdrant is available
  let retriever;
  try {
    if (process.env.QDRANT_URL) {
      const store = createKnowledgeStore();
      await store.init();
      retriever = createRetriever(llm, store);
      logger.info('RAG retriever initialized');
    }
  } catch (error) {
    logger.warn({ error }, 'Qdrant not available, running without RAG');
  }

  // Create agent with tools
  const tools = getAllTools(retriever);

  agentInstance = createTaxAgent({
    llm,
    retriever,
    memory,
    tools,
  });

  logger.info('TaxAgent initialized');
  return agentInstance;
}

/**
 * Generate a conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create the chat router
 */
export function createChatRouter(): Router {
  const router = Router();

  /**
   * POST /api/chat
   * Send a message to the Tax Agent
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const parseResult = ChatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError(
          'INVALID_INCOME_HEAD', // Using existing error code
          'Invalid request: ' + parseResult.error.errors.map(e => e.message).join(', '),
          'message'
        );
      }

      const { message, conversationId } = parseResult.data;
      const convId = conversationId || generateConversationId();

      logger.info({ conversationId: convId }, 'Chat request received');

      // Get agent and process message
      const agent = await getAgent();
      const response = await agent.chat(message, convId);

      logger.info(
        {
          conversationId: convId,
          hasToolCalls: !!response.toolCalls,
          hasCalculations: !!response.calculations,
        },
        'Chat response generated'
      );

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/chat/:conversationId/history
   * Get conversation history
   */
  router.get('/:conversationId/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = req.params.conversationId as string;
      const agent = await getAgent();
      const history = agent.getHistory(conversationId);

      res.json({
        conversationId,
        messages: history,
        count: history.length,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/chat/:conversationId
   * Clear conversation history
   */
  router.delete('/:conversationId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = req.params.conversationId as string;
      const agent = await getAgent();
      agent.clearConversation(conversationId);

      res.json({ success: true, conversationId });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
