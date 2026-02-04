import { GoogleGenAI } from '@google/genai';
import agentConfig from './agentConfig.js';
import fileStore from './fileStore.js';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Tool declarations
const tools = {
  functionDeclarations: [
    {
      name: 'edit_file',
      description:
        'Edit or create a file in the startup workspace. Use this to write or update markdown documents.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'The file path relative to the workspace root, e.g. "Idea 1/MVP/features.md"',
          },
          content: {
            type: 'string',
            description: 'The full new content for the file (markdown)',
          },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'read_file',
      description:
        'Read the content of a file in the startup workspace. Use this to check what a file currently contains before editing.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description:
              'The file path relative to the workspace root, e.g. "Idea 1/research/research.md"',
          },
        },
        required: ['path'],
      },
    },
    {
      name: 'get_file_tree',
      description:
        'Get the full workspace file tree structure as plain text. Use this to see all available ideas, folders, and files.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  ],
};

// Per-agent chat histories (agentId -> contents array)
const histories = new Map();

function getHistory(agentId) {
  if (!histories.has(agentId)) {
    histories.set(agentId, []);
  }
  return histories.get(agentId);
}

function clearHistory(agentId) {
  histories.set(agentId, []);
}

/**
 * Send a message to an agent and process function calls in a loop.
 * Returns { text, editedFiles }
 */
async function chat(agentId, userMessage) {
  const agent = agentConfig.getAgent(agentId);
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);

  const history = getHistory(agentId);
  const editedFiles = [];

  // Append user message
  history.push({ role: 'user', parts: [{ text: userMessage }] });

  // Build lightweight file tree overview for system prompt
  const fileTreeText = fileStore.getTreeText();

  const systemInstruction = `${agent.systemPrompt}\n\nCurrent workspace file tree:\n${fileTreeText}\n\nUse read_file to read specific file contents when needed. Use get_file_tree to refresh the tree if it may have changed.`;

  let maxIterations = 10;

  while (maxIterations-- > 0) {
    const response = await genai.models.generateContent({
      model,
      contents: history,
      config: {
        systemInstruction,
        tools: [tools],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error('No response from Gemini');

    const parts = candidate.content?.parts || [];

    // Check for function calls
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      // No function calls -- extract text and return
      const textParts = parts.filter((p) => p.text).map((p) => p.text);
      const text = textParts.join('\n') || '(No response)';

      // Append assistant response to history
      history.push({ role: 'model', parts });

      return { text, editedFiles };
    }

    // Process function calls
    // First, append the model's response (with function calls) to history
    history.push({ role: 'model', parts });

    const functionResponses = [];

    for (const part of functionCalls) {
      const { name, args } = part.functionCall;

      if (name === 'edit_file') {
        const { path, content } = args;

        // Permission check
        if (!agentConfig.isPathAllowed(agentId, path)) {
          functionResponses.push({
            functionResponse: {
              name: 'edit_file',
              response: {
                error: `Permission denied: ${agent.label} agent cannot edit "${path}". Only these paths are allowed: ${agent.allowedPaths.join(', ')}`,
              },
            },
          });
        } else {
          fileStore.setFile(path, content);
          editedFiles.push(path);
          functionResponses.push({
            functionResponse: {
              name: 'edit_file',
              response: {
                success: true,
                path,
                message: `File "${path}" updated successfully.`,
              },
            },
          });
        }
      } else if (name === 'read_file') {
        const { path } = args;
        const content = fileStore.getFile(path);
        if (content === null) {
          functionResponses.push({
            functionResponse: {
              name: 'read_file',
              response: {
                error: `File not found: "${path}"`,
              },
            },
          });
        } else {
          functionResponses.push({
            functionResponse: {
              name: 'read_file',
              response: {
                path,
                content,
              },
            },
          });
        }
      } else if (name === 'get_file_tree') {
        const treeText = fileStore.getTreeText();
        functionResponses.push({
          functionResponse: {
            name: 'get_file_tree',
            response: {
              tree: treeText,
            },
          },
        });
      } else {
        functionResponses.push({
          functionResponse: {
            name,
            response: { error: `Unknown function: ${name}` },
          },
        });
      }
    }

    // Append function responses to history
    history.push({ role: 'user', parts: functionResponses });
  }

  throw new Error('Too many function call iterations');
}

export default { chat, clearHistory };
