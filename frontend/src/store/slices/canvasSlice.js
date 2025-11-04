import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Canvas identification
  canvasId: null,
  canvasTitle: "Untitled Canvas",
  
  // tldraw document state (this is what tldraw uses)
  tldrawDocument: null,
  
  // Save state tracking
  hasUnsavedChanges: false,
  lastSavedDocument: null,
  
  // API state
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  error: null,
  
  // Auto-save settings
  autoSave: true,
  saveInterval: 30000, // 30 seconds
};

const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    // Load canvas data from API
    setCanvasData: (state, action) => {
      const { canvasId, title, document } = action.payload;
      state.canvasId = canvasId;
      state.canvasTitle = title || "Untitled Canvas";
      state.tldrawDocument = document;
      state.lastSavedDocument = document ? JSON.parse(JSON.stringify(document)) : null;
      state.hasUnsavedChanges = false;
      state.error = null;
    },

    // Update canvas title
    setCanvasTitle: (state, action) => {
      state.canvasTitle = action.payload;
      state.hasUnsavedChanges = true;
    },

    // Update tldraw document (called when tldraw changes)
    updateTldrawDocument: (state, action) => {
      state.tldrawDocument = action.payload;
      state.hasUnsavedChanges = true;
    },

    // API state management
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setSaving: (state, action) => {
      state.isSaving = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isSaving = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Mark as saved after successful API call
    markAsSaved: (state) => {
      state.lastSavedDocument = state.tldrawDocument ? 
        JSON.parse(JSON.stringify(state.tldrawDocument)) : null;
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date().toISOString();
      state.isSaving = false;
      state.error = null;
    },

    // Auto-save settings
    setAutoSave: (state, action) => {
      state.autoSave = action.payload;
    },

    setSaveInterval: (state, action) => {
      state.saveInterval = action.payload;
    },

    // Clear canvas
    clearCanvas: (state) => {
      state.tldrawDocument = null;
      state.hasUnsavedChanges = true;
    },

    // Reset canvas
    resetCanvas: (state) => {
      return { 
        ...initialState,
        canvasId: state.canvasId,
        canvasTitle: state.canvasTitle,
      };
    },

    // Discard unsaved changes
    discardChanges: (state) => {
      state.tldrawDocument = state.lastSavedDocument ? 
        JSON.parse(JSON.stringify(state.lastSavedDocument)) : null;
      state.hasUnsavedChanges = false;
    },
  },
});

// Export actions
export const {
  setCanvasData,
  setCanvasTitle,
  updateTldrawDocument,
  setLoading,
  setSaving,
  setError,
  clearError,
  markAsSaved,
  setAutoSave,
  setSaveInterval,
  clearCanvas,
  resetCanvas,
  discardChanges,
} = canvasSlice.actions;

// Export reducer
export default canvasSlice.reducer;

// Selectors
export const selectCanvasId = (state) => state.canvas.canvasId;
export const selectCanvasTitle = (state) => state.canvas.canvasTitle;
export const selectTldrawDocument = (state) => state.canvas.tldrawDocument;
export const selectHasUnsavedChanges = (state) => state.canvas.hasUnsavedChanges;
export const selectCanvasApiState = (state) => ({
  isLoading: state.canvas.isLoading,
  isSaving: state.canvas.isSaving,
  lastSaved: state.canvas.lastSaved,
  error: state.canvas.error,
  autoSave: state.canvas.autoSave,
});
export const selectElementsForSave = (state) => ({
  canvasId: state.canvas.canvasId,
  title: state.canvas.canvasTitle,
  document: state.canvas.tldrawDocument,
});