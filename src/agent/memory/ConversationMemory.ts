/**
 * Conversation Memory
 * Manages conversation history for the agent
 */

import type { Message, Conversation } from '../../types/agent';

const MAX_HISTORY_MESSAGES = 20;

/**
 * In-memory conversation store (for MVP)
 * Will be replaced with Supabase in Phase 3
 */
export class ConversationMemory {
  private conversations: Map<string, Conversation> = new Map();

  /**
   * Get or create a conversation
   */
  getOrCreate(conversationId: string, userId?: string): Conversation {
    let conversation = this.conversations.get(conversationId);

    if (!conversation) {
      conversation = {
        id: conversationId,
        userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.conversations.set(conversationId, conversation);
    }

    return conversation;
  }

  /**
   * Get conversation history
   */
  getHistory(conversationId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    // Return last N messages for context window
    return conversation.messages.slice(-MAX_HISTORY_MESSAGES);
  }

  /**
   * Add a message to conversation
   */
  addMessage(conversationId: string, message: Message): void {
    const conversation = this.getOrCreate(conversationId);
    conversation.messages.push({
      ...message,
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: message.timestamp || new Date(),
    });
    conversation.updatedAt = new Date();
  }

  /**
   * Save user message and assistant response
   */
  save(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
    toolCalls?: Message['toolCalls'],
    toolResults?: Message['toolResults']
  ): void {
    // Save user message
    this.addMessage(conversationId, {
      role: 'user',
      content: userMessage,
    });

    // Save tool results if any
    if (toolResults && toolResults.length > 0) {
      this.addMessage(conversationId, {
        role: 'tool',
        content: '',
        toolResults,
      });
    }

    // Save assistant response
    this.addMessage(conversationId, {
      role: 'assistant',
      content: assistantMessage,
      toolCalls,
    });
  }

  /**
   * Get all conversations for a user
   */
  getUserConversations(userId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Delete a conversation
   */
  delete(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  /**
   * Clear all conversations (for testing)
   */
  clear(): void {
    this.conversations.clear();
  }
}

/**
 * Singleton memory instance for the application
 */
let memoryInstance: ConversationMemory | null = null;

export function getMemory(): ConversationMemory {
  if (!memoryInstance) {
    memoryInstance = new ConversationMemory();
  }
  return memoryInstance;
}
