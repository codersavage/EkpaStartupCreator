// File store with disk persistence
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Lazy import to avoid circular dependency issues
let memoryStore = null;
async function getMemoryStore() {
  if (!memoryStore) {
    memoryStore = (await import('./memoryStore.js')).default;
  }
  return memoryStore;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Workspace directory for persistent storage
const WORKSPACE_DIR = path.join(__dirname, '..', 'workspace');

// In-memory cache
const files = new Map();

let ideaCounter = 1;

// Template files for a new idea
function getIdeaTemplate(ideaName) {
  return {
    [`${ideaName}/research/research.md`]: `# Research

## Market Research
- (Add your market research here)

## Competitor Analysis
- (Analyze your competitors)

## Key Insights
- (Record key findings)
`,

    [`${ideaName}/research/assumptions.md`]: `# Assumptions

## Untested Assumptions
- (List your assumptions here)
- (Each assumption should be testable)

## Testing Strategy
- (How will you validate each assumption?)
`,

    [`${ideaName}/MVP/features.md`]: `# Feature List

## Core Features
- (Add your features here)

## Nice-to-Have
- (Future features)
`,

    [`${ideaName}/customers/outreach.md`]: `# Customer Outreach

## Target Contacts
| Name | Company | Role | Status |
|------|---------|------|--------|
| (Add contacts here) | | | |

## Outreach Log
| Date | Contact | Channel | Notes |
|------|---------|---------|-------|
| (Log your outreach here) | | | |
`,

    [`${ideaName}/customers/feedback.md`]: `# Customer Feedback

## Feedback Entries
- (Record customer feedback here)

## Common Themes
- (Identify patterns in feedback)

## Interview Notes
### (Interview Subject - Date)
- Key takeaways:
- Pain points:
- Feature requests:
`,

    [`${ideaName}/product/current_product.md`]: `# Current Product

## Overview
- (Describe your current product)

## Tech Stack
- (Define your tech stack)

## Architecture
- (Describe your system architecture)

## Development Specs
- (Define technical requirements)
`,
  };
}

// Ensure workspace directory exists
function ensureWorkspaceDir() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
}

// Load all files from workspace directory into memory
function loadFromDisk() {
  ensureWorkspaceDir();
  
  function walkDir(dir, basePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        walkDir(fullPath, relativePath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files.set(relativePath, content);
      }
    }
  }
  
  walkDir(WORKSPACE_DIR);
  
  // Update ideaCounter based on existing ideas
  for (const filePath of files.keys()) {
    const match = filePath.match(/^Idea (\d+)\//);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= ideaCounter) {
        ideaCounter = num;
      }
    }
  }
}

