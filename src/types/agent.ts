/**
 * Types for the AI Tax Agent
 */

import type { TaxCalculationOutput } from './index';

/** Message role in conversation */
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

/** A single message in conversation */
export interface Message {
  id?: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp?: Date;
}

/** Tool call request from LLM */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Result of a tool execution */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

/** Agent tool definition */
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/** JSON Schema for tool parameters */
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  items?: ToolProperty;
  properties?: Record<string, ToolProperty>;
}

/** Agent response to user */
export interface AgentResponse {
  message: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  suggestions?: string[];
  calculations?: TaxCalculationOutput;
  conversationId?: string;
}

/** Chat request from client */
export interface ChatRequest {
  message: string;
  conversationId?: string;
}

/** Conversation history */
export interface Conversation {
  id: string;
  userId?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

/** Retrieved knowledge chunk for RAG */
export interface KnowledgeChunk {
  id: string;
  content: string;
  score: number;
  metadata: KnowledgeMetadata;
}

export interface KnowledgeMetadata {
  source: 'it_act' | 'circular' | 'faq' | 'deduction' | 'general';
  section?: string;
  keywords?: string[];
  assessmentYear?: string;
  title?: string;
}

/** User tax profile (persisted) */
export interface UserTaxProfile {
  id: string;
  userId: string;
  assessmentYear: string;
  incomeHeads?: Record<string, number>;
  deductions?: Record<string, number>;
  presumptiveBusiness?: Record<string, unknown>;
  regimePreference?: 'new' | 'old' | null;
  updatedAt: Date;
}

/** Tax deadline info */
export interface TaxDeadline {
  name: string;
  date: string;
  description: string;
  applicable: boolean;
}

/** Tax saving suggestion */
export interface TaxSuggestion {
  category: string;
  title: string;
  description: string;
  potentialSaving?: number;
  section?: string;
  priority: 'high' | 'medium' | 'low';
}
