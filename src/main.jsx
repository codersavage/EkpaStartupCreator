import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MemoryProvider } from './context/MemoryContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MemoryProvider>
      <App />
    </MemoryProvider>
  </StrictMode>,
)
