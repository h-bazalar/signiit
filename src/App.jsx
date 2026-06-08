import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
  useAuth,
  AuthenticateWithRedirectCallback,
} from "@clerk/clerk-react";
import { createSupabaseClient } from "./supabase";
import { useState, useEffect } from "react";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./components/AppLayout";
import AuthPage from "./pages/AuthPage";
import HomeScreen from "./pages/HomeScreen";
import NegociosScreen from "./pages/NegociosScreen";
import CampanasScreen from "./pages/CampanasScreen";
import AnalisisScreen from "./pages/AnalisisScreen";
import PlanesScreen from "./pages/PlanesScreen";

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/sign-in" />
      </SignedOut>
    </>
  );
}

function AppWithLayout() {
  const { user } = useUser();
  const { isLoaded, getToken } = useAuth();
  const [planActual, setPlanActual] = useState("free");
  const [supabase, setSupabase] = useState(null);
  const [inicializado, setInicializado] = useState(false);
  const [error, setError] = useState(null);

  // Negocio e imágenes centralizados
  const [negocio, setNegocio] = useState(null);
  const [imagenesNegocio, setImagenesNegocio] = useState([]);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (!token) {
          setError("No se pudo obtener token de Clerk");
          return;
        }

        const client = createSupabaseClient(token);
        setSupabase(client);

        // Cargar plan + negocio + imágenes en paralelo
        const [{ data: userData }, { data: negocioData }] = await Promise.all([
          client
            .from("usuarios")
            .select("plan")
            .eq("clerk_id", user.id)
            .single(),
          client
            .from("negocios")
            .select("id, nombre, rubro, logo_url")
            .eq("usuario_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
        ]);

        if (userData?.plan) setPlanActual(userData.plan);

        if (negocioData) {
          setNegocio(negocioData);
          const { data: imgs } = await client
            .from("negocio_imagenes")
            .select("id, url, nombre")
            .eq("negocio_id", negocioData.id)
            .order("created_at", { ascending: true });
          setImagenesNegocio(imgs || []);
        }
      } catch (e) {
        console.error("Error init:", e);
        setError(e.message);
      } finally {
        setInicializado(true);
      }
    };

    init();
  }, [user]);

  // Función para refrescar negocio desde pantallas hijas
  const refetchNegocio = async () => {
    if (!supabase || !user) return;
    try {
      const { data: negocioData } = await supabase
        .from("negocios")
        .select("id, nombre, rubro, logo_url")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (negocioData) {
        setNegocio(negocioData);
        const { data: imgs } = await supabase
          .from("negocio_imagenes")
          .select("id, url, nombre")
          .eq("negocio_id", negocioData.id)
          .order("created_at", { ascending: true });
        setImagenesNegocio(imgs || []);
      } else {
        setNegocio(null);
        setImagenesNegocio([]);
      }
    } catch (e) {
      console.error("Error refetchNegocio:", e);
    }
  };

  if (!isLoaded || !supabase || !inicializado)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F5F0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#3DAB8E",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        {error && (
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#C0392B",
            }}
          >
            {error}
          </p>
        )}
        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.4)} }`}</style>
      </div>
    );

  return (
    <AppLayout planActual={planActual}>
      <Routes>
        <Route
          path="/"
          element={<HomeScreen supabase={supabase} planActual={planActual} />}
        />
        <Route
          path="/negocios"
          element={
            <NegociosScreen
              supabase={supabase}
              planActual={planActual}
              negocio={negocio}
              onNegocioChange={refetchNegocio}
            />
          }
        />
        <Route
          path="/campanas"
          element={
            <CampanasScreen
              supabase={supabase}
              planActual={planActual}
              negocio={negocio}
              imagenesNegocio={imagenesNegocio}
            />
          }
        />
        <Route
          path="/analisis"
          element={
            <AnalisisScreen supabase={supabase} planActual={planActual} />
          }
        />
        <Route
          path="/planes"
          element={<PlanesScreen supabase={supabase} planActual={planActual} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/sso-callback"
            element={<AuthenticateWithRedirectCallback />}
          />
          <Route path="/sign-in/*" element={<AuthPage />} />
          <Route path="/sign-up/*" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppWithLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
