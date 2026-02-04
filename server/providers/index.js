import GeminiProvider from './GeminiProvider.js';
import ClaudeProvider from './ClaudeProvider.js';

/**
 * Available AI providers
 */
export const PROVIDERS = {
  gemini: GeminiProvider,
  claude: ClaudeProvider,
};

/**
 * Get list of available provider names
 * @returns {string[]}
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

/**
 * Create a provider instance based on the provider name
 * @param {string} providerName - 'gemini', 'claude', etc.
 * @param {Object} config - Provider-specific configuration
 * @returns {BaseProvider}
 */
export function createProvider(providerName, config = {}) {
  const normalizedName = providerName?.toLowerCase() || 'gemini';
  
  const ProviderClass = PROVIDERS[normalizedName];
  if (!ProviderClass) {
    const available = getAvailableProviders().join(', ');
    throw new Error(
      `Unknown AI provider: "${providerName}". Available providers: ${available}`
    );
  }
  
  return new ProviderClass(config);
}

/**
 * Create a provider from environment variables
 * Uses AI_PROVIDER env var to select provider (defaults to 'gemini')
 * @param {Object} overrides - Optional configuration overrides
 * @returns {BaseProvider}
 */
export function createProviderFromEnv(overrides = {}) {
  const providerName = process.env.AI_PROVIDER || 'gemini';
  
  console.log(`[AI Provider] Using ${providerName} provider`);
  
  return createProvider(providerName, overrides);
}

export { GeminiProvider, ClaudeProvider };
