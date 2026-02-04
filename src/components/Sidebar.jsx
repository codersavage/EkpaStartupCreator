import { useState, useRef, useEffect } from 'react'
import { useFiles } from '../context/FileContext'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Pencil,
  Check,
  X,
  Plus,
  Lightbulb,
} from 'lucide-react'

// Helper to get display name without .md extension
function getDisplayName(name) {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

// Helper to get edit name (also without .md for user-friendly editing)
function getEditableName(name) {
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

// Helper to restore .md extension when saving
function restoreExtension(newName, originalName) {
  if (originalName.endsWith('.md') && !newName.endsWith('.md')) {
    return newName + '.md'
  }
  return newName
}

function TreeNode({ node, depth = 0, parentPath = '' }) {
  const { selectedPath, selectFile, rename } = useFiles()
  const [expanded, setExpanded] = useState(depth < 2)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = (e) => {
    e.stopPropagation()
    // For files, show name without .md extension for easier editing
    setEditName(node.type === 'file' ? getEditableName(node.name) : node.name)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditName(node.name)
  }

  const handleSubmitEdit = async () => {
    let newName = editName.trim()
    if (!newName) {
      handleCancelEdit()
      return
    }

    // For files, restore the .md extension if it was there
    if (node.type === 'file') {
      newName = restoreExtension(newName, node.name)
    }

    // Check if name actually changed
    if (newName === node.name) {
      handleCancelEdit()
      return
    }

    // For files, use the path; for folders, construct the path
    const oldPath = node.type === 'file' ? node.path : (parentPath ? `${parentPath}/${node.name}` : node.name)

    const result = await rename(oldPath, newName)
    if (result.ok) {
      setIsEditing(false)
    } else {
      handleCancelEdit()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmitEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Allow editing for idea folders and everything below them
  const canEdit = true

  const isIdea = node.type === 'idea'
  const isFolder = node.type === 'folder' || isIdea

  if (isFolder) {
    const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name

    return (
      <div>
        <div
          className="flex items-center group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isEditing ? (
            <div
              className="flex items-center gap-1 flex-1 px-2 py-1"
              style={{ paddingLeft: `${depth * 12 + 4}px` }}
            >
              <span className="w-4 h-4 shrink-0" />
              {isIdea ? (
                <Lightbulb className="w-4 h-4 shrink-0 text-amber-500" />
              ) : (
                <Folder className="w-4 h-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleCancelEdit}
                className="flex-1 min-w-0 px-1 py-0.5 text-sm font-mono bg-white dark:bg-gray-800
                  border border-blue-500 rounded outline-none text-gray-800 dark:text-gray-200"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); handleSubmitEdit() }}
                className="p-0.5 text-green-600 hover:text-green-700"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); handleCancelEdit() }}
                className="p-0.5 text-red-500 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className={`flex items-center gap-1 flex-1 px-2 py-1 text-left
                  hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-sm font-mono
                  text-gray-800 dark:text-gray-200 transition-colors
                  ${isIdea ? 'font-semibold' : ''}`}
                style={{ paddingLeft: `${depth * 12 + 4}px` }}
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-gray-500" />
                )}
                {isIdea ? (
                  <Lightbulb className="w-4 h-4 shrink-0 text-amber-500" />
                ) : expanded ? (
                  <FolderOpen className="w-4 h-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                ) : (
                  <Folder className="w-4 h-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                )}
                <span className="truncate">{node.name}</span>
              </button>
              {canEdit && isHovered && (
                <button
                  onClick={handleStartEdit}
                  className="p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Rename"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.name}
                node={child}
                depth={depth + 1}
                parentPath={folderPath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // File node
  const isSelected = selectedPath === node.path

  return (
    <div
      className="flex items-center group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing ? (
        <div
          className="flex items-center gap-1 flex-1 px-2 py-1"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          <span className="w-4 shrink-0" />
          <FileText className="w-4 h-4 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCancelEdit}
            className="flex-1 min-w-0 px-1 py-0.5 text-sm font-mono bg-white dark:bg-gray-800
              border border-blue-500 rounded outline-none text-gray-800 dark:text-gray-200"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); handleSubmitEdit() }}
            className="p-0.5 text-green-600 hover:text-green-700"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); handleCancelEdit() }}
            className="p-0.5 text-red-500 hover:text-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => selectFile(node.path)}
            className={`flex items-center gap-1 flex-1 px-2 py-1 text-left text-sm font-mono
              rounded transition-colors
              ${
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <span className="w-4 shrink-0" />
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{getDisplayName(node.name)}</span>
          </button>
          {isHovered && (
            <button
              onClick={handleStartEdit}
              className="p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Rename"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { tree, createNewIdea } = useFiles()

  const handleAddIdea = async () => {
    await createNewIdea()
  }

  if (!tree) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          Explorer
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          Loading...
        </div>
      </div>
    )
  }

  // tree is { name: 'Workspace', type: 'root', children: [...idea folders] }
  const ideaFolders = tree.children || []

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Explorer
        </span>
        <button
          onClick={handleAddIdea}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
            hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="New Idea"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {ideaFolders.map((ideaNode) => (
          <TreeNode key={ideaNode.name} node={ideaNode} depth={0} parentPath="" />
        ))}
      </div>
    </div>
  )
}
