import { 
  HTMLContainer, 
  ShapeUtil,
  createShapeId,
  Rectangle2d,
  T,
  useEditor
} from 'tldraw'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GENERATION_CARD_CONFIG } from '../../../config/generationcardconfig'

// Shape Util class for Generation Card
export class GenerationCardShapeUtil extends ShapeUtil {
  static type = 'generationCard'
  static props = {
    w: T.number,
    h: T.number,
    generationNumber: T.number,
    generatedImage: T.string,
    likes: T.number,
    comments: T.arrayOf(T.any),
    timestamp: T.string,
    originalData: T.any,
    parentGenerationId: T.string,
  }

  getDefaultProps() {
    return {
      w: GENERATION_CARD_CONFIG.defaultSize.w,
      h: GENERATION_CARD_CONFIG.defaultSize.h,
      generationNumber: 1,
      generatedImage: '',
      likes: 0,
      comments: [],
      timestamp: GENERATION_CARD_CONFIG.defaultTimestamp(),
      originalData: {},
      parentGenerationId: '',
    }
  }

  getGeometry(shape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape) {
    const { generationNumber, generatedImage, likes, comments, timestamp } = shape.props
    
    const editor = useEditor()
    
    const [showComments, setShowComments] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [isLassoActive, setIsLassoActive] = useState(false)
    const [lassoPoints, setLassoPoints] = useState([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [regenerationPrompt, setRegenerationPrompt] = useState('')
    const [commentText, setCommentText] = useState('')
    const [isImageEnlarged, setIsImageEnlarged] = useState(false)
    
    const canvasRef = useRef(null)
    const imageRef = useRef(null)
    const enlargedCanvasRef = useRef(null)
    const enlargedImageRef = useRef(null)

    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date()
    const displayImage = generatedImage || GENERATION_CARD_CONFIG.placeholderImage

    // Calculate dynamic height based on what's visible
    const calculateHeight = () => {
      let height = GENERATION_CARD_CONFIG.defaultSize.h // base height
      if (editMode) height += GENERATION_CARD_CONFIG.editExtraHeight // add space for edit section
      if (showComments) height += GENERATION_CARD_CONFIG.commentsExtraHeight // add space for comments section
      return height
    }

    // Update shape height when sections expand/collapse
    useEffect(() => {
      const newHeight = calculateHeight()
      if (newHeight !== shape.props.h) {
        editor.updateShapes([{
          id: shape.id,
          type: 'generationCard',
          props: { 
            ...shape.props, 
            h: newHeight
          }
        }])
      }
    }, [editMode, showComments, comments.length])

    const handleLike = (e) => {
      e.stopPropagation()
      console.log('Like button clicked, current likes:', likes)
      editor.updateShapes([{
        id: shape.id,
        type: 'generationCard',
        props: { 
          ...shape.props, 
          likes: likes + 1 
        }
      }])
    }

    const handleAddComment = (e) => {
      e?.stopPropagation()
      if (!commentText.trim()) return
      
      const newComment = {
        author: GENERATION_CARD_CONFIG.defaultAuthor,
        text: commentText.trim(),
        timestamp: GENERATION_CARD_CONFIG.defaultTimestamp()
      }
      
      console.log('Adding comment:', newComment)
      editor.updateShapes([{
        id: shape.id,
        type: 'generationCard',
        props: { 
          ...shape.props, 
          comments: [...comments, newComment]
        }
      }])
      
      setCommentText('')
    }

    const handleExport = (e) => {
      e.stopPropagation()
      console.log('Export button clicked, image:', generatedImage)
      if (!generatedImage || generatedImage.includes('unsplash')) {
        alert('Cannot export placeholder image. Please generate an actual image first.')
        return
      }

      const link = document.createElement('a')
      link.href = generatedImage
      link.download = `generation-${generationNumber}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    const handleRegenerate = () => {
      if (lassoPoints.length === 0 && !regenerationPrompt.trim()) return
      
      console.log('Regenerating with:', {
        generationNumber,
        lassoPoints,
        regenerationPrompt: regenerationPrompt.trim(),
        originalData: shape.props.originalData
      })
      
      // Create a new generation card with incremented generation number
      const newGenerationNumber = generationNumber + 1
      const currentBounds = editor.getShapePageBounds(shape.id)
      
      // Position new card to the right of current card
      const newX = currentBounds.x + currentBounds.width + GENERATION_CARD_CONFIG.newCardOffset.x
      const newY = currentBounds.y + GENERATION_CARD_CONFIG.newCardOffset.y
      
      const cardId = createShapeId(GENERATION_CARD_CONFIG.createCardId())
      
      editor.createShapes([{
        id: cardId,
        type: 'generationCard',
        x: newX,
        y: newY,
        props: {
          w: GENERATION_CARD_CONFIG.defaultSize.w,
          h: GENERATION_CARD_CONFIG.defaultSize.h,
          generationNumber: newGenerationNumber,
          generatedImage: GENERATION_CARD_CONFIG.regeneratedPlaceholder, // Placeholder for regenerated image
          likes: 0,
          comments: [],
          timestamp: GENERATION_CARD_CONFIG.defaultTimestamp(),
          originalData: {
            ...shape.props.originalData,
            lassoSelection: lassoPoints,
            regenerationPrompt: regenerationPrompt.trim()
          },
          parentGenerationId: shape.id,
        },
      }])
      
      editor.select(cardId)
      
      // Clear lasso and prompt after creating new generation
      clearLasso()
      setRegenerationPrompt('')
      setEditMode(false)
    }

    const startLasso = (e) => {
      if (!isLassoActive) return
      e.stopPropagation()
      e.preventDefault()
      
      const canvas = isImageEnlarged ? enlargedCanvasRef.current : canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      
      console.log('Starting lasso at:', x, y)
      setIsDrawing(true)
      setLassoPoints([{ x, y }])
    }

    const drawLasso = (e) => {
      if (!isDrawing || !isLassoActive) return
      e.stopPropagation()
      e.preventDefault()
      
      const canvas = isImageEnlarged ? enlargedCanvasRef.current : canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY
      
      const newPoints = [...lassoPoints, { x, y }]
      setLassoPoints(newPoints)
      
      const ctx = canvas.getContext('2d')
      
      if (lassoPoints.length > 0) {
        const lastPoint = lassoPoints[lassoPoints.length - 1]
        ctx.strokeStyle = GENERATION_CARD_CONFIG.colors.primary
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    }

    const endLasso = (e) => {
      if (!isDrawing || !isLassoActive) return
      e.stopPropagation()
      e.preventDefault()
      
      console.log('Ending lasso, points:', lassoPoints.length)
      setIsDrawing(false)
      
      if (lassoPoints.length > 2) {
        const canvas = isImageEnlarged ? enlargedCanvasRef.current : canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        
        ctx.strokeStyle = GENERATION_CARD_CONFIG.colors.primary
        ctx.lineWidth = 2
        
        ctx.beginPath()
        ctx.moveTo(lassoPoints[lassoPoints.length - 1].x, lassoPoints[lassoPoints.length - 1].y)
        ctx.lineTo(lassoPoints[0].x, lassoPoints[0].y)
        ctx.stroke()
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
        ctx.beginPath()
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y)
        lassoPoints.forEach(point => {
          ctx.lineTo(point.x, point.y)
        })
        ctx.closePath()
        ctx.fill()
      }
    }

    const clearLasso = () => {
      setLassoPoints([])
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      if (enlargedCanvasRef.current) {
        const canvas = enlargedCanvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    const toggleLassoTool = () => {
      setIsLassoActive(!isLassoActive)
      if (isLassoActive) {
        clearLasso()
      }
    }

    const handleImageClick = (e) => {
      e.stopPropagation()
      if (!editMode) {
        setIsImageEnlarged(true)
      }
    }

    const closeEnlargedImage = (e) => {
      e.stopPropagation()
      setIsImageEnlarged(false)
      // Transfer lasso points from enlarged canvas to regular canvas if any
      if (lassoPoints.length > 0 && canvasRef.current && enlargedCanvasRef.current) {
        const enlargedCanvas = enlargedCanvasRef.current
        const regularCanvas = canvasRef.current
        const scaleX = regularCanvas.width / enlargedCanvas.width
        const scaleY = regularCanvas.height / enlargedCanvas.height
        
        // Scale down lasso points
        const scaledPoints = lassoPoints.map(point => ({
          x: point.x * scaleX,
          y: point.y * scaleY
        }))
        setLassoPoints(scaledPoints)
        
        // Redraw on regular canvas
        const ctx = regularCanvas.getContext('2d')
        ctx.clearRect(0, 0, regularCanvas.width, regularCanvas.height)
        
        if (scaledPoints.length > 2) {
          ctx.strokeStyle = GENERATION_CARD_CONFIG.colors.primary
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y)
          scaledPoints.forEach(point => ctx.lineTo(point.x, point.y))
          ctx.closePath()
          ctx.stroke()
          
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'
          ctx.fill()
        }
      }
    }

    useEffect(() => {
      if (canvasRef.current && imageRef.current && editMode && !isImageEnlarged) {
        const img = imageRef.current
        const canvas = canvasRef.current
        canvas.width = img.clientWidth
        canvas.height = img.clientHeight
      }
      
      if (enlargedCanvasRef.current && enlargedImageRef.current && isImageEnlarged && editMode) {
        const img = enlargedImageRef.current
        const canvas = enlargedCanvasRef.current
        canvas.width = img.clientWidth
        canvas.height = img.clientHeight
      }
    }, [editMode, isImageEnlarged])

    return (
      <>
      <HTMLContainer>
        <div
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            background: GENERATION_CARD_CONFIG.colors.surface,
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              background: `linear-gradient(135deg, ${GENERATION_CARD_CONFIG.colors.headerGradientFrom} 0%, ${GENERATION_CARD_CONFIG.colors.headerGradientTo} 100%)`,
              color: GENERATION_CARD_CONFIG.colors.headerText,
              fontWeight: '600',
              fontSize: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>✨ Generation {generationNumber}</span>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              {parsedTimestamp.toLocaleTimeString()}
            </span>
          </div>

          {/* Content */}
          <div style={{ padding: '16px', flex: 1, overflow: 'visible' }}>
            {/* Generated Image */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <img 
                ref={imageRef}
                src={displayImage}
                alt="Generated" 
                onClick={handleImageClick}
                style={{ 
                  width: '100%', 
                  height: '250px', 
                  objectFit: 'cover', 
                  borderRadius: '8px',
                  display: 'block',
                  cursor: editMode ? 'default' : 'pointer'
                }}
              />
              {editMode && (
                <canvas
                  ref={canvasRef}
                  onPointerDown={startLasso}
                  onPointerMove={drawLasso}
                  onPointerUp={endLasso}
                  onPointerLeave={endLasso}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '250px',
                    borderRadius: '8px',
                    cursor: isLassoActive ? 'crosshair' : 'default',
                    pointerEvents: isLassoActive ? 'auto' : 'none',
                    touchAction: 'none'
                  }}
                />
              )}
              {displayImage.includes('unsplash') && (
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
                onPointerDown={handleLike}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                ❤️ {likes}
              </button>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation()
                  console.log('Comments button clicked')
                  setShowComments(!showComments)
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: GENERATION_CARD_CONFIG.colors.muted,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                💬 {comments.length}
              </button>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation()
                  console.log('Edit button clicked')
                  setEditMode(!editMode)
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: editMode ? GENERATION_CARD_CONFIG.colors.primary : GENERATION_CARD_CONFIG.colors.muted,
                  color: editMode ? GENERATION_CARD_CONFIG.colors.headerText : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                ✏️ Edit
              </button>
              <button
                onPointerDown={handleExport}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: GENERATION_CARD_CONFIG.colors.muted,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                📥 Export
              </button>
            </div>

            {/* Edit Mode */}
              {editMode && (
              <div style={{
                padding: '12px',
                background: GENERATION_CARD_CONFIG.colors.infoBg,
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #dbeafe'
                }}>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      toggleLassoTool()
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: isLassoActive ? GENERATION_CARD_CONFIG.colors.primary : GENERATION_CARD_CONFIG.colors.surface,
                      color: isLassoActive ? GENERATION_CARD_CONFIG.colors.headerText : '#374151',
                      border: `2px solid ${isLassoActive ? GENERATION_CARD_CONFIG.colors.primary : GENERATION_CARD_CONFIG.colors.mutedBorder}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    ✏️ {isLassoActive ? 'Lasso Active' : 'Enable Lasso'}
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      clearLasso()
                    }}
                    disabled={lassoPoints.length === 0}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: lassoPoints.length === 0 ? GENERATION_CARD_CONFIG.colors.muted : GENERATION_CARD_CONFIG.colors.surface,
                      color: lassoPoints.length === 0 ? '#9ca3af' : '#374151',
                      border: `2px solid ${GENERATION_CARD_CONFIG.colors.mutedBorder}`,
                      borderRadius: '6px',
                      cursor: lassoPoints.length === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    🗑️ Clear
                  </button>
                </div>

                {isLassoActive && (
                  <div style={{
                    padding: '8px 12px',
                    background: GENERATION_CARD_CONFIG.colors.infoBg,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: GENERATION_CARD_CONFIG.colors.infoText,
                    marginBottom: '12px',
                  }}>
                    💡 Click and drag on the image to draw a selection area
                  </div>
                )}

                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                  Regeneration Prompt:
                </div>
                <textarea
                  value={regenerationPrompt}
                  onChange={(e) => setRegenerationPrompt(e.target.value)}
                  placeholder="Describe what you'd like to change..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: `1px solid ${GENERATION_CARD_CONFIG.colors.mutedBorder}`,
                    fontSize: '13px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    handleRegenerate()
                  }}
                  disabled={lassoPoints.length === 0 && !regenerationPrompt.trim()}
                  style={{
                    marginTop: '8px',
                    padding: '8px 16px',
                    background: (lassoPoints.length === 0 && !regenerationPrompt.trim()) ? '#9ca3af' : GENERATION_CARD_CONFIG.colors.primary,
                    color: GENERATION_CARD_CONFIG.colors.headerText,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (lassoPoints.length === 0 && !regenerationPrompt.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  🔄 Regenerate
                </button>
              </div>
            )}

            {/* Comments Section */}
            {showComments && (
              <div style={{
                padding: '12px',
                background: GENERATION_CARD_CONFIG.colors.surfaceAlt,
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937', marginBottom: '12px' }}>
                  Comments:
                </div>
                
                <div style={{ marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                  {comments.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    comments.map((comment, idx) => (
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

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        handleAddComment()
                      }
                    }}
                    placeholder="Add a comment..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${GENERATION_CARD_CONFIG.colors.mutedBorder}`,
                      fontSize: '12px',
                    }}
                  />
                  <button
                    onPointerDown={handleAddComment}
                    disabled={!commentText.trim()}
                    style={{
                      padding: '8px 16px',
                      background: commentText.trim() ? GENERATION_CARD_CONFIG.colors.primary : '#9ca3af',
                      color: GENERATION_CARD_CONFIG.colors.headerText,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: commentText.trim() ? 'pointer' : 'not-allowed',
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
      </HTMLContainer>
      {/* Render modal outside HTMLContainer using portal */}
      {isImageEnlarged && createPortal(
        <div
          onClick={closeEnlargedImage}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '40px',
          }}
        >
          <button
            onClick={closeEnlargedImage}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 10001,
            }}
          >
            ✕
          </button>
          
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <img
              ref={enlargedImageRef}
              src={displayImage}
              alt="Enlarged"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px',
                display: 'block',
              }}
            />
            
            {editMode && (
              <canvas
                ref={enlargedCanvasRef}
                onPointerDown={startLasso}
                onPointerMove={drawLasso}
                onPointerUp={endLasso}
                onPointerLeave={endLasso}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  cursor: isLassoActive ? 'crosshair' : 'default',
                  pointerEvents: isLassoActive ? 'auto' : 'none',
                  touchAction: 'none',
                }}
              />
            )}
          </div>
        </div>,
        document.body
      )}
      </>
    )
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

// Helper function to create a generation card
export function createGenerationCardAsShapes(editor, data) {
  const { position: { x, y }, generationNumber, generatedImage, originalData, parentGenerationId } = data

  const cardId = createShapeId(GENERATION_CARD_CONFIG.createCardId())
  
  editor.createShapes([
    {
      id: cardId,
      type: 'generationCard',
      x,
      y,
      props: {
        w: GENERATION_CARD_CONFIG.defaultSize.w,
        h: GENERATION_CARD_CONFIG.defaultSize.h,
        generationNumber: generationNumber || 1,
        generatedImage: generatedImage || GENERATION_CARD_CONFIG.regeneratedPlaceholder, // Placeholder garden image
        likes: 0,
        comments: [],
        timestamp: GENERATION_CARD_CONFIG.defaultTimestamp(),
        originalData: originalData || {},
        parentGenerationId: parentGenerationId || '',
      },
    },
  ])

  editor.select(cardId)
  return cardId
}
