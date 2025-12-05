import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import { BrowserRouter } from 'react-router-dom';
import '@/index.css'
import { EntryPoint } from '@/EntryPoint.jsx'
import AuthBootstrapper from './router/AuthBootstrapper';
import 'tldraw/tldraw.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.VITE_SUBURL}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AuthBootstrapper />
          <EntryPoint />
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </StrictMode>,
)