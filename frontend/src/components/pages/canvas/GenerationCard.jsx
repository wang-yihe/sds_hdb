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
import { createVideoCardAsShapes } from './VideoCard'
import { useGenerateAllSmart } from '@/hooks/useAi'

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
    isGenerating: T.boolean,
    error: T.string,
  }

  static migrations = {
    currentVersion: 0,
    migrators: {}
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
      isGenerating: false,
      error: '',
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
    const { generationNumber, generatedImage, likes, comments, timestamp, isGenerating, error } = shape.props
    
    const editor = useEditor()
    const { generate } = useGenerateAllSmart()
    
    const [showComments, setShowComments] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [isLassoActive, setIsLassoActive] = useState(false)
    const [lassoPoints, setLassoPoints] = useState([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [regenerationPrompt, setRegenerationPrompt] = useState('')
    const [commentText, setCommentText] = useState('')
    const [isImageEnlarged, setIsImageEnlarged] = useState(false)
    const [selectedPlants, setSelectedPlants] = useState([])
    
    // Add this new state for the Blob URL
    const [displayImageUrl, setDisplayImageUrl] = useState(null)
    
    const canvasRef = useRef(null)
    const imageRef = useRef(null)
    const enlargedCanvasRef = useRef(null)
    const enlargedImageRef = useRef(null)

    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date()
    
    // Convert base64 to Blob URL for display
    useEffect(() => {
      if (generatedImage) {
        const base64ToBlobUrl = (base64String) => {
          try {
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '')
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            
            const blob = new Blob([bytes], { type: 'image/png' })
            return URL.createObjectURL(blob)
          } catch (error) {
            console.error('Failed to convert base64 to blob URL:', error)
            return null
          }
        }

        const blobUrl = base64ToBlobUrl(generatedImage)
        setDisplayImageUrl(blobUrl)

        return () => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
          }
        }
      } else {
        setDisplayImageUrl(null)
      }
    }, [generatedImage])
    
    // Use displayImageUrl instead of generatedImage for rendering
    const displayImage = displayImageUrl || GENERATION_CARD_CONFIG.placeholderImage

    // Add a ref to track if generation has been initiated
    const initialGenerationAttempted = useRef(false)

    useEffect(() => {
        // 1. Check if the initial attempt has been made
        if (initialGenerationAttempted.current) {
            return;
        }
        
        const shouldGenerate = !generatedImage && 
                              !isGenerating && 
                              !error && 
                              shape.props.originalData &&
                              Object.keys(shape.props.originalData).length > 0

        if (shouldGenerate) {
            // 2. Set the flag before calling the function
            initialGenerationAttempted.current = true;
            handleAIGeneration()
        }
    }, []) // Only run once on mount (or twice in Strict Mode, but the ref stops the second dispatch)

    const handleAIGeneration = async () => {
      const { originalData } = shape.props

      // Set generating state
      editor.updateShapes([{
        id: shape.id,
        type: 'generationCard',
        props: { 
          ...shape.props, 
          isGenerating: true,
          error: ''
        }
      }])

      try {
        // Prepare generation form
        const generationForm = {
          styleImages: originalData.styleImages || [],
          perspectiveImages: originalData.perspectiveImages || [],
          selectedPlants: originalData.selectedPlants || originalData.plants || [],
          prompt: originalData.prompt || '',
          // Include regeneration data if this is a regeneration
          lassoSelection: originalData.lassoSelection || null,
          regenerationPrompt: originalData.regenerationPrompt || null,
        }

        console.log('Generating with:', generationForm)

        // Call AI generation API
        const result = await generate(generationForm).unwrap()

        console.log('Generation result:', result)

        // Update shape with generated image
        editor.updateShapes([{
          id: shape.id,
          type: 'generationCard',
          props: { 
            ...shape.props, 
            generatedImage: result,
            isGenerating: false,
            error: ''
          }
        }]
        )
      } catch (err) {
        console.error('Generation failed:', err)
        
        // Update shape with error state
        editor.updateShapes([{
          id: shape.id,
          type: 'generationCard',
          props: { 
            ...shape.props, 
            isGenerating: false,
            error: err.message || 'Generation failed'
          }
        }])
      }
    }

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
    }, [editMode, showComments, comments.length, selectedPlants.length])

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

    const handleRegenerate = async () => {
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
          generatedImage: generatedImage || '', // Will be filled by AI generation
          likes: 0,
          comments: [],
          timestamp: GENERATION_CARD_CONFIG.defaultTimestamp(),
          originalData: {
            ...shape.props.originalData,
            lassoSelection: lassoPoints,
            regenerationPrompt: regenerationPrompt.trim(),
            selectedPlants: selectedPlants
          },
          parentGenerationId: shape.id,
          isGenerating: false, // Will trigger on mount
          error: '',
        },
      }])
      
      editor.select(cardId)
      
      // Clear lasso and prompt after creating new generation
      clearLasso()
      setRegenerationPrompt('')
      setSelectedPlants([])
      setEditMode(false)
    }

    const handleGenerateVideo = (e) => {
      e.stopPropagation()
      
      console.log('Generating video from generation:', generationNumber)
      
      const currentBounds = editor.getShapePageBounds(shape.id)
      
      // Position video card below current card
      const newX = currentBounds.x
      const newY = currentBounds.y + currentBounds.height + 50
      
      createVideoCardAsShapes(editor, {
        position: { x: newX, y: newY },
        generationNumber: generationNumber,
        videoUrl: null, // Will be filled by API response
        originalData: shape.props.originalData,
        sourceGenerationId: shape.id,
      })
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
            minHeight: '100%',
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
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Generated Image */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              {isGenerating ? (
                <div style={{
                  width: '100%',
                  height: '250px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.3)',
                    borderTop: '4px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                    Generating your landscape...
                  </div>
                </div>
              ) : error ? (
                <div style={{
                  width: '100%',
                  height: '250px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  border: '2px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '32px' }}>⚠️</div>
                  <div style={{ color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>
                    Generation Failed
                  </div>
                  <div style={{ color: '#991b1b', fontSize: '12px', textAlign: 'center' }}>
                    {error}
                  </div>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      handleAIGeneration()
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    🔄 Retry
                  </button>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onPointerDown={handleLike}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isGenerating ? '#e5e7eb' : '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  opacity: isGenerating ? 0.5 : 1
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
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isGenerating ? '#e5e7eb' : GENERATION_CARD_CONFIG.colors.muted,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  opacity: isGenerating ? 0.5 : 1
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
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: editMode ? GENERATION_CARD_CONFIG.colors.primary : (isGenerating ? '#e5e7eb' : GENERATION_CARD_CONFIG.colors.muted),
                  color: editMode ? GENERATION_CARD_CONFIG.colors.headerText : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  opacity: isGenerating ? 0.5 : 1
                }}
              >
                ✏️ Edit
              </button>
              <button
                onPointerDown={handleExport}
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isGenerating ? '#e5e7eb' : GENERATION_CARD_CONFIG.colors.muted,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  opacity: isGenerating ? 0.5 : 1
                }}
              >
                📥 Export
              </button>
            </div>

            {/* Generate Video Button */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onPointerDown={handleGenerateVideo}
                disabled={isGenerating}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isGenerating ? '#e5e7eb' : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s',
                  opacity: isGenerating ? 0.5 : 1
                }}
                onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                🎬 Generate Video
              </button>
            </div>

            {/* Edit Mode */}
              {editMode && !isGenerating && (
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

                {/* Suggested Plants Section */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937', marginBottom: '8px' }}>
                    🌱 Suggested Plants:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {['Monstera', 'Fern', 'Snake Plant', 'Pothos', 'Peace Lily', 'Rubber Plant', 'Fiddle Leaf Fig', 'Spider Plant'].map((plant) => (
                      <button
                        key={plant}
                        onPointerDown={(e) => {
                          e.stopPropagation()
                          setSelectedPlants(prev => 
                            prev.includes(plant) 
                              ? prev.filter(p => p !== plant)
                              : [...prev, plant]
                          )
                        }}
                        style={{
                          padding: '6px 12px',
                          background: selectedPlants.includes(plant) 
                            ? GENERATION_CARD_CONFIG.colors.primary 
                            : GENERATION_CARD_CONFIG.colors.surface,
                          color: selectedPlants.includes(plant) 
                            ? GENERATION_CARD_CONFIG.colors.headerText 
                            : '#374151',
                          border: `1px solid ${selectedPlants.includes(plant) 
                            ? GENERATION_CARD_CONFIG.colors.primary 
                            : GENERATION_CARD_CONFIG.colors.mutedBorder}`,
                          borderRadius: '16px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                        }}
                      >
                        {plant}
                      </button>
                    ))}
                  </div>
                  {selectedPlants.length > 0 && (
                    <div style={{
                      padding: '6px 10px',
                      background: '#f0fdf4',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#15803d',
                    }}>
                      ✓ {selectedPlants.length} plant{selectedPlants.length !== 1 ? 's' : ''} selected: {selectedPlants.join(', ')}
                    </div>
                  )}
                </div>

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

        {/* CSS for spinning animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        generatedImage: generatedImage || '', // Empty string triggers AI generation on mount
        likes: 0,
        comments: [],
        timestamp: GENERATION_CARD_CONFIG.defaultTimestamp(),
        originalData: originalData || {},
        parentGenerationId: parentGenerationId || '',
        isGenerating: false, // Initialize to false
        error: '', // Initialize to empty string
      },
    },
  ])

  editor.select(cardId)
  return cardId
}