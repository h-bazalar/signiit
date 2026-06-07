// Signiit — Logo Component
//
// Uso:
//   <SigniitLogo />                    dark md
//   <SigniitLogo variant="light" />    versión clara
//   <SigniitLogo size="lg" />          tamaño grande
//   <SigniitLogo animated={false} />   sin animación
//   <SigniitLogo iconOnly />           solo ícono radar

const SIZES = {
  sm: { icon: 28, font: 18, gap: 8 },
  md: { icon: 36, font: 24, gap: 10 },
  lg: { icon: 48, font: 32, gap: 14 },
  xl: { icon: 64, font: 44, gap: 18 },
}

const VARIANTS = {
  dark:  { icon: '#5EC9AD', body: '#F0EDE6', it: '#5EC9AD' },
  light: { icon: '#0F4A38', body: '#0F4A38', it: '#3DAB8E' },
}

export default function SigniitLogo({
  variant  = 'dark',
  size     = 'md',
  animated = true,
  iconOnly = false,
  className = '',
  style = {},
}) {
  const s = SIZES[size] || SIZES.md
  const v = VARIANTS[variant] || VARIANTS.dark
  const cx = s.icon / 2
  const cy = s.icon / 2

  const ringStyle = animated ? {
    transformOrigin: `${cx}px ${cy}px`,
    animation: 'sig-pulse-ring 2.8s ease-out infinite',
  } : {}

  const dotStyle = animated ? {
    transformOrigin: `${cx}px ${cy}px`,
    animation: 'sig-heartbeat 2.8s ease-in-out infinite',
  } : {}

  const itStyle = animated ? {
    animation: 'sig-it-pulse 2.8s ease-in-out infinite',
    animationDelay: '1.4s',
    display: 'inline',
  } : {}

  const op = variant === 'dark'
    ? { r1: 0.6, r2: 0.38, r3: 0.22 }
    : { r1: 0.65, r2: 0.35, r3: 0.18 }

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: s.gap, ...style }}
    >
      <svg width={s.icon} height={s.icon} viewBox={`0 0 ${s.icon} ${s.icon}`} fill="none" aria-hidden="true">
        <circle cx={cx} cy={cy} r={s.icon * 0.44} stroke={v.icon} strokeWidth={s.icon * 0.032} opacity={op.r1} style={{ ...ringStyle, animationDelay: '0s' }} />
        <circle cx={cx} cy={cy} r={s.icon * 0.29} stroke={v.icon} strokeWidth={s.icon * 0.025} opacity={op.r2} style={{ ...ringStyle, animationDelay: '0.7s' }} />
        <circle cx={cx} cy={cy} r={s.icon * 0.15} stroke={v.icon} strokeWidth={s.icon * 0.02}  opacity={op.r3} style={{ ...ringStyle, animationDelay: '1.4s' }} />
        <circle cx={cx} cy={cy} r={s.icon * 0.055} fill={v.icon} style={dotStyle} />
      </svg>

      {!iconOnly && (
        <span
          aria-label="Signiit"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: s.font,
            fontWeight: 400,
            letterSpacing: '-0.4px',
            lineHeight: 1,
            color: v.body,
            userSelect: 'none',
          }}
        >
          Signi<span style={{ color: v.it, ...itStyle }}>it</span>
        </span>
      )}
    </div>
  )
}
