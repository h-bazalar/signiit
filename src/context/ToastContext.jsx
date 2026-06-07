import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '360px',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              background: toast.type === 'error'   ? '#7A1A1A'
                        : toast.type === 'success' ? '#0F4A38'
                        : '#1A3A2A',
              color: '#F0EDE6',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
              cursor: 'pointer',
              borderLeft: `3px solid ${
                toast.type === 'error'   ? '#E24B4A'
                : toast.type === 'success' ? '#5EC9AD'
                : '#3DAB8E'
              }`,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
