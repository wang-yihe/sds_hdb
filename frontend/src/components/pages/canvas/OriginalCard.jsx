import { 
  HTMLContainer, 
  ShapeUtil,
  createShapeId,
  Rectangle2d,
  T
} from 'tldraw'
import { ORIGINAL_CARD_CONFIG } from '../../../config/originalcardconfig'

// Shape Util class
export class OriginalCardShapeUtil extends ShapeUtil {
  static type = 'originalCard'
  static props = {
    w: T.number,
    h: T.number,
    styleImages: T.arrayOf(T.string),
    perspectiveImages: T.arrayOf(T.string),
    plants: T.arrayOf(
      T.object({
        botanical_name: T.string,
        image: T.string.nullable() // base64 string or null
      })
    ),
    prompt: T.string,
  }

  static migrations = {
    currentVersion: 0,
    migrators: {}
  }

  getDefaultProps() {
    return {
      w: ORIGINAL_CARD_CONFIG.defaultSize.w,
      h: ORIGINAL_CARD_CONFIG.defaultSize.h,
      styleImages: [],
      perspectiveImages: [],
      plants: ORIGINAL_CARD_CONFIG.defaultPlants,
      prompt: ORIGINAL_CARD_CONFIG.defaultPrompt,
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
    const { styleImages, perspectiveImages, plants, prompt } = shape.props

    return (
      <HTMLContainer>
        <div
          style={{
            width: '100%',
            height: '100%',
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            background: ORIGINAL_CARD_CONFIG.colors.surface,
            borderRadius: `${ORIGINAL_CARD_CONFIG.radii.card}px`,
            boxShadow: ORIGINAL_CARD_CONFIG.shadow,
            overflow: 'hidden',
            fontFamily: ORIGINAL_CARD_CONFIG.fonts.base,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              background: `linear-gradient(135deg, ${ORIGINAL_CARD_CONFIG.colors.headerFrom} 0%, ${ORIGINAL_CARD_CONFIG.colors.headerTo} 100%)`,
              color: ORIGINAL_CARD_CONFIG.colors.headerText,
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
            {styleImages && styleImages.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: ORIGINAL_CARD_CONFIG.colors.label,
                    marginBottom: '8px',
                  }}
                >
                  Style Reference ({styleImages.length}):
                </div>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: styleImages.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '8px'
                }}>
                  {styleImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Style ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: `${ORIGINAL_CARD_CONFIG.radii.image}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Perspective View */}
            {perspectiveImages && perspectiveImages.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: ORIGINAL_CARD_CONFIG.colors.label,
                    marginBottom: '8px',
                  }}
                >
                  Perspective View ({perspectiveImages.length}):
                </div>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: perspectiveImages.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '8px'
                }}>
                  {perspectiveImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Perspective ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: `${ORIGINAL_CARD_CONFIG.radii.image}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Plants */}
            {plants.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: ORIGINAL_CARD_CONFIG.colors.label,
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
                        background: ORIGINAL_CARD_CONFIG.colors.chipBg,
                        borderRadius: `${ORIGINAL_CARD_CONFIG.radii.chip}px`,
                        fontSize: '12px',
                        color: ORIGINAL_CARD_CONFIG.colors.chipFg,
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
                    color: ORIGINAL_CARD_CONFIG.colors.label,
                    marginBottom: '8px',
                  }}
                >
                  Prompt:
                </div>
                <div
                  style={{
                    padding: '12px',
                    background: ORIGINAL_CARD_CONFIG.colors.promptBg,
                    borderRadius: `${ORIGINAL_CARD_CONFIG.radii.prompt}px`,
                    fontSize: '13px',
                    color: ORIGINAL_CARD_CONFIG.colors.promptFg,
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
  const { position: { x, y }, styleImages = [], perspectiveImages = [], plants = [], prompt = '' } = data

  // Calculate dynamic height based on content
  const baseHeight = ORIGINAL_CARD_CONFIG.headerHeight
  
  // Account for multiple rows if there are many images (2 per row)
  const styleImageRows = styleImages.length > 0 ? Math.ceil(styleImages.length / 2) : 0
  const perspectiveImageRows = perspectiveImages.length > 0 ? Math.ceil(perspectiveImages.length / 2) : 0
  const imageHeight = (styleImageRows + perspectiveImageRows) * ORIGINAL_CARD_CONFIG.imageBlockOuter
  
  const plantsHeight = plants.length > 0 ? ORIGINAL_CARD_CONFIG.plantsMinHeight : 0
  const promptHeight = prompt ? ORIGINAL_CARD_CONFIG.promptMinHeight : 0
  const calculatedHeight = baseHeight + imageHeight + plantsHeight + promptHeight + ORIGINAL_CARD_CONFIG.paddingBottom

  const cardId = createShapeId(ORIGINAL_CARD_CONFIG.createCardId())
  
  editor.createShapes([
    {
      id: cardId,
      type: 'originalCard',
      x,
      y,
      props: {
        w: ORIGINAL_CARD_CONFIG.defaultSize.w,
        h: calculatedHeight,
        styleImages: styleImages,
        perspectiveImages: perspectiveImages,
        plants: plants,
        prompt: prompt || ORIGINAL_CARD_CONFIG.defaultPrompt,
      },
    },
  ])

  editor.select(cardId)
  return cardId
}
