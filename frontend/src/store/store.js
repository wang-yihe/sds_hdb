import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import canvasReducer from "@/store/slices/canvasSlice";
import globalLoaderReducer from "@/store/slices/globalLoaderSlice";
import userReducer from "@/store/slices/userSlice";
import authReducer from "@/store/slices/authSlice";
import projectReducer from "@/store/slices/projectSlice";
import aiReducer from "@/store/slices/aiSlice";
import ragReducer from "@/store/slices/ragSlice";
import videoReducer from "@/store/slices/videoSlice";

const rootReducer = combineReducers({
    rag: ragReducer,
    ai: aiReducer,
    canvas: canvasReducer,
    globalLoader: globalLoaderReducer,
    user: userReducer,
    project: projectReducer,
    auth: authReducer,
    video: videoReducer,
});

const persistConfig = {
    key: "root",
    storage,
    whitelist: ["auth"] 
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false
        }),

});

export const persistor = persistStore(store);


