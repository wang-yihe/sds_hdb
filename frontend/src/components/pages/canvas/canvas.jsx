import { useState } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import AIHelper from "./AIHelper";
import GenerationCard from "./GenerationCard";
import OriginalCard from "./OriginalCard";

const Canvas = () => {
  const [generations, setGenerations] = useState([]);
  const [editor, setEditor] = useState(null);

  const handleGenerate = (data) => {
    // Add original card
    const originalCard = {
      id: `original-${Date.now()}`,
      type: 'original',
      styleImage: data.styleImage,
      perspectiveImage: data.perspectiveImage,
      plants: data.selectedPlants,
      prompt: data.prompt,
      timestamp: new Date(),
      position: { x: 100, y: 100 }
    };

    // Add generation card (placeholder for now)
    const generationCard = {
      id: `gen-${Date.now()}`,
      type: 'generation',
      generationNumber: generations.filter(g => g.type === 'generation').length + 1,
      generatedImage: null, // Will be filled by API response
      comments: [],
      likes: 0,
      timestamp: new Date(),
      originalData: data,
      position: { x: 450, y: 100 }
    };

    setGenerations([...generations, originalCard, generationCard]);

    // TODO: Add shapes to tldraw canvas using editor API
    if (editor) {
      // This would create actual shapes on the canvas
      // For now, we'll render them as HTML overlays
    }
  };

  const handleLike = (id) => {
    setGenerations(generations.map(gen => 
      gen.id === id ? { ...gen, likes: gen.likes + 1 } : gen
    ));
  };

  const handleComment = (id, comment) => {
    setGenerations(generations.map(gen => 
      gen.id === id ? { ...gen, comments: [...gen.comments, comment] } : gen
    ));
  };

  const handleCardDrag = (id, newPosition) => {
    setGenerations(generations.map(gen => 
      gen.id === id ? { ...gen, position: newPosition } : gen
    ));
  };

  return (
    <div style={{ position: 'relative', inset: 0, width: '100vw', height: '100vh' }}>
      {/* Tldraw Canvas */}
      <Tldraw onMount={(editor) => setEditor(editor)} />

      {/* AI Helper Component */}
      <AIHelper onGenerate={handleGenerate} />

      {/* Generation Cards - Rendered on canvas */}
      {generations.map((gen) => (
        gen.type === 'original' ? (
          <OriginalCard
            key={gen.id}
            data={gen}
            onDrag={(newPosition) => handleCardDrag(gen.id, newPosition)}
          />
        ) : (
          <GenerationCard
            key={gen.id}
            data={gen}
            onLike={() => handleLike(gen.id)}
            onComment={(comment) => handleComment(gen.id, comment)}
            onDrag={(newPosition) => handleCardDrag(gen.id, newPosition)}
          />
        )
      ))}
    </div>
  );
};

export default Canvas;