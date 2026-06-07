import SigniitLogo from '../components/SigniitLogo'

export default function HomeScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--sig-paper)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      <SigniitLogo variant="light" size="lg" />
      <p style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '11px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--sig-stone)',
      }}>
        Dashboard — próximamente
      </p>
    </div>
  )
}
