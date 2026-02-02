/**
 * ChatInterface - Conversational AI tax assistant interface
 */

import { useState, useRef, useEffect, type FormEvent } from 'react'
import './ChatInterface.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface ChatResponse {
  message: string
  conversationId: string
  calculations?: {
    grossIncome: number
    newRegime: { totalTaxLiability: number }
    oldRegime: { totalTaxLiability: number }
    recommendedRegime: 'new' | 'old'
    taxSaved: number
  }
  suggestions?: string[]
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3000'

/** Example prompts for new users */
const EXAMPLE_PROMPTS = [
  "My salary is ₹15 lakhs. What's my tax?",
  "How can I save tax with investments?",
  "What is Section 80C?",
  "I pay ₹20,000 rent. Can I get deduction?",
  "Explain the difference between old and new regime",
  "When is the ITR filing deadline?",
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsLoading(true)

    // Add loading indicator
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }
    setMessages((prev) => [...prev, loadingMessage])

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `Error: ${response.status}`)
      }

      const data: ChatResponse = await response.json()

      // Save conversation ID for continuity
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Replace loading message with actual response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) =>
        prev.filter((m) => !m.isLoading).concat(assistantMessage)
      )
    } catch (err) {
      // Remove loading message and show error
      setMessages((prev) => prev.filter((m) => !m.isLoading))
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleExampleClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const clearConversation = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-title">
          <h1>TaxMate AI</h1>
          <span className="badge">AI-Powered</span>
        </div>
        <p>Your intelligent Indian tax assistant for AY 2025-26</p>
        {messages.length > 0 && (
          <button
            className="clear-btn"
            onClick={clearConversation}
            aria-label="Start new conversation"
          >
            New Chat
          </button>
        )}
      </header>

      <main className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">💬</div>
            <h2>How can I help with your taxes?</h2>
            <p>
              Ask me anything about Indian income tax — calculations, deductions,
              filing deadlines, and tax-saving tips.
            </p>
            <div className="example-prompts">
              <p className="examples-label">Try asking:</p>
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  className="example-btn"
                  onClick={() => handleExampleClick(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.role} ${msg.isLoading ? 'loading' : ''}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                {msg.isLoading ? (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <MessageContent content={msg.content} />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </main>

      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your taxes..."
            rows={1}
            disabled={isLoading}
            aria-label="Type your message"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <p className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>

      <footer className="chat-footer">
        <p>
          This is an AI assistant for informational purposes only.
          Verify with a qualified CA before filing your taxes.
        </p>
      </footer>
    </div>
  )
}

/** Render message content with basic markdown support */
function MessageContent({ content }: { content: string }) {
  // Simple markdown-like formatting
  const formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')

  return (
    <div
      className="message-text"
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  )
}

/** Send button icon */
function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

export default ChatInterface
