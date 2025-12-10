import { useState } from "react";
import { useRag } from '@/hooks/useRag'; 

const AIHelper = (props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [styleImages, setStyleImages] = useState([]);
  const [perspectiveImages, setPerspectiveImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState([]);
  const [plantSearch, setPlantSearch] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const { handleSearchPlantsWithImages, searchResults, loadingFlags } = useRag();
  const [plantSearchResults, setPlantSearchResults] = useState([]);

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

  const handlePlantSearch = async () => {
    if (!plantSearch.trim()) return;
    
    try {
      await handleSearchPlantsWithImages({ 
        query: plantSearch, 
        max_results: 5 
      });
      console.log('Search results:', searchResults);
      setPlantSearchResults(searchResults);
    } catch (error) {
      console.error('Plant search failed:', error);
      alert('Plant search failed: ' + error.message);
    }
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
        selectedPlants // Now contains [{botanical_name, image}, ...]
      };

      // Call parent component's onGenerate callback
      if (props.onGenerate) {
        props.onGenerate(generationData);
      }

      console.log('Generating with:', generationData);
      
      setIsModalOpen(false);
      
      // Reset form
      setStyleImages([]);
      setPerspectiveImages([]);
      setPrompt("");
      setSelectedPlants([]);
      setPlantSearch("");
      setPlantSearchResults([]); // ADD THIS - clear search results too
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* AI Helper Button with Vine Animation */}
      <div 
        style={{
          position: 'absolute',
          bottom: '12px',
          left: 'calc(50% + 280px)',
          zIndex: 1000
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Growing Vines Animation */}
        {isHovered && (
          <>
            {/* Left Vine */}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '-120px',
              width: '150px',
              height: '80px',
              animation: 'growVineLeft 0.8s ease-out forwards',
              transformOrigin: 'bottom right',
              pointerEvents: 'none'
            }}>
              <img 
                src={`${import.meta.env.BASE_URL}vine.png`} 
                alt="vine"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: 'scaleX(-1)'
                }}
              />
            </div>
            
            {/* Right Vine */}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              right: '-120px',
              width: '150px',
              height: '80px',
              animation: 'growVineRight 0.8s ease-out forwards',
              transformOrigin: 'bottom left',
              pointerEvents: 'none'
            }}>
              <img 
                src={`${import.meta.env.BASE_URL}vine.png`} 
                alt="vine"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            
            {/* Floating Flowers */}
            <div style={{
              position: 'absolute',
              top: '-25px',
              left: '-15px',
              animation: 'floatFlower 2s ease-in-out infinite',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '20px' }}>🌸</span>
            </div>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-10px',
              animation: 'floatFlower 2s ease-in-out infinite 0.3s',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '18px' }}>🌺</span>
            </div>
            
            {/* Sparkles */}
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              animation: 'sparkle 1s ease-in-out infinite',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: '16px' }}>✨</span>
            </div>
          </>
        )}
        
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            position: 'relative',
            padding: '6px 14px',
            height: '40px',
            background: isHovered 
              ? 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isHovered 
              ? '0 6px 20px rgba(124, 58, 237, 0.6)' 
              : '0 4px 12px rgba(102, 126, 234, 0.4)',
            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'all 0.3s ease',
            zIndex: 1001
          }}
          title="AI Planting Visualiser"
        >
          <span style={{ 
            fontSize: '20px',
            animation: isHovered ? 'rotate 1s ease-in-out infinite' : 'none'
          }}>✨</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'white', whiteSpace: 'nowrap' }}>
            AI Planting Visualiser
          </span>
        </button>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes growVineLeft {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes growVineRight {
          from {
            transform: scaleY(0);
            opacity: 0;
          }
          to {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes floatFlower {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(10deg);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translateX(-50%) scale(1.3);
          }
        }
        
        @keyframes rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }
      `}</style>

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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handlePlantSearch();
                    }
                  }}
                  placeholder="Search for plants... (e.g., tall shade trees)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    marginBottom: '8px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <button
                  onClick={handlePlantSearch}
                  disabled={loadingFlags.isSearching || !plantSearch.trim()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: loadingFlags.isSearching ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loadingFlags.isSearching ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {loadingFlags.isSearching ? '🔍 Searching & Generating Images...' : 'Search Plants'}
                </button>
              </div>

              {/* Loading State */}
              {loadingFlags.isSearching && (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  🌿 Searching and generating images...<br/>
                  <span style={{ fontSize: '12px' }}>This may take 30-60 seconds</span>
                </div>
              )}

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
                      {/* Show plant thumbnail */}
                      {plant.image && (
                        <img
                          src={plant.image.startsWith('/canvas-assets/') || plant.image.startsWith('http') || plant.image.startsWith('data:')
                            ? plant.image
                            : `data:image/png;base64,${plant.image}`}
                          alt={plant.botanical_name}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      {plant.botanical_name}
                      <button
                        onClick={() => {
                          setSelectedPlants(prev => 
                            prev.filter(p => p.botanical_name !== plant.botanical_name)
                          );
                        }}
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

              {/* Plant Results Grid */}
              {!loadingFlags.isSearching && plantSearchResults.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                  gap: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '8px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '12px'
                }}>
                  {plantSearchResults.map((plant, index) => {
                    const isSelected = selectedPlants.some(p => p.botanical_name === plant.botanical_name);
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedPlants(prev => {
                            const exists = prev.some(p => p.botanical_name === plant.botanical_name);
                            if (exists) {
                              return prev.filter(p => p.botanical_name !== plant.botanical_name);
                            } else {
                              return [...prev, plant]; // Add full plant object {botanical_name, image}
                            }
                          });
                        }}
                        style={{
                          padding: '12px',
                          background: isSelected ? '#3b82f6' : 'white',
                          borderRadius: '8px',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '12px',
                          transition: 'all 0.2s',
                          color: isSelected ? 'white' : '#374151',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px'
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
                        {/* Plant thumbnail */}
                        {plant.image && (
                          <img
                            src={plant.image.startsWith('/canvas-assets/') || plant.image.startsWith('http') || plant.image.startsWith('data:')
                              ? plant.image
                              : `data:image/png;base64,${plant.image}`}
                            alt={plant.botanical_name}
                            style={{
                              width: '60px',
                              height: '60px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                            }}
                          />
                        )}
                        <span style={{ fontSize: '11px', fontWeight: '500' }}>
                          {plant.botanical_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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
