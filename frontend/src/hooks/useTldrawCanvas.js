// hooks/useTldrawCanvas.js
import { useState, useEffect } from "react";
import { getCanvas, createEmptyCanvas } from "@/api/canvasAPI";

const useTldrawCanvas = (projectId) => {
  const [canvasSnapshot, setCanvasSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    async function loadCanvas() {
      try {
        const response = await getCanvas(projectId);
        const canvasData = response.data?.canvas_data;
        
        if (!canvasData || Object.keys(canvasData).length === 0 || response.data.id === '') {
          console.log("No canvas exists, creating empty canvas");
          await createEmptyCanvas(projectId);
          setCanvasSnapshot(null); // Empty canvas
        } else {
          console.log("Loading existing canvas");
          setCanvasSnapshot(canvasData);
        }
      } catch (error) {
        console.error("Failed to load canvas:", error);
        setCanvasSnapshot(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCanvas();
  }, [projectId]);

  return { canvasSnapshot, isLoading };
};

export default useTldrawCanvas;