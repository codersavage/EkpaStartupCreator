import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import memoryStore from './memoryStore.js';
import fileStore from './fileStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conversation storage (in-memory Map + disk sync)
const conversations = new Map();

// Workspace paths
const WORKSPACE_DIR = path.join(__dirname, '../workspace');
const CUSTOMERS_DIR = path.join(WORKSPACE_DIR, 'customers');
const CONVERSATIONS_JSON_PATH = path.join(CUSTOMERS_DIR, 'conversations.json');
const FEEDBACK_MD_PATH = 'customers/customer_feedback.md';

/**
 * CustomerConversation Schema:
 * {
 *   id: string,
 *   customerName: string,
 *   date: string,
 *   time: string,
 *   notes: string,
 *   potentialCustomer?: "yes" | "no",
 *   putMoneyDown?: "yes" | "no",
 *   linkedIdeas?: string[],
 *   completed: boolean,
 *   createdAt: number,
 *   updatedAt: number
 * }
 */

// Initialize customers directory and load from disk
function init() {
  if (!fs.existsSync(CUSTOMERS_DIR)) {
    fs.mkdirSync(CUSTOMERS_DIR, { recursive: true });
  }

  // Initialize customer_feedback.md if it doesn't exist
  const feedbackPath = path.join(WORKSPACE_DIR, FEEDBACK_MD_PATH);
  if (!fs.existsSync(feedbackPath)) {
    fs.writeFileSync(feedbackPath, '# Customer Feedback\n\n', 'utf-8');
  }

  loadFromDisk();
}

// Load conversations from JSON file
function loadFromDisk() {
  try {
    if (fs.existsSync(CONVERSATIONS_JSON_PATH)) {
      const data = fs.readFileSync(CONVERSATIONS_JSON_PATH, 'utf-8');
      const conversationsArray = JSON.parse(data);
      conversations.clear();
      for (const conv of conversationsArray) {
        conversations.set(conv.id, conv);
      }
      console.log(`Loaded ${conversations.size} conversations from disk`);
    }
  } catch (error) {
    console.error('Error loading conversations from disk:', error);
  }
}

// Save conversations to JSON
function saveToDisk() {
  try {
    const conversationsArray = Array.from(conversations.values());
    fs.writeFileSync(
      CONVERSATIONS_JSON_PATH,
      JSON.stringify(conversationsArray, null, 2),
      'utf-8'
    );
    console.log(`Saved ${conversationsArray.length} conversations to disk`);
  } catch (error) {
    console.error('Error saving conversations to disk:', error);
  }
}

// Create new conversation (draft)
function createConversation(data) {
  const conversation = {
    id: nanoid(),
    customerName: data.customerName || '',
    date: data.date || '',
    time: data.time || '',
    notes: data.notes || '',
    potentialCustomer: data.potentialCustomer || undefined,
    putMoneyDown: data.putMoneyDown || undefined,
    linkedIdeas: data.linkedIdeas || [],
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  conversations.set(conversation.id, conversation);
  saveToDisk();

  return conversation;
}

// Get all conversations (optionally filtered)
function getAllConversations(filters = {}) {
  let result = Array.from(conversations.values());

  // Filter by completed status
  if (filters.completed !== undefined) {
    result = result.filter(c => c.completed === filters.completed);
  }

  // Filter by potential customer
  if (filters.potentialCustomer) {
    result = result.filter(c => c.potentialCustomer === filters.potentialCustomer);
  }

  // Filter by money signal
  if (filters.putMoneyDown) {
    result = result.filter(c => c.putMoneyDown === filters.putMoneyDown);
  }

  // Filter by linked idea
  if (filters.idea) {
    result = result.filter(c => c.linkedIdeas?.includes(filters.idea));
  }

  // Sort by date (newest first)
  result.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateB - dateA;
  });

  return result;
}

// Get single conversation by ID
function getConversation(id) {
  return conversations.get(id);
}

// Update existing conversation
function updateConversation(id, updates) {
  const conversation = conversations.get(id);
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`);
  }

  const updated = {
    ...conversation,
    ...updates,
    id: conversation.id, // Prevent ID changes
    createdAt: conversation.createdAt, // Prevent createdAt changes
    completed: conversation.completed, // Prevent direct completed changes (use completeConversation)
    updatedAt: Date.now()
  };

  conversations.set(id, updated);
  saveToDisk();

  return updated;
}

// Validate conversation before completion
function validateConversation(conversation) {
  const errors = [];

  if (!conversation.customerName || conversation.customerName.trim() === '') {
    errors.push('Customer name is required');
  }

  if (!conversation.date || conversation.date.trim() === '') {
    errors.push('Date is required');
  }

  if (!conversation.time || conversation.time.trim() === '') {
    errors.push('Time is required');
  }

  if (!conversation.notes || conversation.notes.trim() === '') {
    errors.push('Notes are required');
  }

  if (!conversation.potentialCustomer) {
    errors.push('Must answer: Is this a potential customer?');
  }

  if (!conversation.putMoneyDown) {
    errors.push('Must answer: Did they put money down?');
  }

  return errors;
}

// Append conversation to customer_feedback.md
function appendToFeedbackDoc(conversation) {
  try {
    let content = fileStore.getFile(FEEDBACK_MD_PATH) || '# Customer Feedback\n\n';

    const entry = `
### ${conversation.date} - ${conversation.customerName}
- **Time**: ${conversation.time}
- **Potential Customer**: ${conversation.potentialCustomer}
- **Put Money Down**: ${conversation.putMoneyDown}
- **Linked Ideas**: ${conversation.linkedIdeas.length > 0 ? conversation.linkedIdeas.join(', ') : 'None'}
- **Notes**: ${conversation.notes}

`;

    fileStore.setFile(FEEDBACK_MD_PATH, content + entry);
    console.log(`Appended conversation to customer_feedback.md`);
  } catch (error) {
    console.error('Error appending to feedback doc:', error);
  }
}

// Complete conversation (validate + trigger side effects)
function completeConversation(id) {
  const conversation = conversations.get(id);
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`);
  }

  if (conversation.completed) {
    throw new Error(`Conversation ${id} is already completed`);
  }

  // Validate
  const errors = validateConversation(conversation);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  // Mark as completed
  conversation.completed = true;
  conversation.updatedAt = Date.now();
  saveToDisk();

  // Side effect 1: Create CUSTOMER_CONVO memory
  const moneySignal = conversation.putMoneyDown === 'yes' ? 'yes' :
                     conversation.potentialCustomer === 'yes' ? 'maybe' : 'no';

  memoryStore.createMemory({
    type: 'CUSTOMER_CONVO',
    summary: `Customer conversation: ${conversation.customerName}`,
    details: conversation.notes,
    entities: {
      customers: [conversation.customerName],
      ideas: conversation.linkedIdeas
    },
    signals: {
      moneySignal,
      evidenceQuality: conversation.putMoneyDown === 'yes' ? 'strong' : 'moderate'
    },
    importance: conversation.putMoneyDown === 'yes' ? 0.9 : 0.7,
    source: {
      kind: 'USER_ACTION',
      ref: `conversation:${id}`
    }
  });

  // Side effect 2: Append to customer_feedback.md
  appendToFeedbackDoc(conversation);

  console.log(`Completed conversation ${id}`);

  return conversation;
}

// Initialize on module load
init();

export default {
  createConversation,
  getAllConversations,
  getConversation,
  updateConversation,
  completeConversation,
  saveToDisk,
  loadFromDisk
};