// Save a file to disk
function saveToDisk(relativePath, content) {
  ensureWorkspaceDir();
  const fullPath = path.join(WORKSPACE_DIR, relativePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// Delete a file from disk
function deleteFromDisk(relativePath) {
  const fullPath = path.join(WORKSPACE_DIR, relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

// Initialize: load existing files or create default
function initialize() {
  loadFromDisk();
  
  // If no files exist, create "Idea 1" with templates
  if (files.size === 0) {
    console.log('[FileStore] No existing files found, creating Idea 1...');
    const initialIdea = getIdeaTemplate('Idea 1');
    for (const [filePath, content] of Object.entries(initialIdea)) {
      files.set(filePath, content);
      saveToDisk(filePath, content);
    }
  } else {
    console.log(`[FileStore] Loaded ${files.size} files from workspace`);
  }
}

// Initialize on module load
initialize();

/** Get all files as { path: content } */
function getAll() {
  const result = {};
  for (const [filePath, content] of files) {
    result[filePath] = content;
  }
  return result;
}

/** Get file content by path */
function getFile(filePath) {
  return files.get(filePath) || null;
}

/**
 * Extract idea name from file path
 */
function extractIdeaName(filePath) {
  const parts = filePath.split('/');
  if (parts.length > 0) {
    return parts[0];
  }
  return null;
}

/**
 * Handle assumption updates
 */
async function handleAssumptionUpdate(filePath, content) {
  const ideaName = extractIdeaName(filePath);
  if (!ideaName) return;

  // Parse markdown bullet points
  const lines = content.split('\n');
  const assumptions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines starting with - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.substring(2).trim();
      // Skip empty lines and section headers in parentheses
      if (text && !text.startsWith('(') && text.length > 5) {
        assumptions.push(text);
      }
    }
  }

  // Create memory for each new assumption
  const store = await getMemoryStore();
  for (const assumptionText of assumptions) {
    // Check if memory already exists (dedupe by summary)
    const existing = store.getAllMemories()
      .find(m => m.type === 'ASSUMPTION' && m.summary === assumptionText);

    if (!existing) {
      store.createMemory({
        type: 'ASSUMPTION',
        summary: assumptionText,
        entities: { ideas: [ideaName] },
        signals: { evidenceQuality: 'none', confidence: 0.5 },
        importance: 0.6,
        source: { kind: 'USER_ACTION', ref: filePath }
      });
      console.log(`Created ASSUMPTION memory for: ${assumptionText.substring(0, 50)}...`);
    }
  }
}

/** Set file content (create or update) - persists to disk */
function setFile(filePath, content) {
  files.set(filePath, content);
  saveToDisk(filePath, content);

  // Hook: Track assumptions
  if (filePath.includes('assumptions.md')) {
    handleAssumptionUpdate(filePath, content);
  }
}

/** Rename a file or folder - persists to disk */
function rename(oldPath, newPath) {
  // Check if it's a file rename
  if (files.has(oldPath)) {
    const content = files.get(oldPath);
    files.delete(oldPath);
    deleteFromDisk(oldPath);
    files.set(newPath, content);
    saveToDisk(newPath, content);
    return { renamed: [{ from: oldPath, to: newPath }] };
  }

  // Check if it's a folder rename (oldPath is a prefix)
  const oldPrefix = oldPath.endsWith('/') ? oldPath : oldPath + '/';
  const newPrefix = newPath.endsWith('/') ? newPath : newPath + '/';

  const renamed = [];
  const toRename = [];

  for (const filePath of files.keys()) {
    if (filePath.startsWith(oldPrefix)) {
      toRename.push(filePath);
    }
  }

  for (const filePath of toRename) {
    const content = files.get(filePath);
    const updatedPath = newPrefix + filePath.slice(oldPrefix.length);
    files.delete(filePath);
    deleteFromDisk(filePath);
    files.set(updatedPath, content);
    saveToDisk(updatedPath, content);
    renamed.push({ from: filePath, to: updatedPath });
  }

  return { renamed };
}

/** Create a new idea with template files. Returns the idea name. */
function createIdea() {
  ideaCounter++;
  const ideaName = `Idea ${ideaCounter}`;
  const template = getIdeaTemplate(ideaName);
  for (const [filePath, content] of Object.entries(template)) {
    files.set(filePath, content);
    saveToDisk(filePath, content);
  }
  return ideaName;
}

// Custom folder order within an idea (lower number = higher in list)
const folderOrder = {
  'research': 1,
  'MVP': 2,
  'product': 3,
  'customers': 4,
};

function getFolderPriority(name) {
  return folderOrder[name] ?? 100;
}

/** Build a nested tree structure for the sidebar */
function getTree() {
  const root = { name: 'Workspace', type: 'root', children: [] };

  const sortedPaths = [...files.keys()].sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        current.children.push({
          name: part,
          type: 'file',
          path: filePath,
        });
      } else {
        let folder = current.children.find(
          (c) => (c.type === 'folder' || c.type === 'idea') && c.name === part
        );
        if (!folder) {
          // First-level folders are idea folders
          const type = i === 0 ? 'idea' : 'folder';
          folder = { name: part, type, children: [] };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  }

  // Sort children by custom folder order
  function sortChildren(node) {
    if (node.children) {
      node.children.sort((a, b) => {
        // Folders first, then files
        const aIsFolder = a.type === 'folder' || a.type === 'idea';
        const bIsFolder = b.type === 'folder' || b.type === 'idea';
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        
        // For folders, use custom order
        if (aIsFolder && bIsFolder) {
          const aPriority = getFolderPriority(a.name);
          const bPriority = getFolderPriority(b.name);
          if (aPriority !== bPriority) return aPriority - bPriority;
        }
        
        // Fall back to alphabetical
        return a.name.localeCompare(b.name);
      });
      
      // Recursively sort children
      for (const child of node.children) {
        sortChildren(child);
      }
    }
  }
  
  sortChildren(root);

  return root;
}

/** Get a plain-text file tree representation for agents */
function getTreeText() {
  const tree = getTree();
  const lines = [];

  function walk(node, indent = '') {
    if (node.type === 'root') {
      lines.push(node.name + '/');
      for (const child of node.children) {
        walk(child, '  ');
      }
    } else if (node.type === 'idea' || node.type === 'folder') {
      lines.push(`${indent}${node.name}/`);
      if (node.children) {
        for (const child of node.children) {
          walk(child, indent + '  ');
        }
      }
    } else {
      lines.push(`${indent}${node.name}`);
    }
  }

  walk(tree);
  return lines.join('\n');
}

export default { getAll, getFile, setFile, getTree, getTreeText, rename, createIdea };
