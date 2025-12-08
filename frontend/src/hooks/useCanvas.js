// hooks/useCanvas.js
import { useSelector, useDispatch } from "react-redux";
import { useCallback, useEffect, useRef } from "react";
import {
  fetchCanvas,
  saveCanvasData,
  createCanvas,
  clearCurrentCanvas,
  updateLastSaved,
  clearError,
} from "@/store/slices/canvasSlice";

const useCanvas = (projectId) => {
  const dispatch = useDispatch();
  const { currentCanvas, loadingFlags, lastSaved, error } = useSelector(
    (state) => state.canvas
  );
  const hasInitialized = useRef(false);

  // Initialize canvas once
  useEffect(() => {
    if (!projectId || hasInitialized.current) return;

    const initializeCanvas = async () => {
      try {
        const result = await dispatch(fetchCanvas(projectId)).unwrap();
        
        if (!result.id || result.id === '') {
          console.log("Canvas is empty, creating new canvas...");
          await dispatch(createCanvas(projectId)).unwrap();
        }
      } catch (error) {
        console.log("Failed to fetch canvas, creating empty canvas...");
        try {
          await dispatch(createCanvas(projectId)).unwrap();
        } catch (createError) {
          console.error("Failed to create canvas:", createError);
        }
      }
      hasInitialized.current = true;
    };

    initializeCanvas();
  }, [dispatch, projectId]);

  const saveCanvas = useCallback(
    async (canvasData) => {
      if (!projectId) return;
      
      try {
        await dispatch(saveCanvasData({ projectId, canvasData })).unwrap();
        dispatch(updateLastSaved());
      } catch (error) {
        console.error("Failed to save canvas:", error);
        throw error;
      }
    },
    [dispatch, projectId]
  );

  return {
    currentCanvas,
    loadingFlags,
    lastSaved,
    error,
    isInitialized: hasInitialized.current,
    saveCanvas,
  };
};

export default useCanvas;