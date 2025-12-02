import { useState } from "react";
import { Tldraw } from "tldraw";
import AIHelper from "./AIHelper";
import { createOriginalCardAsShapes, OriginalCardShapeUtil } from "./OriginalCard"
import { createGenerationCardAsShapes, GenerationCardShapeUtil } from "./GenerationCard"

const Canvas = () => {
  const [editor, setEditor] = useState(null);
  const [generationCount, setGenerationCount] = useState(0);

  const handleGenerate = async (data) => {
    if (!editor) return;
    
    console.log('Generate called with:', data);
    
    // Create original card as native tldraw shape
    await createOriginalCardAsShapes(editor, {
      position: { x: 100, y: 100 },
      styleImage: data.styleImage,
      perspectiveImage: data.perspectiveImage,
      plants: data.selectedPlants,
      prompt: data.prompt,
    });

    // Create generation card as native tldraw shape
    const newGenerationNumber = generationCount + 1;
    setGenerationCount(newGenerationNumber);
    
    await createGenerationCardAsShapes(editor, {
      position: { x: 450, y: 100 },
      generationNumber: newGenerationNumber,
      generatedImage: null, // Will be filled by API response
      originalData: data,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw 
        onMount={(editor) => setEditor(editor)}
        shapeUtils={[OriginalCardShapeUtil, GenerationCardShapeUtil]}
      />
      <AIHelper onGenerate={handleGenerate} />
    </div>
  );
};

export default Canvas;