import { useState, useRef, useEffect } from 'react';

const OriginalCard = ({ data, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('no-drag')) return;
    
    setIsDragging(true);
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      onDrag({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${data.position.x}px`,
        top: `${data.position.y}px`,
        width: '320px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 10000 : 1000,
        userSelect: 'none'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px 12px 0 0',
        fontWeight: '600',
        fontSize: '16px'
      }}>
        📋 Original Inputs
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Style Reference */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
            Style Reference:
          </div>
          {data.styleImage && (
            <img 
              src={data.styleImage} 
              alt="Style" 
              style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
            />
          )}
        </div>

        {/* Perspective View */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
            Perspective View:
          </div>
          {data.perspectiveImage && (
            <img 
              src={data.perspectiveImage} 
              alt="Perspective" 
              style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
            />
          )}
        </div>

        {/* Plants */}
        {data.plants && data.plants.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
              Plants Used:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data.plants.map((plant, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    background: '#f3f4f6',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#374151'
                  }}
                >
                  🌱 {plant}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Prompt */}
        {data.prompt && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
              Prompt:
            </div>
            <div style={{
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#374151',
              lineHeight: '1.5'
            }}>
              {data.prompt}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OriginalCard;
