import { useState } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { FileProvider } from './context/FileContext'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import ChatPane from './components/ChatPane'
import { Sun, Moon, PanelLeft, PanelRight } from 'lucide-react'

function AppLayout() {
  const { dark, toggle } = useTheme()
  const [showSidebar, setShowSidebar] = useState(true)
  const [showChat, setShowChat] = useState(true)

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Top bar — minimal */}
      <header className="flex items-center justify-between px-4 h-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`p-1 rounded transition-colors ${showSidebar ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            title="Toggle explorer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">
            ekpa
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Toggle theme"
          >
            {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-1 rounded transition-colors ${showChat ? 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400'}`}
            title="Toggle agents"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <div className="w-60 shrink-0 overflow-hidden">
            <Sidebar />
          </div>
        )}

        <div className="flex-1 min-w-0 overflow-hidden">
          <Editor />
        </div>

        {showChat && (
          <div className="w-80 shrink-0 overflow-hidden">
            <ChatPane />
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <FileProvider>
        <AppLayout />
      </FileProvider>
    </ThemeProvider>
  )
}
