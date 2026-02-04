import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fileStore from './fileStore.js';
import aiClient from './aiClient.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ===== File Management =====

// GET /api/files -- returns file tree
app.get('/api/files', (_req, res) => {
  res.json({ tree: fileStore.getTree() });
});

// GET /api/files/*path -- returns file content
app.get('/api/files/*path', (req, res) => {
  const pathParam = req.params.path;
  const filePath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
  const content = fileStore.getFile(filePath);
  if (content === null) {
    return res.status(404).json({ error: `File not found: ${filePath}` });
  }
  res.json({ path: filePath, content });
});

// PUT /api/files/*path -- save file content
app.put('/api/files/*path', (req, res) => {
  const pathParam = req.params.path;
  const filePath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
  const { content } = req.body;
  
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }
  
  fileStore.setFile(filePath, content);
  res.json({ path: filePath, ok: true });
});

// POST /api/files/rename -- rename a file or folder
app.post('/api/files/rename', (req, res) => {
  const { oldPath, newPath } = req.body;
  
  if (!oldPath || !newPath) {
    return res.status(400).json({ error: 'oldPath and newPath are required' });
  }
  
  const result = fileStore.rename(oldPath, newPath);
  res.json(result);
});

// POST /api/ideas -- create a new idea
app.post('/api/ideas', (_req, res) => {
  const ideaName = fileStore.createIdea();
  res.json({ ideaName });
});

// ===== Chat Sessions =====

// GET /api/sessions -- list all chat sessions
app.get('/api/sessions', (_req, res) => {
  res.json({ sessions: aiClient.getSessions() });
});

// POST /api/sessions -- create a new chat session
app.post('/api/sessions', (req, res) => {
  const { title } = req.body;
  const session = aiClient.createSession(title);
  res.json(session);
});

// DELETE /api/sessions/:sessionId -- delete a chat session
app.delete('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  aiClient.deleteSession(sessionId);
  res.json({ ok: true });
});

// PUT /api/sessions/:sessionId -- update session (e.g., rename)
app.put('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { title } = req.body;
  const session = aiClient.updateSession(sessionId, { title });
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// POST /api/chat -- send message to a session
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  try {
    const result = await aiClient.chat(sessionId, message);
    res.json(result);
  } catch (err) {
    console.error(`Chat error [${sessionId}]:`, err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/chat/clear -- clear a session's chat history
app.post('/api/chat/clear', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  aiClient.clearHistory(sessionId);
  res.json({ ok: true });
});

// GET /api/provider -- get current AI provider info
app.get('/api/provider', (_req, res) => {
  res.json(aiClient.getProviderInfo());
});

app.listen(PORT, () => {
  console.log(`Ekpa server running on http://localhost:${PORT}`);
});
