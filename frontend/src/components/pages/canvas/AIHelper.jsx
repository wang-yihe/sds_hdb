import { useState } from "react";

const AIHelper = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [styleImages, setStyleImages] = useState([]);
  const [perspectiveImages, setPerspectiveImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [plantSearch, setPlantSearch] = useState("");

  const handleImageUpload = (e, type) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        if (type === 'style') {
          setStyleImages(prev => [...prev, imageData]);
        } else {
          setPerspectiveImages(prev => [...prev, imageData]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const removeImage = (type, index) => {
    if (type === 'style') {
      setStyleImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setPerspectiveImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePlantSelect = (plant) => {
    if (selectedPlants.includes(plant)) {
      setSelectedPlants(selectedPlants.filter(p => p !== plant));
    } else {
      setSelectedPlants([...selectedPlants, plant]);
    }
  };

  const handleGenerate = async () => {
    if (styleImages.length === 0 || perspectiveImages.length === 0) {
      alert('Please upload at least one image for both style reference and perspective view');
      return;
    }

    setIsGenerating(true);
    try {
      const generationData = {
        styleImages,
        perspectiveImages,
        prompt,
        selectedPlants
      };

      // Call parent component's onGenerate callback
      if (props.onGenerate) {
        props.onGenerate(generationData);
      }

      // TODO: Call your AI API here
      console.log('Generating with:', generationData);
      
      // Example API call:
      // const response = await fetch('/api/generate', {
      //   method: 'POST',
      //   body: JSON.stringify(generationData)
      // });
      
      setIsModalOpen(false);
      
      // Reset form
      setStyleImages([]);
      setPerspectiveImages([]);
      setPrompt("");
      setSelectedPlants([]);
      setPlantSearch("");
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* AI Helper Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 1000
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
        title="AI Planting Visualiser"
      >
        <span style={{ fontSize: '20px' }}>✨</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap' }}>
          AI Planting Visualiser
        </span>
      </button>

      {/* AI Helper Modal */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ AI Image Generator
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            {/* Style Reference Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                📷 Style Reference * ({styleImages.length} image{styleImages.length !== 1 ? 's' : ''})
              </label>
              <label style={{ 
                display: 'block',
                padding: '32px 16px', 
                background: '#f9fafb', 
                border: '2px dashed #d1d5db',
                borderRadius: '8px', 
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '14px',
                color: '#6b7280',
                transition: 'all 0.2s',
                marginBottom: '12px'
              }}>
                {styleImages.length > 0 ? `+ Add more style references (${styleImages.length} uploaded)` : '+ Click to upload style reference(s)'}
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, 'style')}
                  style={{ display: 'none' }}
                />
              </label>
              {styleImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {styleImages.map((img, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img 
                        src={img} 
                        alt={`Style ${index + 1}`}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '3px solid #10b981' }}
                      />
                      <button
                        onClick={() => removeImage('style', index)}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Perspective View Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                🏠 Perspective View * ({perspectiveImages.length} image{perspectiveImages.length !== 1 ? 's' : ''})
              </label>
              <label style={{ 
                display: 'block',
                padding: '32px 16px', 
                background: '#f9fafb', 
                border: '2px dashed #d1d5db',
                borderRadius: '8px', 
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '14px',
                color: '#6b7280',
                transition: 'all 0.2s',
                marginBottom: '12px'
              }}>
                {perspectiveImages.length > 0 ? `+ Add more perspective views (${perspectiveImages.length} uploaded)` : '+ Click to upload perspective view(s)'}
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, 'perspective')}
                  style={{ display: 'none' }}
                />
              </label>
              {perspectiveImages.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {perspectiveImages.map((img, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img 
                        src={img} 
                        alt={`Perspective ${index + 1}`}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '3px solid #3b82f6' }}
                      />
                      <button
                        onClick={() => removeImage('perspective', index)}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Plant Suggestions Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                🌿 Suggested Plants
              </label>
              
              {/* Search Bar */}
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  value={plantSearch}
                  onChange={(e) => setPlantSearch(e.target.value)}
                  placeholder="Search for plants..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Selected Plants Display */}
              {selectedPlants.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedPlants.map((plant, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '16px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {plant}
                      <button
                        onClick={() => handlePlantSelect(plant)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0',
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Plants Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '8px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                {/* Placeholder plants - will be replaced with RAG model data */}
                {['Monstera', 'Pothos', 'Snake Plant', 'Peace Lily', 'Fiddle Leaf Fig', 'Spider Plant']
                  .filter(plant => plant.toLowerCase().includes(plantSearch.toLowerCase()))
                  .map((plant, index) => {
                    const isSelected = selectedPlants.includes(plant);
                    return (
                      <div
                        key={index}
                        onClick={() => handlePlantSelect(plant)}
                        style={{
                          padding: '12px',
                          background: isSelected ? '#3b82f6' : 'white',
                          borderRadius: '6px',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          transition: 'all 0.2s',
                          color: isSelected ? 'white' : '#374151'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.background = '#eff6ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        🌱 {plant}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Prompt Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                💬 Prompt (Optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to generate... (e.g., 'vertical garden with tropical plants and wooden planters')"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || styleImages.length === 0 || perspectiveImages.length === 0}
                style={{
                  padding: '10px 24px',
                  background: isGenerating || styleImages.length === 0 || perspectiveImages.length === 0 ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating || styleImages.length === 0 || perspectiveImages.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isGenerating ? '⏳ Generating...' : '✨ Generate Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIHelper;
