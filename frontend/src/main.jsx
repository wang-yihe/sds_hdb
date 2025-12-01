import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/integration/react'
import { EntryPoint } from './EntryPoint'
import { store, persistor } from '@/store/store'
import { Provider } from 'react-redux'
import AuthBootstrapper from '@/router/AuthBootstrapper'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter basename =  {import.meta.env.VITE_SUBURL}>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <AuthBootstrapper />
                    <EntryPoint />
                </PersistGate>
            </Provider>
        </BrowserRouter>
    </StrictMode>,
);
