import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, FileEdit, Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { useChat } from '../hooks/useChat'

export default function ChatPane() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    switchSession,
    newSession,
    removeSession,
    messages,
    loading,
    status,
    send,
    clear
  } = useChat()

  const [input, setInput] = useState('')
  const [showSessions, setShowSessions] = useState(true)
  const [agentMode, setAgentMode] = useState('copilot') // 'copilot' or 'devils_advocate'
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    send(text, agentMode)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation()
    if (sessions.length > 1 || confirm('Delete this chat? A new one will be created.')) {
      removeSession(sessionId)
    }
  }

  if (!activeSession) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Sessions Sidebar */}
      {showSessions && (
        <div className="w-48 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
          {/* New Chat Button */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={newSession}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium
                bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900
                rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto py-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                className={`group flex items-center gap-2 px-3 py-2 mx-1 my-0.5 rounded-lg cursor-pointer transition-colors
                  ${session.id === activeSessionId 
                    ? 'bg-gray-200 dark:bg-gray-700' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                  {session.title}
                </span>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={showSessions ? 'Hide sessions' : 'Show sessions'}
            >
              {showSessions ? (
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${agentMode === 'devils_advocate' ? 'bg-red-500' : 'bg-blue-500'}`} />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                {activeSession.title}
              </span>
            </div>
          </div>
        </div>

        {/* Agent Mode Toggle */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-1">
            <button
              onClick={() => setAgentMode('copilot')}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                agentMode === 'copilot'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Copilot
            </button>
            <button
              onClick={() => setAgentMode('devils_advocate')}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                agentMode === 'devils_advocate'
                  ? 'bg-red-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Devil's Advocate
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'agent' && (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  agentMode === 'devils_advocate'
                    ? 'bg-red-100 dark:bg-red-900/40'
                    : 'bg-blue-100 dark:bg-blue-900/40'
                }`}>
                  <Bot className={`w-3.5 h-3.5 ${
                    agentMode === 'devils_advocate'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
              )}
              <div className="max-w-[85%] min-w-0">
                <div
                  className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden
                    ${
                      msg.role === 'user'
                        ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700'
                    }`}
                >
                  {msg.text}
                </div>
                {msg.editedFiles?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {msg.editedFiles.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full
                          bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 break-all"
                      >
                        <FileEdit className="w-3 h-3 shrink-0" />
                        <span className="truncate">{f.split('/').pop().replace(/\.md$/, '')}</span>
                      </span>
                    ))}
                  </div>
                )}
                {msg.memoryUsed?.length > 0 && (
                  <div className="mt-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Memory Used: {msg.memoryUsed.length} {msg.memoryUsed.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                agentMode === 'devils_advocate'
                  ? 'bg-red-100 dark:bg-red-900/40'
                  : 'bg-blue-100 dark:bg-blue-900/40'
              }`}>
                <Bot className={`w-3.5 h-3.5 ${
                  agentMode === 'devils_advocate'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div className="bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 rounded-xl px-3 py-2 text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {status || 'Thinking...'}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              placeholder={agentMode === 'devils_advocate' ? 'Challenge me...' : 'Message assistant...'}
              className="flex-1 px-3 py-2 text-sm rounded-xl resize-none
                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                ring-1 ring-gray-200 dark:ring-gray-700
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50
                disabled:opacity-50 transition-all"
              style={{ minHeight: '38px', maxHeight: '120px' }}
              onInput={(e) => {
                e.target.style.height = '38px'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-xl bg-gray-800 dark:bg-gray-200
                hover:bg-gray-700 dark:hover:bg-gray-300
                text-white dark:text-gray-900
                transition-colors focus:outline-none
                disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
