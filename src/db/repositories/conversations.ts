/**
 * Conversation Repository
 * Database operations for conversations and messages
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Message, ToolCall, ToolResult } from '../../types/agent';

// Simplified types
export interface ConversationRow {
  id: string;
  user_id: string;
  title: string | null;
  assessment_year: string;
  created_at: string;
  updated_at: string;
}

interface ConversationInsert {
  id?: string;
  user_id: string;
  title?: string | null;
  assessment_year?: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls: unknown[] | null;
  tool_results: unknown[] | null;
  created_at: string;
}

interface MessageInsert {
  id?: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls?: unknown[] | null;
  tool_results?: unknown[] | null;
}

export interface ConversationWithMessages extends ConversationRow {
  messages: MessageRow[];
}

export class ConversationRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get conversation by ID
   */
  async getById(conversationId: string): Promise<ConversationRow | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  }

  /**
   * Get conversation with messages
   */
  async getWithMessages(conversationId: string): Promise<ConversationWithMessages | null> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select(`
        *,
        messages (*)
      `)
      .eq('id', conversationId)
      .order('created_at', { referencedTable: 'messages', ascending: true })
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as ConversationWithMessages;
  }

  /**
   * Get user's conversations (paginated)
   */
  async getUserConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ConversationRow[]> {
    const { limit = 20, offset = 0 } = options || {};

    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new conversation
   */
  async create(conversation: ConversationInsert): Promise<ConversationRow> {
    const { data, error } = await this.supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string): Promise<ConversationRow> {
    const { data, error } = await this.supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete conversation (cascades to messages)
   */
  async delete(conversationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw error;
  }

  /**
   * Add message to conversation
   */
  async addMessage(message: MessageInsert): Promise<MessageRow> {
    const { data, error } = await this.supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;

    // Update conversation's updated_at
    await this.supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', message.conversation_id);

    return data;
  }

  /**
   * Add user message
   */
  async addUserMessage(conversationId: string, content: string): Promise<MessageRow> {
    return this.addMessage({
      conversation_id: conversationId,
      role: 'user',
      content,
    });
  }

  /**
   * Add assistant message
   */
  async addAssistantMessage(
    conversationId: string,
    content: string,
    toolCalls?: ToolCall[]
  ): Promise<MessageRow> {
    return this.addMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      tool_calls: toolCalls as unknown[] | undefined,
    });
  }

  /**
   * Add tool result message
   */
  async addToolMessage(
    conversationId: string,
    toolResults: ToolResult[]
  ): Promise<MessageRow> {
    return this.addMessage({
      conversation_id: conversationId,
      role: 'tool',
      content: '', // Tool results are in tool_results field
      tool_results: toolResults as unknown[],
    });
  }

  /**
   * Get messages for conversation
   */
  async getMessages(conversationId: string): Promise<MessageRow[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Convert database messages to agent Message format
   */
  toAgentMessages(dbMessages: MessageRow[]): Message[] {
    return dbMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.tool_calls as ToolCall[] | undefined,
      toolResults: m.tool_results as ToolResult[] | undefined,
      timestamp: new Date(m.created_at),
    }));
  }

  /**
   * Generate title from first message
   */
  generateTitle(firstMessage: string): string {
    // Take first 50 chars and add ellipsis if needed
    const clean = firstMessage.replace(/\n/g, ' ').trim();
    if (clean.length <= 50) return clean;
    return clean.slice(0, 47) + '...';
  }
}
