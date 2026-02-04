// In-memory file store with seed content

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

// Initialize the store with "Idea 1"
const initialIdea = getIdeaTemplate('Idea 1');
for (const [path, content] of Object.entries(initialIdea)) {
  files.set(path, content);
}

/** Get all files as { path: content } */
function getAll() {
  const result = {};
  for (const [path, content] of files) {
    result[path] = content;
  }
  return result;
}

/** Get file content by path */
function getFile(path) {
  return files.get(path) || null;
}

/** Set file content (create or update) */
function setFile(path, content) {
  files.set(path, content);
}

/** Rename a file or folder */
function rename(oldPath, newPath) {
  // Check if it's a file rename
  if (files.has(oldPath)) {
    const content = files.get(oldPath);
    files.delete(oldPath);
    files.set(newPath, content);
    return { renamed: [{ from: oldPath, to: newPath }] };
  }

  // Check if it's a folder rename (oldPath is a prefix)
  const oldPrefix = oldPath.endsWith('/') ? oldPath : oldPath + '/';
  const newPrefix = newPath.endsWith('/') ? newPath : newPath + '/';

  const renamed = [];
  const toRename = [];

  for (const path of files.keys()) {
    if (path.startsWith(oldPrefix)) {
      toRename.push(path);
    }
  }

  for (const path of toRename) {
    const content = files.get(path);
    const updatedPath = newPrefix + path.slice(oldPrefix.length);
    files.delete(path);
    files.set(updatedPath, content);
    renamed.push({ from: path, to: updatedPath });
  }

  return { renamed };
}

/** Create a new idea with template files. Returns the idea name. */
function createIdea() {
  ideaCounter++;
  const ideaName = `Idea ${ideaCounter}`;
  const template = getIdeaTemplate(ideaName);
  for (const [path, content] of Object.entries(template)) {
    files.set(path, content);
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
