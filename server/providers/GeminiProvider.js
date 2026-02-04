import { GoogleGenAI } from '@google/genai';
import BaseProvider from './BaseProvider.js';

/**
 * Gemini AI provider implementation
 */
export default class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for Gemini provider');
    }
    
    this.genai = new GoogleGenAI({ apiKey });
    this._model = config.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  get name() {
    return 'gemini';
  }

  get model() {
    return this._model;
  }

  getToolDeclarations() {
    return {
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
  }

  async generateContent({ systemPrompt, history, tools }) {
    const response = await this.genai.models.generateContent({
      model: this._model,
      contents: history,
      config: {
        systemInstruction: systemPrompt,
        tools: [tools],
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini');
    }

    return {
      parts: candidate.content?.parts || [],
      raw: response,
    };
  }

  addUserMessage(history, message) {
    history.push({ role: 'user', parts: [{ text: message }] });
  }

  addAssistantMessage(history, response) {
    history.push({ role: 'model', parts: response.parts });
  }

  addFunctionResponses(history, functionResponses) {
    const parts = functionResponses.map((fr) => ({
      functionResponse: {
        name: fr.name,
        response: fr.response,
      },
    }));
    history.push({ role: 'user', parts });
  }

  extractFunctionCalls(response) {
    const calls = [];
    for (const part of response.parts) {
      if (part.functionCall) {
        calls.push({
          name: part.functionCall.name,
          args: part.functionCall.args,
        });
      }
    }
    return calls;
  }

  extractText(response) {
    const textParts = response.parts
      .filter((p) => p.text)
      .map((p) => p.text);
    return textParts.join('\n') || '';
  }
}
