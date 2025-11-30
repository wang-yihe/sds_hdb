import { useState } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const Canvas = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [styleImage, setStyleImage] = useState(null);
  const [perspectiveImage, setPerspectiveImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // TODO: Call your AI API here
      console.log('Generating with:', {
        styleImage,
        perspectiveImage,
        prompt
      });
      
      // Example API call:
      // const response = await fetch('/api/generate', {
      //   method: 'POST',
      //   body: JSON.stringify({ styleImage, perspectiveImage, prompt })
      // });
      
      alert('AI generation triggered! Check console for data.');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
      {/* Tldraw Canvas */}
      <Tldraw />

      {/* AI Helper Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '480px',
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
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
        title="AI Helper"
      >
        ✨
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
                📷 Style Reference (Optional)
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
                🏠 Perspective View (Optional)
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

            {/* Prompt Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                💬 Prompt *
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
                disabled={isGenerating || !prompt}
                style={{
                  padding: '10px 24px',
                  background: isGenerating || !prompt ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating || !prompt ? 'not-allowed' : 'pointer',
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
    </div>
  );
};

export default Canvas;