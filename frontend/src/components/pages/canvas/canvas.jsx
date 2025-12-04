import { useState } from "react";
import { Tldraw } from "tldraw";
import AIHelper from "./AIHelper";
import { createOriginalCardAsShapes, OriginalCardShapeUtil } from "./OriginalCard"
import { createGenerationCardAsShapes, GenerationCardShapeUtil } from "./GenerationCard"
import { VideoCardShapeUtil } from "./VideoCard"

const Canvas = () => {
  const [editor, setEditor] = useState(null);

  const handleGenerate = async (data) => {
    if (!editor) return;
    
    console.log('Generate called with:', data);
    
    // Create original card as native tldraw shape
    await createOriginalCardAsShapes(editor, {
      position: { x: 100, y: 100 },
      styleImages: data.styleImages,
      perspectiveImages: data.perspectiveImages,
      plants: data.selectedPlants,
      prompt: data.prompt,
    });

    // Create generation card as native tldraw shape - always Generation 1 from original
    await createGenerationCardAsShapes(editor, {
      position: { x: 450, y: 100 },
      generationNumber: 1,
      generatedImage: null, // Will be filled by API response
      originalData: data,
    });
  };

  return (
    <div className="w-full h-screen relative">
      <Tldraw 
        onMount={(editor) => setEditor(editor)}
        shapeUtils={[OriginalCardShapeUtil, GenerationCardShapeUtil, VideoCardShapeUtil]}
      />
      <AIHelper onGenerate={handleGenerate} />
    </div>
  );
};

export default Canvas;