import { 
  HTMLContainer, 
  ShapeUtil,
  createShapeId,
  Rectangle2d,
  T,
  useEditor
} from 'tldraw'
import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

// Video Card Configuration
export const VIDEO_CARD_CONFIG = {
  defaultSize: { w: 380, h: 500 },
  placeholderVideo: 'https://www.w3schools.com/html/mov_bbb.mp4', // Sample video
  colors: {
    headerGradientFrom: '#8b5cf6',
    headerGradientTo: '#7c3aed',
    headerText: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f9fafb',
    primary: '#8b5cf6',
    muted: '#f3f4f6',
    mutedBorder: '#d1d5db',
  },
  defaultTimestamp: () => new Date().toISOString(),
  createCardId: () => {
    const rand = (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    return `videoCard_${rand}`
  },
}

// Shape Util class for Video Card
export class VideoCardShapeUtil extends ShapeUtil {
  static type = 'videoCard'
  static props = {
    w: T.number,
    h: T.number,
    generationNumber: T.number,
    videoUrl: T.string,
    timestamp: T.string,
    sourceGenerationId: T.string,
    originalData: T.any,
  }

  getDefaultProps() {
    return {
      w: VIDEO_CARD_CONFIG.defaultSize.w,
      h: VIDEO_CARD_CONFIG.defaultSize.h,
      generationNumber: 1,
      videoUrl: '',
      timestamp: VIDEO_CARD_CONFIG.defaultTimestamp(),
      sourceGenerationId: '',
      originalData: {},
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
    const { generationNumber, videoUrl, timestamp } = shape.props
    
    const editor = useEditor()
    const videoRef = useRef(null)
    const [isVideoEnlarged, setIsVideoEnlarged] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)

    const parsedTimestamp = timestamp ? new Date(timestamp) : new Date()
    const displayVideo = videoUrl || VIDEO_CARD_CONFIG.placeholderVideo

    const handleVideoClick = (e) => {
      e.stopPropagation()
      setIsVideoEnlarged(true)
    }

    const closeEnlargedVideo = (e) => {
      e.stopPropagation()
      setIsVideoEnlarged(false)
    }

    const handlePlayPause = (e) => {
      e.stopPropagation()
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
      }
    }

    const handleDownload = (e) => {
      e.stopPropagation()
      if (!videoUrl || videoUrl.includes('w3schools')) {
        alert('Cannot export placeholder video. Please generate an actual video first.')
        return
      }

      const link = document.createElement('a')
      link.href = videoUrl
      link.download = `generation-${generationNumber}-video-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

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
            background: VIDEO_CARD_CONFIG.colors.surface,
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
              background: `linear-gradient(135deg, ${VIDEO_CARD_CONFIG.colors.headerGradientFrom} 0%, ${VIDEO_CARD_CONFIG.colors.headerGradientTo} 100%)`,
              color: VIDEO_CARD_CONFIG.colors.headerText,
              fontWeight: '600',
              fontSize: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>🎬 Generation {generationNumber} Video</span>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              {parsedTimestamp.toLocaleTimeString()}
            </span>
          </div>

          {/* Content */}
          <div style={{ padding: '16px', flex: 1 }}>
            {/* Video Player */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <video
                ref={videoRef}
                src={displayVideo}
                onClick={handleVideoClick}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{
                  width: '100%',
                  height: '300px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  display: 'block',
                  cursor: 'pointer',
                  backgroundColor: '#000',
                }}
                controls={false}
              />
              
              {/* Play/Pause Overlay */}
              <div
                onClick={handlePlayPause}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(139, 92, 246, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </div>
              </div>

              {displayVideo.includes('w3schools') && (
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
                  🎬 Placeholder
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                onPointerDown={handlePlayPause}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: VIDEO_CARD_CONFIG.colors.primary,
                  color: VIDEO_CARD_CONFIG.colors.headerText,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
              </button>
              <button
                onPointerDown={handleDownload}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: VIDEO_CARD_CONFIG.colors.muted,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                📥 Download
              </button>
              <button
                onPointerDown={handleVideoClick}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: VIDEO_CARD_CONFIG.colors.muted,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                🔍 Enlarge
              </button>
            </div>

            {/* Video Info */}
            <div style={{
              padding: '12px',
              background: VIDEO_CARD_CONFIG.colors.surfaceAlt,
              borderRadius: '8px',
              fontSize: '13px',
              color: '#374151',
            }}>
              <div style={{ marginBottom: '8px', fontWeight: '500' }}>
                📹 Video Information
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
                <div>Generation Number: {generationNumber}</div>
                <div>Created: {parsedTimestamp.toLocaleString()}</div>
                <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                  This video was generated based on Generation {generationNumber} image.
                </div>
              </div>
            </div>
          </div>
        </div>
      </HTMLContainer>

      {/* Enlarged Video Modal */}
      {isVideoEnlarged && createPortal(
        <div
          onClick={closeEnlargedVideo}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '40px',
          }}
        >
          <button
            onClick={closeEnlargedVideo}
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
            }}
          >
            <video
              src={displayVideo}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              }}
            />
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

// Helper function to create a video card
export function createVideoCardAsShapes(editor, data) {
  const { position: { x, y }, generationNumber, videoUrl, originalData, sourceGenerationId } = data

  const cardId = createShapeId(VIDEO_CARD_CONFIG.createCardId())
  
  editor.createShapes([
    {
      id: cardId,
      type: 'videoCard',
      x,
      y,
      props: {
        w: VIDEO_CARD_CONFIG.defaultSize.w,
        h: VIDEO_CARD_CONFIG.defaultSize.h,
        generationNumber: generationNumber || 1,
        videoUrl: videoUrl || VIDEO_CARD_CONFIG.placeholderVideo,
        timestamp: VIDEO_CARD_CONFIG.defaultTimestamp(),
        sourceGenerationId: sourceGenerationId || '',
        originalData: originalData || {},
      },
    },
  ])

  editor.select(cardId)
  return cardId
}
