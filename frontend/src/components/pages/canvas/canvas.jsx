// components/canvas/Canvas.jsx
import { useParams } from "react-router-dom";
import { Tldraw, useEditor, getSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import useTldrawCanvas from "@/hooks/useTldrawCanvas";
import useCanvas from "@/hooks/useCanvas";
import { useGenerateAllSmart } from "@/hooks/useAi";
import AIHelper from "./AIHelper";
import { OriginalCardShapeUtil } from "./OriginalCard";
import { GenerationCardShapeUtil } from "./GenerationCard";
import { VideoCardShapeUtil } from "./VideoCard";
import { createOriginalCardAsShapes } from "./OriginalCard";
import { createGenerationCardAsShapes } from "./GenerationCard";

const MyCustomShapes = [OriginalCardShapeUtil, GenerationCardShapeUtil, VideoCardShapeUtil];

// SaveButton component
function SaveButton({ projectId }) {
  const editor = useEditor();
  const { saveCanvas } = useCanvas(projectId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editor || !projectId) return;

    setIsSaving(true);
    try {
      const snapshot = getSnapshot(editor.store);
      await saveCanvas(snapshot);
      console.log("Canvas saved");
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!editor) return;
    const interval = setInterval(handleSave, 30000);
    return () => clearInterval(interval);
  }, [editor]);

  return (
    <Button 
      onClick={handleSave} 
      disabled={isSaving} 
      size="sm"
      className="absolute top-4 right-4 z-[999]"
    >
      {isSaving ? "Saving..." : "Save"}
    </Button>
  );
}

// CanvasContent component
function CanvasContent() {
  const editor = useEditor();

  const handleGenerate = async (data) => {
    if (!editor) return;

    // Create original card with the input data
    await createOriginalCardAsShapes(editor, {
      position: { x: 100, y: 100 },
      styleImages: data.styleImages,
      perspectiveImages: data.perspectiveImages,
      plants: data.selectedPlants,
      prompt: data.prompt,
    });

    // Create generation card - it will auto-trigger AI generation
    await createGenerationCardAsShapes(editor, {
      position: { x: 450, y: 100 },
      generationNumber: 1,
      generatedImage: '', // Empty string triggers auto-generation
      originalData: data,
    });
  };

  return <AIHelper onGenerate={handleGenerate} />;
}

// Main Canvas component
const Canvas = () => {
  const { projectId } = useParams();
  const { canvasSnapshot, isLoading } = useTldrawCanvas(projectId);
  return (
    <div className="w-full h-screen relative">
      <Tldraw 
        snapshot={canvasSnapshot}
        shapeUtils={MyCustomShapes}
      >
        <SaveButton projectId={projectId} />
        <CanvasContent />
      </Tldraw>
    </div>
  );
};

export default Canvas;