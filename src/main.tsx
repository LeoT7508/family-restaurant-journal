import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import { createAppRouter } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App router={createAppRouter()} />
  </StrictMode>,
)
