import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { App } from './App'
import { QuickAdd } from './QuickAdd'

const isQuick = window.location.pathname.includes('quick')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isQuick ? <QuickAdd /> : <App />}
  </StrictMode>
)
