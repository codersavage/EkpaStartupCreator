import { createProviderFromEnv, getAvailableProviders } from './providers/index.js';
import agentConfig from './agentConfig.js';
import fileStore from './fileStore.js';

// Create provider instance from environment configuration
const provider = createProviderFromEnv();

console.log(`[AI Client] Initialized with ${provider.name} provider (model: ${provider.model})`);

// Session management (in-memory storage)
const sessions = new Map(); // sessionId -> { id, title, createdAt, updatedAt }
let sessionCounter = 0;

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `session_${++sessionCounter}_${Date.now()}`;
}

/**
 * Create a new chat session
 * @param {string} title - Optional title for the session
 * @returns {{ id: string, title: string, createdAt: string, updatedAt: string }}
 */
function createSession(title = null) {
  const id = generateSessionId();
  const now = new Date().toISOString();
  
  const session = {
    id,
    title: title || `Chat ${sessions.size + 1}`,
    createdAt: now,
    updatedAt: now,
  };
  
  sessions.set(id, session);
  return session;
}

/**
 * Get all sessions
 * @returns {Array} Array of session objects sorted by updatedAt (newest first)
 */
function getSessions() {
  return Array.from(sessions.values())
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Update a session (e.g., rename)
 * @param {string} sessionId 
 * @param {{ title?: string }} updates 
 * @returns {Object|null}
 */
function updateSession(sessionId, updates) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  if (updates.title) {
    session.title = updates.title;
  }
  session.updatedAt = new Date().toISOString();
  
  return session;
}

/**
 * Delete a session and its history
 * @param {string} sessionId 
 */
function deleteSession(sessionId) {
  sessions.delete(sessionId);
  provider.clearHistory(sessionId);
}

/**
 * Get a human-readable description of a function call
 */
function getStatusMessage(name, args) {
  switch (name) {
    case 'edit_file':
      const fileName = args.path?.split('/').pop() || 'file';
      return `Editing ${fileName}...`;
    case 'read_file':
      const readFile = args.path?.split('/').pop() || 'file';
      return `Reading ${readFile}...`;
    case 'get_file_tree':
      return 'Scanning workspace...';
    default:
      return `Running ${name}...`;
  }
}

/**
 * Execute a function call and return the result
 * @param {string} name - Function name
 * @param {Object} args - Function arguments
 * @param {string} toolUseId - Tool use ID (for Claude)
 * @returns {Object} - { name, response, toolUseId }
 */
function executeFunctionCall(name, args, toolUseId = null) {
  if (name === 'edit_file') {
    const { path, content } = args;

    fileStore.setFile(path, content);
    return {
      name,
      toolUseId,
      response: {
        success: true,
        path,
        message: `File "${path}" updated successfully.`,
      },
      edited: true,
      editedPath: path,
    };
  }

  if (name === 'read_file') {
    const { path } = args;
    const content = fileStore.getFile(path);
    
    if (content === null) {
      return {
        name,
        toolUseId,
        response: { error: `File not found: "${path}"` },
        edited: false,
      };
    }

    return {
      name,
      toolUseId,
      response: { path, content },
      edited: false,
    };
  }

  if (name === 'get_file_tree') {
    const treeText = fileStore.getTreeText();
    return {
      name,
      toolUseId,
      response: { tree: treeText },
      edited: false,
    };
  }

  return {
    name,
    toolUseId,
    response: { error: `Unknown function: ${name}` },
    edited: false,
  };
}

/**
 * Send a message to a chat session and process function calls in a loop.
 * Returns { text, editedFiles }
 * @param {string} sessionId 
 * @param {string} userMessage 
 * @param {Function} onStatus - Optional callback for status updates: (status: string) => void
 * @returns {Promise<{text: string, editedFiles: string[]}>}
 */
async function chat(sessionId, userMessage, onStatus = null) {
  // Auto-create session if it doesn't exist
  if (!sessions.has(sessionId)) {
    const session = {
      id: sessionId,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.set(sessionId, session);
  }

  // Update session timestamp
  const session = sessions.get(sessionId);
  session.updatedAt = new Date().toISOString();

  const history = provider.getHistory(sessionId);
  const editedFiles = [];

  // Add user message to history
  provider.addUserMessage(history, userMessage);

  // Build system prompt with file tree context
  const fileTreeText = fileStore.getTreeText();
  const basePrompt = agentConfig.getSystemPrompt();
  const systemPrompt = `${basePrompt}\n\nCurrent workspace file tree:\n${fileTreeText}\n\nUse read_file to read specific file contents when needed. Use get_file_tree to refresh the tree if it may have changed.`;

  // Get tool declarations for this provider
  const tools = provider.getToolDeclarations();

  let maxIterations = 10;

  // Send initial status
  if (onStatus) onStatus('Thinking...');

  while (maxIterations-- > 0) {
    // Generate response from the AI
    const response = await provider.generateContent({
      systemPrompt,
      history,
      tools,
    });

    // Extract function calls
    const functionCalls = provider.extractFunctionCalls(response);

    if (functionCalls.length === 0) {
      // No function calls -- extract text and return
      const text = provider.extractText(response) || '(No response)';

      // Add assistant response to history
      provider.addAssistantMessage(history, response);

      // Auto-generate title from first user message if still default
      if (session.title === 'New Chat' && history.length <= 2) {
        // Use first 50 chars of first message as title
        session.title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
      }

      return { text, editedFiles };
    }

    // Add assistant response with function calls to history
    provider.addAssistantMessage(history, response);

    // Process each function call
    const functionResponses = [];

    for (const call of functionCalls) {
      // Send status update for each function call
      if (onStatus) {
        onStatus(getStatusMessage(call.name, call.args));
      }

      const result = executeFunctionCall(call.name, call.args, call.id);
      
      if (result.edited) {
        editedFiles.push(result.editedPath);
      }

      functionResponses.push({
        name: result.name,
        toolUseId: result.toolUseId,
        response: result.response,
      });
    }

    // Add function responses to history
    provider.addFunctionResponses(history, functionResponses);

    // Update status after processing function calls
    if (onStatus) onStatus('Thinking...');
  }

  throw new Error('Too many function call iterations');
}

/**
 * Clear conversation history for a session
 * @param {string} sessionId 
 */
function clearHistory(sessionId) {
  provider.clearHistory(sessionId);
}

/**
 * Get current provider info
 * @returns {{ name: string, model: string, availableProviders: string[] }}
 */
function getProviderInfo() {
  return {
    name: provider.name,
    model: provider.model,
    availableProviders: getAvailableProviders(),
  };
}

export default { 
  chat, 
  clearHistory, 
  getProviderInfo,
  createSession,
  getSessions,
  updateSession,
  deleteSession,
};
