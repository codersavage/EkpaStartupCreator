import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fileStore from './fileStore.js';
import aiClient from './aiClient.js';
import memoryStore from './memoryStore.js';
import conversationStore from './conversationStore.js';

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

// POST /api/chat -- send message to a session (with SSE for status updates)
app.post('/api/chat', async (req, res) => {
  const { sessionId, message, stream, mode } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  // Default to 'copilot' mode if not specified
  const agentMode = mode || 'copilot';

  // If stream mode, use Server-Sent Events
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onStatus = (status) => {
      res.write(`data: ${JSON.stringify({ type: 'status', status })}\n\n`);
    };

    try {
      const result = await aiClient.chat(sessionId, message, onStatus, agentMode);
      res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
      res.end();
    } catch (err) {
      console.error(`Chat error [${sessionId}]:`, err);
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  } else {
    // Non-streaming mode (backwards compatible)
    try {
      const result = await aiClient.chat(sessionId, message, null, agentMode);
      res.json(result);
    } catch (err) {
      console.error(`Chat error [${sessionId}]:`, err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
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

// ===== Memory Bank =====

// GET /api/memory -- list all memories (with optional filters)
app.get('/api/memory', (req, res) => {
  const { type, idea, customer, search } = req.query;
  const filters = {};
  if (type) filters.type = type;
  if (idea) filters.idea = idea;
  if (customer) filters.customer = customer;
  if (search) filters.search = search;

  const memories = memoryStore.getAllMemories(filters);
  res.json({ memories });
});

// POST /api/memory -- create new memory
app.post('/api/memory', (req, res) => {
  const { type, summary, details, entities, signals, importance, source } = req.body;

  if (!type || !summary) {
    return res.status(400).json({ error: 'type and summary are required' });
  }

  const memory = memoryStore.createMemory({
    type,
    summary,
    details,
    entities,
    signals,
    importance,
    source
  });

  res.json({ memory });
});

// GET /api/memory/:id -- get specific memory
app.get('/api/memory/:id', (req, res) => {
  const { id } = req.params;
  const memory = memoryStore.getMemory(id);

  if (!memory) {
    return res.status(404).json({ error: `Memory ${id} not found` });
  }

  res.json({ memory });
});

// PUT /api/memory/:id -- update memory
app.put('/api/memory/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const memory = memoryStore.updateMemory(id, updates);
    res.json({ memory });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/memory/retrieve -- retrieve relevant memories
app.post('/api/memory/retrieve', (req, res) => {
  const { query, context } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  const memories = memoryStore.retrieveMemory(query, context || {});
  res.json({ memories });
});

// ===== Customer Conversations =====

// GET /api/conversations -- list all conversations (with optional filters)
app.get('/api/conversations', (req, res) => {
  const { completed, potentialCustomer, putMoneyDown, idea } = req.query;
  const filters = {};

  if (completed !== undefined) filters.completed = completed === 'true';
  if (potentialCustomer) filters.potentialCustomer = potentialCustomer;
  if (putMoneyDown) filters.putMoneyDown = putMoneyDown;
  if (idea) filters.idea = idea;

  const conversations = conversationStore.getAllConversations(filters);
  res.json({ conversations });
});

// POST /api/conversations -- create new conversation
app.post('/api/conversations', (req, res) => {
  const data = req.body;
  const conversation = conversationStore.createConversation(data);
  res.json({ conversation });
});

// GET /api/conversations/:id -- get specific conversation
app.get('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  const conversation = conversationStore.getConversation(id);

  if (!conversation) {
    return res.status(404).json({ error: `Conversation ${id} not found` });
  }

  res.json({ conversation });
});

// PUT /api/conversations/:id -- update conversation
app.put('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const conversation = conversationStore.updateConversation(id, updates);
    res.json({ conversation });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/conversations/:id/complete -- complete conversation (triggers side effects)
app.post('/api/conversations/:id/complete', (req, res) => {
  const { id } = req.params;

  try {
    const conversation = conversationStore.completeConversation(id);
    res.json({ conversation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ekpa server running on http://localhost:${PORT}`);
});
