import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import SigniitLogo from './SigniitLogo'

const NAV_ITEMS = [
  { path: '/',         label: 'Inicio',   icon: '⬡' },
  { path: '/negocios', label: 'Negocios', icon: '◎' },
  { path: '/campanas', label: 'Campañas', icon: '◈' },
  { path: '/analisis', label: 'Análisis', icon: '◇' },
  { path: '/planes',   label: 'Planes',   icon: '◻' },
]

export default function AppLayout({ children, planActual }) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState(null)
  const [hoveredSignOut, setHoveredSignOut] = useState(false)

  const nombre = user?.firstName || user?.fullName?.split(' ')[0] || 'Usuario'
  const email = user?.emailAddresses?.[0]?.emailAddress || ''

  const planLabels = { free: 'Free', basico: 'Básico', pro: 'Pro' }
  const planLabel = planLabels[planActual] || 'Free'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F7F5F0' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '220px',
        minHeight: '100vh',
        background: '#0F4A38',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}>

        {/* Logo */}
        <div style={{ padding: '28px 24px 24px', borderBottom: '0.5px solid rgba(240,237,230,0.08)' }}>
          <SigniitLogo variant="dark" size="sm" />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                fontWeight: isActive ? '500' : '400',
                color: isActive ? '#5EC9AD' : hoveredItem === item.path ? '#F0EDE6' : 'rgba(240,237,230,0.55)',
                background: isActive ? 'rgba(94,201,173,0.1)' : hoveredItem === item.path ? 'rgba(240,237,230,0.05)' : 'transparent',
                transition: 'all 0.15s ease',
              })}
            >
              <span style={{ fontSize: '16px', opacity: 0.9 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario + plan */}
        <div style={{ padding: '16px 16px 24px', borderTop: '0.5px solid rgba(240,237,230,0.08)' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '9px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '4px',
              background: planActual === 'pro' ? '#0F4A38' : 'rgba(94,201,173,0.12)',
              color: '#5EC9AD',
              border: '0.5px solid rgba(94,201,173,0.3)',
              display: 'inline-block',
              marginBottom: '10px',
            }}>
              {planLabel}
            </div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: '500',
              color: '#F0EDE6',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {nombre}
            </div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              color: 'rgba(240,237,230,0.35)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {email}
            </div>
          </div>
          <button
            onMouseEnter={() => setHoveredSignOut(true)}
            onMouseLeave={() => setHoveredSignOut(false)}
            onClick={() => signOut(() => navigate('/sign-in'))}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '7px',
              border: '0.5px solid rgba(240,237,230,0.15)',
              background: hoveredSignOut ? 'rgba(240,237,230,0.07)' : 'transparent',
              color: 'rgba(240,237,230,0.4)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main style={{
        marginLeft: '220px',
        flex: 1,
        minHeight: '100vh',
        padding: '40px 48px',
      }}>
        {children}
      </main>
    </div>
  )
}
