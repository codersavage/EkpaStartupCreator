/**
 * Base class for AI model providers.
 * All providers must implement the abstract methods defined here.
 */
export default class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.histories = new Map();
  }

  /**
   * Get the provider name (for logging/debugging)
   * @returns {string}
   */
  get name() {
    throw new Error('Provider must implement name getter');
  }

  /**
   * Get the current model being used
   * @returns {string}
   */
  get model() {
    throw new Error('Provider must implement model getter');
  }

  /**
   * Get tool declarations in the format required by this provider
   * @returns {Object} Provider-specific tool declarations
   */
  getToolDeclarations() {
    throw new Error('Provider must implement getToolDeclarations()');
  }

  /**
   * Get conversation history for an agent
   * @param {string} agentId 
   * @returns {Array}
   */
  getHistory(agentId) {
    if (!this.histories.has(agentId)) {
      this.histories.set(agentId, []);
    }
    return this.histories.get(agentId);
  }

  /**
   * Clear conversation history for an agent
   * @param {string} agentId 
   */
  clearHistory(agentId) {
    this.histories.set(agentId, []);
  }

  /**
   * Send a message and get a response from the model
   * @param {Object} options
   * @param {string} options.systemPrompt - System instruction
   * @param {Array} options.history - Conversation history
   * @param {Object} options.tools - Tool declarations
   * @returns {Promise<Object>} - { parts: Array, raw: Object }
   */
  async generateContent(options) {
    throw new Error('Provider must implement generateContent()');
  }

  /**
   * Add a user message to history in provider-specific format
   * @param {Array} history 
   * @param {string} message 
   */
  addUserMessage(history, message) {
    throw new Error('Provider must implement addUserMessage()');
  }

  /**
   * Add an assistant/model response to history in provider-specific format
   * @param {Array} history 
   * @param {Object} response 
   */
  addAssistantMessage(history, response) {
    throw new Error('Provider must implement addAssistantMessage()');
  }

  /**
   * Add function/tool responses to history in provider-specific format
   * @param {Array} history 
   * @param {Array} functionResponses 
   */
  addFunctionResponses(history, functionResponses) {
    throw new Error('Provider must implement addFunctionResponses()');
  }

  /**
   * Extract function calls from the response
   * @param {Object} response 
   * @returns {Array} - Array of { name, args } objects
   */
  extractFunctionCalls(response) {
    throw new Error('Provider must implement extractFunctionCalls()');
  }

  /**
   * Extract text content from the response
   * @param {Object} response 
   * @returns {string}
   */
  extractText(response) {
    throw new Error('Provider must implement extractText()');
  }

  /**
   * Check if the response indicates the model wants to stop (no more function calls)
   * @param {Object} response 
   * @returns {boolean}
   */
  shouldStop(response) {
    return this.extractFunctionCalls(response).length === 0;
  }
}
