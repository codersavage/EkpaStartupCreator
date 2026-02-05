import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memory storage (in-memory Map + disk sync)
const memories = new Map();

// Workspace paths
const WORKSPACE_DIR = path.join(__dirname, '../workspace');
const MEMORY_DIR = path.join(WORKSPACE_DIR, 'memory');
const MEMORY_JSON_PATH = path.join(MEMORY_DIR, 'memory_bank.json');
const MEMORY_MD_PATH = path.join(MEMORY_DIR, 'memory_bank.md');

/**
 * MemoryItem Schema:
 * {
 *   id: string,
 *   createdAt: number,
 *   updatedAt: number,
 *   type: "ASSUMPTION" | "DECISION" | "CUSTOMER_CONVO" | "EVIDENCE" | "CONTRADICTION" | "LESSON" | "MILESTONE",
 *   summary: string,
 *   details?: string,
 *   entities?: {
 *     ideas?: string[],
 *     customers?: string[],
 *     artifacts?: string[],
 *     tags?: string[]
 *   },
 *   signals?: {
 *     evidenceQuality?: "none" | "weak" | "moderate" | "strong",
 *     confidence?: number,
 *     moneySignal?: "no" | "maybe" | "yes"
 *   },
 *   importance: number,
 *   source: {
 *     kind: "USER_ACTION" | "SYSTEM_RULE" | "AGENT_OUTPUT",
 *     ref?: string
 *   }
 * }
 */

// Initialize memory directory and load from disk
function init() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
  loadFromDisk();
}

// Load memories from JSON file
function loadFromDisk() {
  try {
    if (fs.existsSync(MEMORY_JSON_PATH)) {
      const data = fs.readFileSync(MEMORY_JSON_PATH, 'utf-8');
      const memoriesArray = JSON.parse(data);
      memories.clear();
      for (const mem of memoriesArray) {
        memories.set(mem.id, mem);
      }
      console.log(`Loaded ${memories.size} memories from disk`);
    }
  } catch (error) {
    console.error('Error loading memories from disk:', error);
  }
}

// Save memories to JSON and generate MD digest
function saveToDisk() {
  try {
    const memoriesArray = Array.from(memories.values());

    // Save JSON
    fs.writeFileSync(
      MEMORY_JSON_PATH,
      JSON.stringify(memoriesArray, null, 2),
      'utf-8'
    );

    // Generate MD digest
    const md = generateMarkdownDigest(memoriesArray);
    fs.writeFileSync(MEMORY_MD_PATH, md, 'utf-8');

    console.log(`Saved ${memoriesArray.length} memories to disk`);
  } catch (error) {
    console.error('Error saving memories to disk:', error);
  }
}

// Generate human-readable markdown digest
function generateMarkdownDigest(memoriesArray) {
  let md = '# Memory Bank\n\n';
  md += `Last updated: ${new Date().toISOString()}\n`;
  md += `Total memories: ${memoriesArray.length}\n\n`;

  // Group by type
  const byType = {};
  for (const mem of memoriesArray) {
    if (!byType[mem.type]) byType[mem.type] = [];
    byType[mem.type].push(mem);
  }

  for (const [type, mems] of Object.entries(byType)) {
    md += `## ${type} (${mems.length})\n\n`;

    // Sort by importance (descending) then recency
    const sorted = mems.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.createdAt - a.createdAt;
    });

    for (const mem of sorted) {
      md += `### ${mem.summary}\n`;
      md += `**ID:** ${mem.id} | **Importance:** ${mem.importance} | **Created:** ${new Date(mem.createdAt).toLocaleDateString()}\n\n`;

      if (mem.details) {
        md += `${mem.details}\n\n`;
      }

      if (mem.entities?.ideas?.length) {
        md += `**Ideas:** ${mem.entities.ideas.join(', ')}\n\n`;
      }

      if (mem.entities?.customers?.length) {
        md += `**Customers:** ${mem.entities.customers.join(', ')}\n\n`;
      }

      if (mem.signals) {
        const signals = [];
        if (mem.signals.evidenceQuality) signals.push(`Evidence: ${mem.signals.evidenceQuality}`);
        if (mem.signals.confidence !== undefined) signals.push(`Confidence: ${mem.signals.confidence}`);
        if (mem.signals.moneySignal) signals.push(`Money Signal: ${mem.signals.moneySignal}`);
        if (signals.length) md += `**Signals:** ${signals.join(', ')}\n\n`;
      }

      md += '---\n\n';
    }
  }

  return md;
}

