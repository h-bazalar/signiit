import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { ToastProvider } from './context/ToastContext'

// Pages
import HomeScreen     from './pages/HomeScreen'
import NegociosScreen from './pages/NegociosScreen'
import CampanasScreen from './pages/CampanasScreen'
import AnalisisScreen from './pages/AnalisisScreen'
import PlanesScreen   from './pages/PlanesScreen'

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas protegidas */}
          <Route path="/" element={
            <ProtectedRoute><HomeScreen /></ProtectedRoute>
          } />
          <Route path="/negocios" element={
            <ProtectedRoute><NegociosScreen /></ProtectedRoute>
          } />
          <Route path="/campanas" element={
            <ProtectedRoute><CampanasScreen /></ProtectedRoute>
          } />
          <Route path="/analisis" element={
            <ProtectedRoute><AnalisisScreen /></ProtectedRoute>
          } />
          <Route path="/planes" element={
            <ProtectedRoute><PlanesScreen /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
