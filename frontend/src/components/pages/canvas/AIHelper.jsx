import { useState } from "react";

const AIHelper = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [styleImage, setStyleImage] = useState(null);
  const [perspectiveImage, setPerspectiveImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [plantSearch, setPlantSearch] = useState("");

  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'style') {
          setStyleImage(event.target.result);
        } else {
          setPerspectiveImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
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
    if (!styleImage || !perspectiveImage) {
      alert('Please upload both style reference and perspective view images');
      return;
    }

    setIsGenerating(true);
    try {
      const generationData = {
        styleImage,
        perspectiveImage,
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
      setStyleImage(null);
      setPerspectiveImage(null);
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
                📷 Style Reference *
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ 
                  flex: 1,
                  padding: '32px 16px', 
                  background: '#f9fafb', 
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}>
                  {styleImage ? '✓ Image uploaded' : '+ Click to upload style reference'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'style')}
                    style={{ display: 'none' }}
                  />
                </label>
                {styleImage && (
                  <img 
                    src={styleImage} 
                    alt="Style" 
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '3px solid #10b981' }}
                  />
                )}
              </div>
            </div>

            {/* Perspective View Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                🏠 Perspective View *
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ 
                  flex: 1,
                  padding: '32px 16px', 
                  background: '#f9fafb', 
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}>
                  {perspectiveImage ? '✓ Image uploaded' : '+ Click to upload perspective view'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'perspective')}
                    style={{ display: 'none' }}
                  />
                </label>
                {perspectiveImage && (
                  <img 
                    src={perspectiveImage} 
                    alt="Perspective" 
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '3px solid #3b82f6' }}
                  />
                )}
              </div>
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
                disabled={isGenerating || !styleImage || !perspectiveImage}
                style={{
                  padding: '10px 24px',
                  background: isGenerating || !styleImage || !perspectiveImage ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating || !styleImage || !perspectiveImage ? 'not-allowed' : 'pointer',
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
