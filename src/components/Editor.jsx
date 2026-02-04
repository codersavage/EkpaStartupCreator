import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Edit3, Eye, Save, Check, Lightbulb, ArrowRight } from 'lucide-react'
import { useFiles } from '../context/FileContext'
import { saveFile } from '../api/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Editor() {
  const { selectedPath, fileContent, loading, closeFile, refreshFiles } = useFiles()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saved' | 'error' | null

  // Sync edit content when file content changes
  useEffect(() => {
    if (fileContent) {
      setEditContent(fileContent)
    }
  }, [fileContent])

  // Reset editing state when file changes
  useEffect(() => {
    setIsEditing(false)
    setSaveStatus(null)
  }, [selectedPath])

  const handleSave = useCallback(async () => {
    if (!selectedPath || editContent === fileContent) return

    setIsSaving(true)
    setSaveStatus(null)
    try {
      await saveFile(selectedPath, editContent)
      await refreshFiles([selectedPath])
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (err) {
      console.error('Failed to save:', err)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }, [selectedPath, editContent, fileContent, refreshFiles])

  // Auto-save on blur when editing
  const handleBlur = useCallback(() => {
    if (editContent !== fileContent) {
      handleSave()
    }
  }, [editContent, fileContent, handleSave])

  // Keyboard shortcut: Cmd/Ctrl + S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isEditing) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, handleSave])

  if (!selectedPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center max-w-xs">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Select a file to view and edit
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            The right agent will appear automatically
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-300 dark:text-gray-600">
            <span>Open file</span>
            <ArrowRight className="w-3 h-3" />
            <span>Agent helps</span>
            <ArrowRight className="w-3 h-3" />
            <span>Iterate</span>
          </div>
        </div>
      </div>
    )
  }

  const hasChanges = editContent !== fileContent

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Tab bar — minimal */}
      <div className="flex items-center h-9 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-1.5 px-3">
          <button
            onClick={closeFile}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Close file"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
          {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes" />}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 px-3">
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Failed</span>
          )}

          {isEditing && hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded
                bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300
                text-white dark:text-gray-900 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          )}

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded transition-colors
              ${isEditing
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
          >
            {isEditing ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            {isEditing ? 'Preview' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Editor content area */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : !fileContent ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 dark:text-gray-500">File not found.</p>
          </div>
        ) : isEditing ? (
          <div className="flex h-full">
            <div className="flex-1 border-r border-gray-200 dark:border-gray-700">
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                Markdown
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleBlur}
                className="w-full h-[calc(100%-28px)] p-4 font-mono text-sm resize-none
                  bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                  focus:outline-none leading-relaxed"
                placeholder="Write your markdown here..."
                spellCheck={false}
              />
            </div>

            <div className="flex-1 overflow-auto">
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                Preview
              </div>
              <div className="p-6">
                <MarkdownContent content={editContent} />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-auto h-full">
            <MarkdownContent content={fileContent} />
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownContent({ content }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none
      prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
      prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700 prose-h1:pb-2
      prose-h2:text-xl prose-h2:mt-6
      prose-h3:text-lg
      prose-p:text-gray-700 dark:prose-p:text-gray-300
      prose-li:text-gray-700 dark:prose-li:text-gray-300
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100
      prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
      prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800
      prose-table:border-collapse prose-table:w-full
      prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:px-3 prose-th:py-2 prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:text-left prose-th:font-semibold
      prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-3 prose-td:py-2
      prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
