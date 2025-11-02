import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Canvas data
  canvasId: null,
  elements: [],
  
  // Selection (local only)
  selectedElementIds: [],
  
  // Save state tracking
  hasUnsavedChanges: false,
  lastSavedElements: [], // Copy of elements at last save
  
  // API state
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  error: null,
  
  // UI state (local only)
  activeTool: "select",
  isDrawing: false,
  
  // Drawing properties (local only)
  currentFill: "#000000",
  currentStroke: "#000000",
  currentStrokeWidth: 2,
  currentFontSize: 16,
  currentFontFamily: "Arial",
  
  // History for undo/redo (local only)
  history: [[]],
  historyIndex: 0,
  
  // Auto-save settings
  autoSave: true,
  saveInterval: 30000, // 30 seconds
  autoSaveTimer: null,
};

const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    // API operations - Loading canvas data
    setCanvasData: (state, action) => {
      const { canvasId, elements } = action.payload;
      state.canvasId = canvasId;
      state.elements = elements || [];
      state.lastSavedElements = JSON.parse(JSON.stringify(elements || []));
      state.selectedElementIds = [];
      state.hasUnsavedChanges = false;
      // Reset history when loading new canvas data
      state.history = [JSON.parse(JSON.stringify(state.elements))];
      state.historyIndex = 0;
      state.error = null;
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

    // Save operations - Mark as saved
    markAsSaved: (state) => {
      state.lastSavedElements = JSON.parse(JSON.stringify(state.elements));
      state.hasUnsavedChanges = false;
      state.lastSaved = new Date().toISOString();
      state.isSaving = false;
      state.error = null;
    },

    // Helper to mark changes
    markAsChanged: (state) => {
      state.hasUnsavedChanges = true;
    },

    // Element operations (all mark as changed but don't save)
    addElement: (state, action) => {
      state.elements.push(action.payload);
      canvasSlice.caseReducers.saveToHistory(state);
      canvasSlice.caseReducers.markAsChanged(state);
    },

    updateElement: (state, action) => {
      const { id, updates } = action.payload;
      const elementIndex = state.elements.findIndex(el => el.id === id);
      if (elementIndex !== -1) {
        state.elements[elementIndex] = { ...state.elements[elementIndex], ...updates };
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    updateElements: (state, action) => {
      // Bulk update for multiple elements
      let hasChanges = false;
      action.payload.forEach(({ id, updates }) => {
        const elementIndex = state.elements.findIndex(el => el.id === id);
        if (elementIndex !== -1) {
          state.elements[elementIndex] = { ...state.elements[elementIndex], ...updates };
          hasChanges = true;
        }
      });
      if (hasChanges) {
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    deleteElement: (state, action) => {
      const elementExists = state.elements.some(el => el.id === action.payload);
      if (elementExists) {
        state.elements = state.elements.filter(el => el.id !== action.payload);
        state.selectedElementIds = state.selectedElementIds.filter(id => id !== action.payload);
        canvasSlice.caseReducers.saveToHistory(state);
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    deleteSelectedElements: (state) => {
      const elementsToDelete = state.selectedElementIds.length;
      if (elementsToDelete > 0) {
        state.elements = state.elements.filter(el => !state.selectedElementIds.includes(el.id));
        state.selectedElementIds = [];
        canvasSlice.caseReducers.saveToHistory(state);
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    setElements: (state, action) => {
      state.elements = action.payload;
      canvasSlice.caseReducers.saveToHistory(state);
      canvasSlice.caseReducers.markAsChanged(state);
    },

    // Selection operations (local only, no save needed)
    selectElement: (state, action) => {
      state.selectedElementIds = [action.payload];
    },

    addToSelection: (state, action) => {
      if (!state.selectedElementIds.includes(action.payload)) {
        state.selectedElementIds.push(action.payload);
      }
    },

    removeFromSelection: (state, action) => {
      state.selectedElementIds = state.selectedElementIds.filter(id => id !== action.payload);
    },

    selectMultiple: (state, action) => {
      state.selectedElementIds = action.payload;
    },

    clearSelection: (state) => {
      state.selectedElementIds = [];
    },

    selectAll: (state) => {
      state.selectedElementIds = state.elements.map(el => el.id);
    },

    // Tool operations (local only, no save needed)
    setActiveTool: (state, action) => {
      state.activeTool = action.payload;
      if (action.payload !== "select") {
        state.selectedElementIds = [];
      }
    },

    setIsDrawing: (state, action) => {
      state.isDrawing = action.payload;
    },

    // Drawing properties (local only, no save needed)
    setCurrentFill: (state, action) => {
      state.currentFill = action.payload;
    },

    setCurrentStroke: (state, action) => {
      state.currentStroke = action.payload;
    },

    setCurrentStrokeWidth: (state, action) => {
      state.currentStrokeWidth = action.payload;
    },

    setCurrentFontSize: (state, action) => {
      state.currentFontSize = action.payload;
    },

    setCurrentFontFamily: (state, action) => {
      state.currentFontFamily = action.payload;
    },

    // Layer operations (marks as changed)
    bringToFront: (state, action) => {
      const element = state.elements.find(el => el.id === action.payload);
      if (element) {
        const maxZIndex = Math.max(...state.elements.map(el => el.zIndex || 0));
        element.zIndex = maxZIndex + 1;
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    sendToBack: (state, action) => {
      const element = state.elements.find(el => el.id === action.payload);
      if (element) {
        const minZIndex = Math.min(...state.elements.map(el => el.zIndex || 0));
        element.zIndex = minZIndex - 1;
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    // History operations (local only, may mark as changed)
    saveToHistory: (state) => {
      // Remove any future history if we're not at the end
      state.history = state.history.slice(0, state.historyIndex + 1);
      
      // Add current state to history
      state.history.push(JSON.parse(JSON.stringify(state.elements)));
      
      // Limit history size
      if (state.history.length > 50) {
        state.history.shift();
      } else {
        state.historyIndex++;
      }
    },

    undo: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex--;
        state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.selectedElementIds = [];
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    redo: (state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.selectedElementIds = [];
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    // Auto-save settings
    setAutoSave: (state, action) => {
      state.autoSave = action.payload;
    },

    setSaveInterval: (state, action) => {
      state.saveInterval = action.payload;
    },

    // Clear/reset operations
    clearCanvas: (state) => {
      if (state.elements.length > 0) {
        state.elements = [];
        state.selectedElementIds = [];
        canvasSlice.caseReducers.saveToHistory(state);
        canvasSlice.caseReducers.markAsChanged(state);
      }
    },

    resetCanvas: (state) => {
      return { 
        ...initialState,
        canvasId: state.canvasId, // Keep the canvas ID
      };
    },

    // Discard unsaved changes (revert to last saved)
    discardChanges: (state) => {
      state.elements = JSON.parse(JSON.stringify(state.lastSavedElements));
      state.hasUnsavedChanges = false;
      state.selectedElementIds = [];
      // Reset history to last saved state
      state.history = [JSON.parse(JSON.stringify(state.elements))];
      state.historyIndex = 0;
    },
  },
});

// Export actions
export const {
  setCanvasData,
  setLoading,
  setSaving,
  setError,
  clearError,
  markAsSaved,
  markAsChanged,
  addElement,
  updateElement,
  updateElements,
  deleteElement,
  deleteSelectedElements,
  setElements,
  selectElement,
  addToSelection,
  removeFromSelection,
  selectMultiple,
  clearSelection,
  selectAll,
  setActiveTool,
  setIsDrawing,
  setCurrentFill,
  setCurrentStroke,
  setCurrentStrokeWidth,
  setCurrentFontSize,
  setCurrentFontFamily,
  bringToFront,
  sendToBack,
  saveToHistory,
  undo,
  redo,
  setAutoSave,
  setSaveInterval,
  clearCanvas,
  resetCanvas,
  discardChanges,
} = canvasSlice.actions;

// Export reducer
export default canvasSlice.reducer;

// Selectors
export const selectCanvas = (state) => state.canvas;
export const selectElements = (state) => state.canvas.elements;
export const selectSelectedElements = (state) => 
  state.canvas.elements.filter(el => state.canvas.selectedElementIds.includes(el.id));
export const selectActiveTool = (state) => state.canvas.activeTool;
export const selectDrawingProperties = (state) => ({
  fill: state.canvas.currentFill,
  stroke: state.canvas.currentStroke,
  strokeWidth: state.canvas.currentStrokeWidth,
  fontSize: state.canvas.currentFontSize,
  fontFamily: state.canvas.currentFontFamily,
});
export const selectCanvasApiState = (state) => ({
  isLoading: state.canvas.isLoading,
  isSaving: state.canvas.isSaving,
  lastSaved: state.canvas.lastSaved,
  error: state.canvas.error,
  autoSave: state.canvas.autoSave,
});
export const selectCanvasId = (state) => state.canvas.canvasId;
export const selectHasUnsavedChanges = (state) => state.canvas.hasUnsavedChanges;
export const selectElementsForSave = (state) => state.canvas.elements; // What to send to API