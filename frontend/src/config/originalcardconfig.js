// Centralized config for the Original Card (no magic numbers in the shape)
export const ORIGINAL_CARD_CONFIG = {
  defaultSize: { w: 320, h: 400 },
  // section heights used for dynamic total height calc
  headerHeight: 60,
  imageBlockOuter: 180, // label + 150px image + margins
  plantsMinHeight: 80,
  promptMinHeight: 120,
  paddingBottom: 40,

  // defaults/placeholders
  placeholderStyleImage: '',
  placeholderPerspectiveImage: '',
  defaultPlants: [],
  defaultPrompt: '',

  // id generator
  createCardId: () => {
    const rand = (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    return `originalCard_${rand}`
  },

  // theme tokens (edit these instead of inline colors)
  colors: {
    headerFrom: '#667eea',
    headerTo: '#764ba2',
    headerText: '#ffffff',
    surface: '#ffffff',
    label: '#6b7280',
    chipBg: '#f3f4f6',
    chipFg: '#374151',
    promptBg: '#f9fafb',
    promptFg: '#374151',
    border: 'rgba(0, 0, 0, 0.15)',
  },
  radii: {
    card: 12,
    image: 8,
    chip: 12,
    prompt: 8,
  },
  shadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  fonts: {
    base: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
}
