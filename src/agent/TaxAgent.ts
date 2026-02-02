/**
 * TaxAgent - Main AI Tax Assistant Orchestrator
 * Coordinates LLM, RAG, tools, and memory for conversational tax assistance
 */

import type { GeminiClient, ChatResponse } from '../llm/gemini';
import type { TaxRetriever } from '../rag/retriever';
import type { ConversationMemory } from './memory/ConversationMemory';
import type {
  AgentTool,
  AgentResponse,
  ToolCall,
  ToolResult,
  Message,
} from '../types/agent';
import { SYSTEM_PROMPT } from './prompts/system';

export interface TaxAgentConfig {
  llm: GeminiClient;
  retriever?: TaxRetriever;
  memory: ConversationMemory;
  tools: AgentTool[];
}

/**
 * TaxAgent - Conversational AI Tax Assistant
 */
export class TaxAgent {
  private llm: GeminiClient;
  private retriever?: TaxRetriever;
  private memory: ConversationMemory;
  private tools: AgentTool[];
  private toolMap: Map<string, AgentTool>;

  constructor(config: TaxAgentConfig) {
    this.llm = config.llm;
    this.retriever = config.retriever;
    this.memory = config.memory;
    this.tools = config.tools;

    // Build tool lookup map
    this.toolMap = new Map(config.tools.map((t) => [t.name, t]));
  }

  /**
   * Process a user message and generate a response
   */
  async chat(
    message: string,
    conversationId: string,
    userId?: string
  ): Promise<AgentResponse> {
    // Ensure conversation exists
    this.memory.getOrCreate(conversationId, userId);

    // Get conversation history
    const history = this.memory.getHistory(conversationId);

    // Get relevant context from RAG (if available)
    let context = '';
    if (this.retriever) {
      try {
        context = await this.retriever.getContext(message);
      } catch (error) {
        console.warn('RAG retrieval failed:', error);
      }
    }

    // Call LLM with message, history, and tools
    let response = await this.llm.chat({
      systemPrompt: SYSTEM_PROMPT,
      context,
      history,
      message,
      tools: this.tools,
    });

    // Execute tool calls if any
    let toolResults: ToolResult[] = [];
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (response.toolCalls && response.toolCalls.length > 0 && iterations < maxIterations) {
      iterations++;

      // Execute all tool calls
      toolResults = await this.executeTools(response.toolCalls);

      // Continue conversation with tool results
      const updatedHistory: Message[] = [
        ...history,
        { role: 'user', content: message },
        {
          role: 'assistant',
          content: response.message,
          toolCalls: response.toolCalls,
        },
        {
          role: 'tool',
          content: '',
          toolResults,
        },
      ];

      // Get final response after tool execution
      response = await this.llm.chat({
        systemPrompt: SYSTEM_PROMPT,
        context,
        history: updatedHistory,
        message: '', // Empty message - LLM responds to tool results
        tools: this.tools,
      });
    }

    // Save conversation to memory
    this.memory.save(
      conversationId,
      message,
      response.message,
      response.toolCalls,
      toolResults.length > 0 ? toolResults : undefined
    );

    // Build response
    const agentResponse: AgentResponse = {
      message: response.message,
      conversationId,
    };

    // Include tool calls and results if any
    if (response.toolCalls) {
      agentResponse.toolCalls = response.toolCalls;
    }
    if (toolResults.length > 0) {
      agentResponse.toolResults = toolResults;

      // Extract calculations if calculate_tax was called
      const calcResult = toolResults.find((tr) => tr.name === 'calculate_tax');
      if (calcResult && !calcResult.error) {
        agentResponse.calculations = calcResult.result as AgentResponse['calculations'];
      }

      // Extract suggestions if suggest_tax_savings was called
      const suggestResult = toolResults.find((tr) => tr.name === 'suggest_tax_savings');
      if (suggestResult && !suggestResult.error) {
        const result = suggestResult.result as { suggestions?: { title: string }[] };
        if (result.suggestions) {
          agentResponse.suggestions = result.suggestions.map((s) => s.title);
        }
      }
    }

    return agentResponse;
  }

  /**
   * Execute tool calls and return results
   */
  private async executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const tool = this.toolMap.get(call.name);

      if (!tool) {
        results.push({
          toolCallId: call.id,
          name: call.name,
          result: null,
          error: `Unknown tool: ${call.name}`,
        });
        continue;
      }

      try {
        const result = await tool.execute(call.arguments);
        results.push({
          toolCallId: call.id,
          name: call.name,
          result,
        });
      } catch (error) {
        results.push({
          toolCallId: call.id,
          name: call.name,
          result: null,
          error: error instanceof Error ? error.message : 'Tool execution failed',
        });
      }
    }

    return results;
  }

  /**
   * Get conversation history
   */
  getHistory(conversationId: string): Message[] {
    return this.memory.getHistory(conversationId);
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId: string): void {
    this.memory.delete(conversationId);
  }
}

/**
 * Create TaxAgent with dependencies
 */
export function createTaxAgent(config: TaxAgentConfig): TaxAgent {
  return new TaxAgent(config);
}
