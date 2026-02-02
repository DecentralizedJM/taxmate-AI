/**
 * Gemini LLM Client with Function Calling
 * Uses Google's Generative AI SDK for chat and embeddings
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  FunctionDeclaration,
  FunctionCallingMode,
  Tool as GeminiTool,
} from '@google/generative-ai';
import type { AgentTool, Message, ToolCall, ToolResult } from '../types/agent';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  embeddingModel?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ChatOptions {
  systemPrompt: string;
  context?: string;
  history: Message[];
  message: string;
  tools?: AgentTool[];
}

export interface ChatResponse {
  message: string;
  toolCalls?: ToolCall[];
  finishReason?: string;
}

/**
 * Convert agent tools to Gemini function declarations
 */
function toGeminiFunctions(tools: AgentTool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as FunctionDeclaration['parameters'],
  }));
}

/**
 * Convert message history to Gemini content format
 */
function toGeminiHistory(messages: Message[]): Content[] {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === 'assistant') {
      const parts: Part[] = [{ text: msg.content }];

      // Add function calls if present
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments,
            },
          });
        }
      }

      contents.push({ role: 'model', parts });
    } else if (msg.role === 'tool' && msg.toolResults) {
      // Function responses
      const parts: Part[] = msg.toolResults.map((tr) => ({
        functionResponse: {
          name: tr.name,
          response: { result: tr.result },
        },
      }));
      contents.push({ role: 'function', parts });
    }
  }

  return contents;
}

/**
 * Gemini LLM Client
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private embeddingModel: GenerativeModel;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-1.5-flash',
      embeddingModel: 'text-embedding-004',
      temperature: 0.7,
      maxOutputTokens: 2048,
      ...config,
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model!,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: this.config.embeddingModel!,
    });
  }

  /**
   * Send a chat message with optional function calling
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { systemPrompt, context, history, message, tools } = options;

    // Build system instruction with context
    let systemInstruction = systemPrompt;
    if (context) {
      systemInstruction += `\n\n## Relevant Tax Knowledge:\n${context}`;
    }

    // Create model with tools if provided
    const modelWithTools = tools?.length
      ? this.genAI.getGenerativeModel({
          model: this.config.model!,
          systemInstruction,
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxOutputTokens,
          },
          tools: [
            {
              functionDeclarations: toGeminiFunctions(tools),
            } as GeminiTool,
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingMode.AUTO,
            },
          },
        })
      : this.genAI.getGenerativeModel({
          model: this.config.model!,
          systemInstruction,
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxOutputTokens,
          },
        });

    // Start chat with history
    const chat = modelWithTools.startChat({
      history: toGeminiHistory(history),
    });

    // Send message
    const result = await chat.sendMessage(message);
    const response = result.response;

    // Extract text and function calls
    const textParts = response.candidates?.[0]?.content?.parts?.filter(
      (p) => 'text' in p
    );
    const functionCallParts = response.candidates?.[0]?.content?.parts?.filter(
      (p) => 'functionCall' in p
    );

    const responseText = textParts?.map((p) => (p as { text: string }).text).join('') || '';

    const toolCalls: ToolCall[] | undefined = functionCallParts?.map((p, i) => {
      const fc = (p as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall;
      return {
        id: `call_${Date.now()}_${i}`,
        name: fc.name,
        arguments: fc.args || {},
      };
    });

    return {
      message: responseText,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      finishReason: response.candidates?.[0]?.finishReason,
    };
  }

  /**
   * Continue chat after tool execution
   */
  async continueWithToolResults(
    options: ChatOptions & { toolResults: ToolResult[] }
  ): Promise<ChatResponse> {
    const { systemPrompt, context, history, toolResults, tools } = options;

    // Build updated history with tool results
    const updatedHistory: Message[] = [
      ...history,
      {
        role: 'tool',
        content: '',
        toolResults,
      },
    ];

    // Send empty message to get response after tool results
    return this.chat({
      systemPrompt,
      context,
      history: updatedHistory,
      message: '', // Gemini will respond based on tool results
      tools,
    });
  }

  /**
   * Generate embeddings for text
   */
  async embed(text: string): Promise<number[]> {
    const result = await this.embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results = await Promise.all(texts.map((t) => this.embed(t)));
    return results;
  }
}

/**
 * Create Gemini client from environment
 */
export function createGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GeminiClient({
    apiKey,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  });
}
