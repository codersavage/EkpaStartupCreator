import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchFileTree, fetchFile, renameFile, createIdea as createIdeaApi } from '../api/client'

const FileContext = createContext(null)

export function FileProvider({ children }) {
  const [tree, setTree] = useState(null)
  const [selectedPath, setSelectedPath] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch tree on mount
  useEffect(() => {
    fetchFileTree()
      .then(setTree)
      .catch((err) => console.error('Failed to load file tree:', err))
  }, [])

  // Load file content when selection changes
  useEffect(() => {
    if (!selectedPath) {
      setFileContent(null)
      return
    }
    setLoading(true)
    fetchFile(selectedPath)
      .then((content) => setFileContent(content))
      .catch((err) => {
        console.error('Failed to load file:', err)
        setFileContent(null)
      })
      .finally(() => setLoading(false))
  }, [selectedPath])

  // Refresh tree and currently open file after agent edits
  const refreshFiles = useCallback(
    async (editedPaths = []) => {
      try {
        const newTree = await fetchFileTree()
        setTree(newTree)

        // Reload current file if it was edited
        if (selectedPath && editedPaths.includes(selectedPath)) {
          const content = await fetchFile(selectedPath)
          setFileContent(content)
        }
      } catch (err) {
        console.error('Failed to refresh files:', err)
      }
    },
    [selectedPath]
  )

  const selectFile = useCallback((path) => {
    setSelectedPath(path)
  }, [])

  const closeFile = useCallback(() => {
    setSelectedPath(null)
    setFileContent(null)
  }, [])

  // Create a new idea
  const createNewIdea = useCallback(async () => {
    try {
      const result = await createIdeaApi()
      const newTree = await fetchFileTree()
      setTree(newTree)
      return { ok: true, ideaName: result.ideaName }
    } catch (err) {
      console.error('Failed to create idea:', err)
      return { ok: false, error: err.message }
    }
  }, [])

  // Rename a file or folder
  const rename = useCallback(
    async (oldPath, newName) => {
      try {
        // Calculate new path by replacing just the name part
        const parts = oldPath.split('/')
        parts[parts.length - 1] = newName
        const newPath = parts.join('/')

        await renameFile(oldPath, newPath)
        
        // Refresh the tree
        const newTree = await fetchFileTree()
        setTree(newTree)

        // Update selected path if the renamed item was selected or is a parent
        if (selectedPath) {
          if (selectedPath === oldPath) {
            setSelectedPath(newPath)
          } else if (selectedPath.startsWith(oldPath + '/')) {
            // File is inside renamed folder
            setSelectedPath(selectedPath.replace(oldPath, newPath))
          }
        }

        return { ok: true }
      } catch (err) {
        console.error('Failed to rename:', err)
        return { ok: false, error: err.message }
      }
    },
    [selectedPath]
  )

  return (
    <FileContext.Provider
      value={{
        tree,
        selectedPath,
        fileContent,
        loading,
        selectFile,
        closeFile,
        refreshFiles,
        rename,
        createNewIdea,
      }}
    >
      {children}
    </FileContext.Provider>
  )
}

export function useFiles() {
  const ctx = useContext(FileContext)
  if (!ctx) throw new Error('useFiles must be used within a FileProvider')
  return ctx
}
