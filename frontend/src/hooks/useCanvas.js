import { useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectTldrawDocument, 
  selectCanvasTitle, 
  selectHasUnsavedChanges,
  selectCanvasApiState,
  updateTldrawDocument,
  setCanvasTitle,
  markAsSaved,
  setSaving 
} from '@/store/slices/canvasSlice';

export const useCanvas = () => {
  const dispatch = useDispatch();
  const tldrawDocument = useSelector(selectTldrawDocument);
  const canvasTitle = useSelector(selectCanvasTitle);
  const hasUnsavedChanges = useSelector(selectHasUnsavedChanges);
  const { isSaving, autoSave } = useSelector(selectCanvasApiState);
  
  const editorRef = useRef(null);

  // Handle title change
  const handleTitleChange = useCallback((e) => {
    dispatch(setCanvasTitle(e.target.value));
  }, [dispatch]);

  // Save function
  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    
    dispatch(setSaving(true));
    try {
      // Get current document from tldraw
      const snapshot = editorRef.current.store.getSnapshot();
      
      // Here you would call your API to save
      // await canvasAPI.saveCanvas({ title: canvasTitle, document: snapshot });
      
      console.log('Saving canvas:', { title: canvasTitle, document: snapshot });
      
      // Mark as saved
      dispatch(markAsSaved());
      alert('Canvas saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save canvas');
    }
  }, [dispatch, canvasTitle]);

  // Handle editor changes
  const handleEditorChange = useCallback((editor) => {
    if (!editor) return;
    
    editorRef.current = editor;
    
    // Listen for document changes
    const handleDocumentChange = () => {
      const snapshot = editor.store.getSnapshot();
      dispatch(updateTldrawDocument(snapshot));
    };

    // Subscribe to store changes
    const unsubscribe = editor.store.listen(handleDocumentChange);
    
    return unsubscribe;
  }, [dispatch]);

  // Auto-save effect
  useEffect(() => {
    if (autoSave && hasUnsavedChanges) {
      const timer = setTimeout(() => {
        handleSave();
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [autoSave, hasUnsavedChanges, handleSave]);

  // Load initial document
  useEffect(() => {
    if (tldrawDocument && editorRef.current) {
      editorRef.current.store.loadSnapshot(tldrawDocument);
    }
  }, [tldrawDocument]);

  return {
    canvasTitle,
    hasUnsavedChanges,
    isSaving,
    handleTitleChange,
    handleSave,
    handleEditorChange
  };
};