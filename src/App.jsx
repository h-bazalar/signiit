import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react'
import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'
import { ToastProvider } from './context/ToastContext'
import AppLayout from './components/AppLayout'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import HomeScreen     from './pages/HomeScreen'
import NegociosScreen from './pages/NegociosScreen'
import CampanasScreen from './pages/CampanasScreen'
import AnalisisScreen from './pages/AnalisisScreen'
import PlanesScreen   from './pages/PlanesScreen'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn redirectUrl="/sign-in" /></SignedOut>
    </>
  )
}

function AppWithLayout() {
  const { user } = useUser()
  const [planActual, setPlanActual] = useState('free')

  useEffect(() => {
    if (user) {
      supabase
        .from('usuarios')
        .select('plan')
        .eq('clerk_id', user.id)
        .single()
        .then(({ data }) => { if (data?.plan) setPlanActual(data.plan) })
    }
  }, [user])

  return (
    <AppLayout planActual={planActual}>
      <Routes>
        <Route path="/"          element={<HomeScreen supabase={supabase} planActual={planActual} />} />
        <Route path="/negocios"  element={<NegociosScreen supabase={supabase} planActual={planActual} />} />
        <Route path="/campanas"  element={<CampanasScreen supabase={supabase} planActual={planActual} />} />
        <Route path="/analisis"  element={<AnalisisScreen supabase={supabase} planActual={planActual} />} />
        <Route path="/planes"    element={<PlanesScreen supabase={supabase} planActual={planActual} />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/*" element={<ProtectedRoute><AppWithLayout /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
