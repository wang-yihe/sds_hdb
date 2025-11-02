import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import canvasReducer from "@/store/slices/canvasSlice";

const rootReducer = combineReducers({
    canvas: canvasReducer,
});

const persistConfig = {
    key: "root",
    storage,
    whitelist: ["canvas"], 
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types from redux-persist
                ignoredActions: [
                    "persist/FLUSH",
                    "persist/REHYDRATE", 
                    "persist/PAUSE",
                    "persist/PERSIST",
                    "persist/PURGE",
                    "persist/REGISTER",
                ],
            },
        }),
    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);


