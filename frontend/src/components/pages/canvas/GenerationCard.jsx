import { useState, useRef, useEffect } from 'react';

const GenerationCard = ({ data, onLike, onComment, onDrag }) => {
  const [editMode, setEditMode] = useState(false);
  const [regenerationPrompt, setRegenerationPrompt] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  
  // Drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Lasso tool functionality
  const [isDrawing, setIsDrawing] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [isLassoActive, setIsLassoActive] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

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

  const handleAddComment = () => {
    if (commentText.trim()) {
      onComment({
        text: commentText,
        author: 'User',
        timestamp: new Date()
      });
      setCommentText('');
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting image:', data);
  };

  // Lasso tool handlers
  const startLasso = (e) => {
    if (!isLassoActive) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setLassoPoints([{ x, y }]);
  };

  const drawLasso = (e) => {
    if (!isDrawing || !isLassoActive) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setLassoPoints(prev => [...prev, { x, y }]);
    
    // Draw on canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (lassoPoints.length > 0) {
      const lastPoint = lassoPoints[lassoPoints.length - 1];
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endLasso = () => {
    if (!isDrawing || !isLassoActive) return;
    
    setIsDrawing(false);
    
    // Close the path
    if (lassoPoints.length > 2) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(lassoPoints[lassoPoints.length - 1].x, lassoPoints[lassoPoints.length - 1].y);
      ctx.lineTo(lassoPoints[0].x, lassoPoints[0].y);
      ctx.stroke();
      
      // Fill the selected area with semi-transparent overlay
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      lassoPoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
    }
  };

  const clearLasso = () => {
    setLassoPoints([]);
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const toggleLassoTool = () => {
    setIsLassoActive(!isLassoActive);
    if (isLassoActive) {
      clearLasso();
    }
  };

  // Initialize canvas size when image loads
  useEffect(() => {
    if (canvasRef.current && imageRef.current && editMode) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
    }
  }, [editMode]);

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${data.position.x}px`,
        top: `${data.position.y}px`,
        width: '380px',
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
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        borderRadius: '12px 12px 0 0',
        fontWeight: '600',
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>✨ Generation {data.generationNumber}</span>
        <span style={{ fontSize: '12px', opacity: 0.9 }}>
          {data.timestamp.toLocaleTimeString()}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Generated Image */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <img 
            ref={imageRef}
            src={data.generatedImage || 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&q=80'} 
            alt="Generated" 
            style={{ 
              width: '100%', 
              height: '250px', 
              objectFit: 'cover', 
              borderRadius: '8px',
              display: 'block'
            }}
          />
          {/* Canvas overlay for lasso tool */}
          {editMode && (
            <canvas
              ref={canvasRef}
              className="no-drag"
              onMouseDown={startLasso}
              onMouseMove={drawLasso}
              onMouseUp={endLasso}
              onMouseLeave={endLasso}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                cursor: isLassoActive ? 'crosshair' : 'default',
                pointerEvents: isLassoActive ? 'auto' : 'none'
              }}
            />
          )}
          {!data.generatedImage && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '4px 12px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              📷 Placeholder
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={onLike}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            ❤️ {data.likes}
          </button>
          <button
            className="no-drag"
            onClick={() => setShowComments(!showComments)}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            💬 {data.comments.length}
          </button>
          <button
            className="no-drag"
            onClick={() => setEditMode(!editMode)}
            style={{
              flex: 1,
              padding: '10px',
              background: editMode ? '#3b82f6' : '#f3f4f6',
              color: editMode ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            ✏️ Edit
          </button>
          <button
            className="no-drag"
            onClick={handleExport}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            📥 Export
          </button>
        </div>

        {/* Edit Mode */}
        {editMode && (
          <div style={{
            padding: '12px',
            background: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {/* Lasso Tool Controls */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #dbeafe'
            }}>
              <button
                className="no-drag"
                onClick={toggleLassoTool}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isLassoActive ? '#3b82f6' : 'white',
                  color: isLassoActive ? 'white' : '#374151',
                  border: `2px solid ${isLassoActive ? '#3b82f6' : '#d1d5db'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                ✏️ {isLassoActive ? 'Lasso Active' : 'Enable Lasso'}
              </button>
              <button
                className="no-drag"
                onClick={clearLasso}
                disabled={lassoPoints.length === 0}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: lassoPoints.length === 0 ? '#f3f4f6' : 'white',
                  color: lassoPoints.length === 0 ? '#9ca3af' : '#374151',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: lassoPoints.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                🗑️ Clear Selection
              </button>
            </div>

            {isLassoActive && (
              <div style={{
                padding: '8px 12px',
                background: '#dbeafe',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1e40af',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>💡</span>
                <span>Click and drag on the image to draw a selection area</span>
              </div>
            )}

            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
              Regeneration Prompt:
            </div>
            <textarea
              className="no-drag"
              value={regenerationPrompt}
              onChange={(e) => setRegenerationPrompt(e.target.value)}
              placeholder="Describe what you'd like to change in the selected area..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            <button
              className="no-drag"
              onClick={() => {
                console.log('Regenerating with selection:', lassoPoints);
                console.log('Prompt:', regenerationPrompt);
              }}
              disabled={lassoPoints.length === 0 && !regenerationPrompt}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                background: (lassoPoints.length === 0 && !regenerationPrompt) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (lassoPoints.length === 0 && !regenerationPrompt) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              🔄 Regenerate Selected Area
            </button>
          </div>
        )}

        {/* Comments Section */}
        {showComments && (
          <div style={{
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937', marginBottom: '12px' }}>
              Comments:
            </div>
            
            {/* Comment List */}
            <div style={{ marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
              {data.comments.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                data.comments.map((comment, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      background: 'white',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                      {comment.author}
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      {comment.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="no-drag"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                className="no-drag"
                onClick={handleAddComment}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerationCard;
