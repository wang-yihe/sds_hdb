// Centralized, tweakable configuration (no hard-coded literals in components)
export const GENERATION_CARD_CONFIG = {
  defaultSize: { w: 380, h: 450 },
  editExtraHeight: 250,
  commentsExtraHeight: 200,
  placeholderImage:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  regeneratedPlaceholder:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  newCardOffset: { x: 50, y: 0 },
  defaultAuthor: 'User',
  defaultTimestamp: () => new Date().toISOString(),
  createCardId: () => {
    const rand = (globalThis.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    return `generationCard_${rand}`
  },
  // styling tokens you might theme later
  colors: {
    headerGradientFrom: '#10b981',
    headerGradientTo: '#059669',
    headerText: '#ffffff',
    surface: '#ffffff',
    surfaceAlt: '#f9fafb',
    primary: '#3b82f6',
    muted: '#f3f4f6',
    mutedBorder: '#d1d5db',
    infoBg: '#dbeafe',
    infoText: '#1e40af',
  },
  spacing: {
    cardGap: 50,
  },
}