// Create new memory
function createMemory(data) {
  const memory = {
    id: nanoid(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: data.type,
    summary: data.summary,
    details: data.details || '',
    entities: data.entities || {},
    signals: data.signals || {},
    importance: data.importance || 0.5,
    source: data.source || { kind: 'USER_ACTION' }
  };

  memories.set(memory.id, memory);
  saveToDisk();

  return memory;
}

// Get all memories (optionally filtered)
function getAllMemories(filters = {}) {
  let result = Array.from(memories.values());

  // Filter by type
  if (filters.type) {
    result = result.filter(m => m.type === filters.type);
  }

  // Filter by idea
  if (filters.idea) {
    result = result.filter(m => m.entities?.ideas?.includes(filters.idea));
  }

  // Filter by customer
  if (filters.customer) {
    result = result.filter(m => m.entities?.customers?.includes(filters.customer));
  }

  // Search by text
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(m =>
      m.summary.toLowerCase().includes(searchLower) ||
      (m.details && m.details.toLowerCase().includes(searchLower))
    );
  }

  // Sort by recency (newest first)
  result.sort((a, b) => b.createdAt - a.createdAt);

  return result;
}

// Get single memory by ID
function getMemory(id) {
  return memories.get(id);
}

// Update existing memory
function updateMemory(id, updates) {
  const memory = memories.get(id);
  if (!memory) {
    throw new Error(`Memory ${id} not found`);
  }

  const updated = {
    ...memory,
    ...updates,
    id: memory.id, // Prevent ID changes
    createdAt: memory.createdAt, // Prevent createdAt changes
    updatedAt: Date.now()
  };

  memories.set(id, updated);
  saveToDisk();

  return updated;
}

// Retrieve relevant memories based on query and context
function retrieveMemory(query, context = {}) {
  const { activeIdeas = [], maxResults = 15 } = context;
  const queryTokens = tokenize(query.toLowerCase());
  const allMemories = Array.from(memories.values());

  // Score each memory
  const scored = allMemories.map(mem => ({
    memory: mem,
    score: calculateRelevanceScore(mem, queryTokens, activeIdeas)
  }));

  // Sort by score (descending) and return top N
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map(s => ({
    id: s.memory.id,
    type: s.memory.type,
    summary: s.memory.summary,
    importance: s.memory.importance,
    entities: s.memory.entities,
    signals: s.memory.signals,
    score: s.score
  }));
}

// Calculate relevance score for memory retrieval
function calculateRelevanceScore(memory, queryTokens, activeIdeas) {
  let score = 0;

  // Importance factor (0.3 weight)
  score += memory.importance * 0.3;

  // Recency decay (0.2 weight)
  const ageInDays = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
  const recencyDecay = Math.exp(-ageInDays / 30);
  score += recencyDecay * 0.2;

  // Token overlap (0.3 weight)
  const memoryText = `${memory.summary} ${memory.details || ''}`.toLowerCase();
  const memoryTokens = tokenize(memoryText);
  const overlap = queryTokens.filter(qt => memoryTokens.includes(qt)).length;
  const tokenOverlap = queryTokens.length > 0 ? overlap / queryTokens.length : 0;
  score += tokenOverlap * 0.3;

  // Entity match boost (0.2 weight)
  let entityMatch = 0;
  if (memory.entities?.ideas) {
    const matchingIdeas = memory.entities.ideas.filter(idea => activeIdeas.includes(idea));
    entityMatch += matchingIdeas.length * 0.5;
  }
  score += Math.min(entityMatch, 1.0) * 0.2;

  return score;
}

// Simple tokenizer
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2); // Filter out short words
}

// Initialize on module load
init();

export default {
  createMemory,
  getAllMemories,
  getMemory,
  updateMemory,
  retrieveMemory,
  saveToDisk,
  loadFromDisk
};
