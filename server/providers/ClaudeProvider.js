import Anthropic from '@anthropic-ai/sdk';
import BaseProvider from './BaseProvider.js';

/**
 * Claude (Anthropic) AI provider implementation
 */
export default class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    
    const apiKey = config.apiKey || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is required for Claude provider');
    }
    
    this.client = new Anthropic({ apiKey });
    this._model = config.model || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
  }

  get name() {
    return 'claude';
  }

  get model() {
    return this._model;
  }

  getToolDeclarations() {
    // Claude uses a different tool format than Gemini
    return [
      {
        name: 'edit_file',
        description:
          'Edit or create a file in the startup workspace. Use this to write or update markdown documents.',
        input_schema: {
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
        input_schema: {
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
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  async generateContent({ systemPrompt, history, tools }) {
    const response = await this.client.messages.create({
      model: this._model,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      tools: tools,
      messages: history,
    });

    if (!response.content) {
      throw new Error('No response from Claude');
    }

    return {
      parts: response.content,
      stopReason: response.stop_reason,
      raw: response,
    };
  }

  addUserMessage(history, message) {
    history.push({
      role: 'user',
      content: [{ type: 'text', text: message }],
    });
  }

  addAssistantMessage(history, response) {
    history.push({
      role: 'assistant',
      content: response.parts,
    });
  }

  addFunctionResponses(history, functionResponses) {
    const content = functionResponses.map((fr) => ({
      type: 'tool_result',
      tool_use_id: fr.toolUseId,
      content: JSON.stringify(fr.response),
    }));
    history.push({ role: 'user', content });
  }

  extractFunctionCalls(response) {
    const calls = [];
    for (const block of response.parts) {
      if (block.type === 'tool_use') {
        calls.push({
          id: block.id,  // Claude provides tool_use_id
          name: block.name,
          args: block.input,
        });
      }
    }
    return calls;
  }

  extractText(response) {
    const textBlocks = response.parts
      .filter((block) => block.type === 'text')
      .map((block) => block.text);
    return textBlocks.join('\n') || '';
  }

  shouldStop(response) {
    // Claude signals it's done with tool calls via stop_reason
    return response.stopReason === 'end_turn' || 
           this.extractFunctionCalls(response).length === 0;
  }
}
