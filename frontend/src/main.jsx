import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'tldraw/tldraw.css'
import '@/index.css'
import Canvas from '@/components/pages/canvas/canvas'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Canvas />
  </StrictMode>,
)

