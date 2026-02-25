import React, { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'

type ChatRole = 'user' | 'assistant'

type Message = {
  id: string
  role: ChatRole
  content: string
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
      role: 'assistant',
      content: 'Hi, I am your AGM assistant. Ask about portfolio risk, compliance, or project status.'
    }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const historyForApi = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  )

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setError(null)

    const userMessage: Message = { id: makeId(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setSending(true)

    try {
      const res = await api.post('/assistant/chat', {
        message: text,
        history: historyForApi.slice(-12)
      })

      const reply = typeof res.data?.reply === 'string' && res.data.reply.trim()
        ? res.data.reply.trim()
        : 'I could not generate a response. Please try again.'

      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: reply }])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Assistant request failed')
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: 'I cannot reach the assistant service right now. Please try again.'
        }
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <aside className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 lg:sticky lg:top-6">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">LLM Assistant</h2>
        <p className="mt-1 text-xs text-gray-500">Ask questions about your projects.</p>
      </div>

      <div className="h-[420px] space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[90%] rounded-xl bg-gray-900 px-3 py-2 text-sm text-white'
                  : 'max-w-[90%] rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-800'
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending ? (
          <div className="flex justify-start">
            <div className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-600">Thinking…</div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3">
        {error ? <div className="mb-2 text-xs text-red-600">{error}</div> : null}
        <div className="flex gap-2">
          <textarea
            className="h-20 w-full resize-none rounded-lg border px-3 py-2 text-sm"
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <button
            className="self-end rounded-lg bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={sendMessage}
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  )
}
