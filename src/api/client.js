const BASE = '/api';

// ===== File Management =====

/** Fetch the file tree */
export async function fetchFileTree() {
  const res = await fetch(`${BASE}/files`);
  if (!res.ok) throw new Error('Failed to fetch file tree');
  const data = await res.json();
  return data.tree;
}

/** Fetch a single file's content */
export async function fetchFile(path) {
  const res = await fetch(`${BASE}/files/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch file: ${path}`);
  const data = await res.json();
  return data.content;
}

/** Save a file's content */
export async function saveFile(path, content) {
  const res = await fetch(`${BASE}/files/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to save file: ${path}`);
  return res.json();
}

/** Rename a file or folder */
export async function renameFile(oldPath, newPath) {
  const res = await fetch(`${BASE}/files/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath }),
  });
  if (!res.ok) throw new Error(`Failed to rename: ${oldPath}`);
  return res.json();
}

/** Create a new idea */
export async function createIdea() {
  const res = await fetch(`${BASE}/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to create idea');
  return res.json(); // { ideaName }
}

// ===== Chat Sessions =====

/** Fetch all chat sessions */
export async function fetchSessions() {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  const data = await res.json();
  return data.sessions;
}

/** Create a new chat session */
export async function createSession(title = null) {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

/** Delete a chat session */
export async function deleteSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
}

/** Rename a chat session */
export async function renameSession(sessionId, title) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to rename session');
  return res.json();
}

/** Send a chat message to a session (non-streaming) */
export async function sendMessage(sessionId, message) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Chat request failed');
  }
  return res.json(); // { text, editedFiles }
}

/**
 * Send a chat message with streaming status updates
 * @param {string} sessionId
 * @param {string} message
 * @param {Function} onStatus - Callback for status updates: (status: string) => void
 * @param {string} mode - Agent mode: 'copilot' or 'devils_advocate'
 * @returns {Promise<{text: string, editedFiles: string[], memoryUsed?: any[]}>}
 */
export async function sendMessageStream(sessionId, message, onStatus, mode = 'copilot') {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, stream: true, mode }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Chat request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    // Parse SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'status' && onStatus) {
            onStatus(data.status);
          } else if (data.type === 'done') {
            return {
              text: data.text,
              editedFiles: data.editedFiles || [],
              memoryUsed: data.memoryUsed || []
            };
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') {
            console.error('SSE parse error:', e);
          }
        }
      }
    }
  }

  throw new Error('Stream ended without response');
}

/** Clear a session's chat history */
export async function clearChat(sessionId) {
  const res = await fetch(`${BASE}/chat/clear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Failed to clear chat');
  return res.json();
}

/** Get AI provider info */
export async function fetchProviderInfo() {
  const res = await fetch(`${BASE}/provider`);
  if (!res.ok) throw new Error('Failed to fetch provider info');
  return res.json();
}
