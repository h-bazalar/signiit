// Signiit — Brand Colors
// Usar en componentes donde no se pueda usar CSS variables o Tailwind

export const colors = {
  forest:     '#0F4A38',
  forestD:    '#0D3B2E',
  signal:     '#1A6B5A',
  mid:        '#3DAB8E',
  mint:       '#5EC9AD',
  mintLight:  '#C8F0E6',
  paper:      '#F7F5F0',
  warm:       '#F0EDE6',
  stone:      '#8C8880',

  // Awareness
  awGreen:    '#E4F5EF',
  awBlue:     '#EBF0FB',
  awAmber:    '#FDF3E4',
  awGreenText:'#0F4A38',
  awBlueText: '#1A3A7A',
  awAmberText:'#7A4A10',

  // Awareness borders
  awGreenBorder: '#3DAB8E',
  awBlueBorder:  '#2E5FBE',
  awAmberBorder: '#C07820',
}

// Awareness levels — labels para el usuario final
export const awarenessLevels = [
  {
    id: 'solution_aware',
    label: 'Atrae nuevos clientes',
    sublabel: 'Solution Aware',
    color: colors.awGreen,
    textColor: colors.awGreenText,
    borderColor: colors.awGreenBorder,
    dot: colors.mid,
    badge: 'AWARENESS_1',
  },
  {
    id: 'product_aware',
    label: 'Convence al interesado',
    sublabel: 'Product Aware',
    color: colors.awBlue,
    textColor: colors.awBlueText,
    borderColor: colors.awBlueBorder,
    dot: '#2E5FBE',
    badge: 'AWARENESS_2',
  },
  {
    id: 'most_aware',
    label: 'Cierra al decidido',
    sublabel: 'Most Aware',
    color: colors.awAmber,
    textColor: colors.awAmberText,
    borderColor: colors.awAmberBorder,
    dot: '#C07820',
    badge: 'AWARENESS_3',
  },
]
