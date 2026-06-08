import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useCreditos } from '../hooks/useCreditos'
import { PLANES } from '../utils/constants'

export default function HomeScreen({ supabase, planActual }) {
  const { user } = useUser()
  const { ejecutarResetsCreditos } = useCreditos(supabase)
  const [stats, setStats] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [hoveredRow, setHoveredRow] = useState(null)

  useEffect(() => {
    if (user && supabase) {
      cargarDatos()
      ejecutarResetsCreditos().catch(() => {})
    }
  }, [user, supabase])

  const cargarDatos = async () => {
    try {
      const [{ data: usr }, { data: campanas }] = await Promise.all([
        supabase.from('usuarios').select('*').eq('clerk_id', user.id).single(),
        supabase
          .from('campanas_generadas')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      if (usr) setStats(usr)
      if (campanas) setHistorial(campanas)
    } catch (e) {
      console.error('Error cargando datos:', e)
    } finally {
      setCargando(false)
    }
  }

  const limites = PLANES[planActual] || PLANES.free
  const nombre = user?.firstName || user?.fullName?.split(' ')[0] || 'Usuario'

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8C8880', marginBottom: '6px' }}>
          Resumen
        </p>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '28px', fontWeight: '400', color: '#0F4A38', marginBottom: '6px' }}>
          {cargando ? ' ' : `Hola, ${nombre}`}
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#8C8880' }}>
          {cargando ? ' ' : 'Este es tu resumen del mes actual.'}
        </p>
      </div>

      {/* Tarjetas de stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '12px',
        marginBottom: '32px',
      }}>
        {cargando ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Imágenes generadas"  usado={stats?.generaciones_estaticos || 0} limite={limites.imagenesTotal} color="#3DAB8E" />
            <StatCard label="Videos generados"    usado={stats?.generaciones_video || 0}     limite={limites.videos}        color="#3DAB8E" />
            <StatCard label="Análisis realizados" usado={stats?.analisis_realizados || 0}    limite={limites.analisis}      color="#3DAB8E" />
            <StatCard label="Negocios activos"    usado={stats?.negocios_count || 0}          limite={limites.negocios}      color="#3DAB8E" />
          </>
        )}
      </div>

      {/* Historial */}
      <div style={{
        background: 'white',
        border: '0.5px solid rgba(15,74,56,0.10)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '0.5px solid rgba(15,74,56,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            fontWeight: '500',
            color: '#0F4A38',
          }}>
            Historial reciente
          </span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '12px',
            color: '#3DAB8E',
            cursor: 'pointer',
          }}>
            Ver todo →
          </span>
        </div>

        {cargando ? (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array(3).fill(0).map((_, i) => (
              <div key={i} style={{ height: '40px', background: '#F7F5F0', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : historial.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: '20px', color: '#0F4A38', marginBottom: '8px' }}>
              Todo listo para empezar.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#8C8880' }}>
              Ve a Negocios para registrar tu primer negocio y generar creativos.
            </p>
          </div>
        ) : (
          historial.map((item, i) => (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredRow(item.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < historial.length - 1 ? '0.5px solid rgba(15,74,56,0.08)' : 'none',
                background: hoveredRow === item.id ? '#F7F5F0' : 'transparent',
                transition: 'background 0.1s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  background: item.tipo === 'imagen' ? '#E4F5EF' : '#EBF0FB',
                }}>
                  {item.tipo === 'imagen' ? '🖼️' : '🎬'}
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: '500', color: '#0F4A38' }}>
                    {item.tipo === 'imagen' ? 'Creativos de imagen' : 'Video Ad'}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#8C8880' }}>
                    {new Date(item.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  background: item.estado === 'listo' ? '#E4F5EF' : item.estado === 'error' ? '#FDE8E8' : '#F0EDE6',
                  color: item.estado === 'listo' ? '#0F4A38' : item.estado === 'error' ? '#C0392B' : '#8C8880',
                }}>
                  {item.estado}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'white', border: '0.5px solid rgba(15,74,56,0.10)', borderRadius: '12px', padding: '20px' }}>
      <div style={{ height: '10px', width: '55%', background: '#F0EDE6', borderRadius: '4px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '28px', width: '35%', background: '#F0EDE6', borderRadius: '4px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '3px', background: '#F0EDE6', borderRadius: '2px', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  )
}

function StatCard({ label, usado, limite, color }) {
  const [hovered, setHovered] = useState(false)
  const porcentaje = limite > 0 ? Math.min((usado / limite) * 100, 100) : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        border: `0.5px solid ${hovered ? 'rgba(15,74,56,0.25)' : 'rgba(15,74,56,0.10)'}`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: '9px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#8C8880',
        marginBottom: '10px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: '28px',
        color: '#0F4A38',
        marginBottom: '2px',
        lineHeight: 1,
      }}>
        {usado}
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#8C8880', fontWeight: '400' }}>
          /{limite}
        </span>
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: '#8C8880', marginBottom: '12px' }}>
        {limite === 0 ? 'No incluido en tu plan' : `${Math.max(0, limite - usado)} disponibles`}
      </div>
      <div style={{ height: '3px', background: '#F0EDE6', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${porcentaje}%`, background: color, borderRadius: '2px', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  )
}
