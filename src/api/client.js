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

/** Send a chat message to a session */
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
