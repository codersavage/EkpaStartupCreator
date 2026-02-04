import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchSessions, createSession, deleteSession, sendMessageStream, clearChat } from '../api/client'
import { useFiles } from '../context/FileContext'

const GREETING = "Hi! I'm your AI assistant for Ekpa. I can help with strategy, product development, and customer insights. What would you like to work on?"

export function useChat() {
  const { refreshFiles } = useFiles()
  const [sessions, setSessions] = useState([]) // Array of { id, title, createdAt, updatedAt }
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState({}) // sessionId -> [{role, text, editedFiles?}]
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('') // Current thinking status
  const initialized = useRef(false)

  // Initialize: fetch sessions or create first one
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    fetchSessions()
      .then((sessionList) => {
        if (sessionList.length > 0) {
          setSessions(sessionList)
          setActiveSessionId(sessionList[0].id)
          // Initialize empty messages for existing sessions
          const init = {}
          for (const s of sessionList) {
            init[s.id] = [{ role: 'agent', text: GREETING }]
          }
          setMessages(init)
        } else {
          // Create first session
          return createSession('New Chat').then((session) => {
            setSessions([session])
            setActiveSessionId(session.id)
            setMessages({ [session.id]: [{ role: 'agent', text: GREETING }] })
          })
        }
      })
      .catch((err) => console.error('Failed to initialize chat:', err))
  }, [])

  // Create a new chat session
  const newSession = useCallback(async () => {
    try {
      const session = await createSession()
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages((prev) => ({
        ...prev,
        [session.id]: [{ role: 'agent', text: GREETING }],
      }))
      return session
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }, [])

  // Delete a chat session
  const removeSession = useCallback(async (sessionId) => {
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setMessages((prev) => {
        const next = { ...prev }
        delete next[sessionId]
        return next
      })
      
      // If we deleted the active session, switch to another one
      if (sessionId === activeSessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId)
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id)
        } else {
          // Create a new session if none left
          newSession()
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }, [activeSessionId, sessions, newSession])

  // Switch to a different session
  const switchSession = useCallback((sessionId) => {
    if (sessions.some((s) => s.id === sessionId)) {
      setActiveSessionId(sessionId)
    }
  }, [sessions])

  // Send message to current session (with streaming status)
  const send = useCallback(
    async (text) => {
      if (!activeSessionId || !text.trim() || loading) return

      const userMsg = { role: 'user', text: text.trim() }
      setMessages((prev) => ({
        ...prev,
        [activeSessionId]: [...(prev[activeSessionId] || []), userMsg],
      }))
      setLoading(true)
      setStatus('Thinking...')

      try {
        const result = await sendMessageStream(
          activeSessionId, 
          text.trim(),
          (newStatus) => setStatus(newStatus) // Status callback
        )
        
        const agentMsg = {
          role: 'agent',
          text: result.text,
          editedFiles: result.editedFiles,
        }
        setMessages((prev) => ({
          ...prev,
          [activeSessionId]: [...(prev[activeSessionId] || []), agentMsg],
        }))

        // Update session title if it was auto-generated
        setSessions((prev) => prev.map((s) => {
          if (s.id === activeSessionId && s.title === 'New Chat') {
            return { ...s, title: text.trim().slice(0, 40) + (text.length > 40 ? '...' : '') }
          }
          return s
        }))

        // Refresh files if any were edited
        if (result.editedFiles?.length > 0) {
          await refreshFiles(result.editedFiles)
        }
      } catch (err) {
        const errorMsg = {
          role: 'agent',
          text: `Error: ${err.message}`,
        }
        setMessages((prev) => ({
          ...prev,
          [activeSessionId]: [...(prev[activeSessionId] || []), errorMsg],
        }))
      } finally {
        setLoading(false)
        setStatus('')
      }
    },
    [activeSessionId, loading, refreshFiles]
  )

  // Clear current session's chat
  const clear = useCallback(async () => {
    if (!activeSessionId) return
    try {
      await clearChat(activeSessionId)
      setMessages((prev) => ({
        ...prev,
        [activeSessionId]: [{ role: 'agent', text: 'Chat cleared. How can I help?' }],
      }))
    } catch (err) {
      console.error('Failed to clear chat:', err)
    }
  }, [activeSessionId])

  // Get current session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null

  return {
    sessions,
    activeSession,
    activeSessionId,
    switchSession,
    newSession,
    removeSession,
    messages: messages[activeSessionId] || [],
    loading,
    status, // Current thinking status (e.g., "Reading file...", "Editing features.md...")
    send,
    clear,
  }
}
