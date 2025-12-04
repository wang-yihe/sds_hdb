import { 
  HTMLContainer, 
  ShapeUtil,
  createShapeId,
  Rectangle2d,
  T
} from 'tldraw'

// Shape Util class
export class OriginalCardShapeUtil extends ShapeUtil {
  static type = 'originalCard'
  static props = {
    w: T.number,
    h: T.number,
    styleImage: T.string,
    perspectiveImage: T.string,
    plants: T.arrayOf(T.string),
    prompt: T.string,
  }

  getDefaultProps() {
    return {
      w: 320,
      h: 400,
      styleImage: '',
      perspectiveImage: '',
      plants: [],
      prompt: '',
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
    const { styleImage, perspectiveImage, plants, prompt } = shape.props

    return (
      <HTMLContainer>
        <div
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
            }}
          >
            📋 Original Inputs
          </div>

          {/* Content */}
          <div
            style={{
              padding: '16px',
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Style Reference */}
            {styleImage && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  Style Reference:
                </div>
                <img
                  src={styleImage}
                  alt="Style"
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />
              </div>
            )}

            {/* Perspective View */}
            {perspectiveImage && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  Perspective View:
                </div>
                <img
                  src={perspectiveImage}
                  alt="Perspective"
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />
              </div>
            )}

            {/* Plants */}
            {plants.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  Plants Used:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {plants.map((plant, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        background: '#f3f4f6',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#374151',
                      }}
                    >
                      🌱 {plant}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt */}
            {prompt && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '8px',
                  }}
                >
                  Prompt:
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: '1.5',
                  }}
                >
                  {prompt}
                </div>
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

// Helper function to create an original card
export function createOriginalCardAsShapes(editor, data) {
  const { position: { x, y }, styleImage, perspectiveImage, plants = [], prompt = '' } = data

  // Calculate dynamic height based on content
  const baseHeight = 60 // header
  const imageHeight = (styleImage ? 180 : 0) + (perspectiveImage ? 180 : 0)
  const plantsHeight = plants.length > 0 ? 80 : 0
  const promptHeight = prompt ? 120 : 0
  const calculatedHeight = baseHeight + imageHeight + plantsHeight + promptHeight + 40

  const cardId = createShapeId(`originalCard_${Date.now()}`)
  
  editor.createShapes([
    {
      id: cardId,
      type: 'originalCard',
      x,
      y,
      props: {
        w: 320,
        h: calculatedHeight,
        styleImage: styleImage || '',
        perspectiveImage: perspectiveImage || '',
        plants: plants,
        prompt: prompt || '',
      },
    },
  ])

  editor.select(cardId)
  return cardId
}
