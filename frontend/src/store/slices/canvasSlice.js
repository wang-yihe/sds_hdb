import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCanvas, saveCanvas, deleteCanvas, createEmptyCanvas } from "@/api/canvasAPI";

const initialState = {
    currentCanvas: null,
    loadingFlags: {
        isSaving: false,
        isAwaitingResponse: false,
    },
    lastSaved: null,
    error: null,
};

export const fetchCanvas = createAsyncThunk(
    "canvas/fetchCanvas",
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await getCanvas(projectId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || "Failed to fetch canvas");
        }
    }
);

export const saveCanvasData = createAsyncThunk(
    "canvas/saveCanvasData",
    async ({ projectId, canvasData }, { rejectWithValue }) => {
        try {
            const response = await saveCanvas(projectId, canvasData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || "Failed to save canvas");
        }
    }
);

export const deleteCanvasData = createAsyncThunk(
    "canvas/deleteCanvasData",
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await deleteCanvas(projectId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || "Failed to delete canvas");
        }
    }
);

export const createCanvas = createAsyncThunk(
    "canvas/createCanvas",
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await createEmptyCanvas(projectId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || "Failed to create canvas");
        }
    }
);

const canvasSlice = createSlice({
    name: "canvas",
    initialState,
    reducers: {
        clearCurrentCanvas: (state) => {
            state.currentCanvas = null;
            state.lastSaved = null;
            state.error = null;
        },
        updateLastSaved: (state) => {
            state.lastSaved = new Date().toISOString();
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCanvas.pending, (state) => {
                state.loadingFlags.isAwaitingResponse = true;
                state.error = null;
            })
            .addCase(fetchCanvas.fulfilled, (state, action) => {
                state.loadingFlags.isAwaitingResponse = false;
                state.currentCanvas = action.payload;
            })
            .addCase(fetchCanvas.rejected, (state, action) => {
                state.loadingFlags.isAwaitingResponse = false;
                state.error = action.payload;
            })
            .addCase(saveCanvasData.pending, (state) => {
                state.loadingFlags.isSaving = true;
                state.error = null;
            })
            .addCase(saveCanvasData.fulfilled, (state, action) => {
                state.loadingFlags.isSaving = false;
                state.lastSaved = new Date().toISOString();
            })
            .addCase(saveCanvasData.rejected, (state, action) => {
                state.loadingFlags.isSaving = false;
                state.error = action.payload;
            })
            .addCase(deleteCanvasData.pending, (state) => {
                state.loadingFlags.isSaving = true;
                state.error = null;
            })
            .addCase(deleteCanvasData.fulfilled, (state) => {
                state.loadingFlags.isSaving = false;
                state.currentCanvas = null;
                state.lastSaved = null;
            })
            .addCase(deleteCanvasData.rejected, (state, action) => {
                state.loadingFlags.isSaving = false;
                state.error = action.payload;
            })
            .addCase(createCanvas.pending, (state) => {
                state.loadingFlags.isSaving = true;
                state.error = null;
            })
            .addCase(createCanvas.fulfilled, (state, action) => {
                state.loadingFlags.isSaving = false;
                state.currentCanvas = action.payload;
            })
            .addCase(createCanvas.rejected, (state, action) => {
                state.loadingFlags.isSaving = false;
                state.error = action.payload;
            });
    },
});

export const { clearCurrentCanvas, updateLastSaved, clearError } = canvasSlice.actions;

export default canvasSlice.reducer;