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

  // Datos centralizados
  const [negocio, setNegocio] = useState(null);
  const [imagenesNegocio, setImagenesNegocio] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [stats, setStats] = useState(null);
  const [historial, setHistorial] = useState([]);

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

        // Todo en paralelo
        const [
          { data: userData },
          { data: negociosData },
          { data: statsData },
          { data: historialData },
        ] = await Promise.all([
          client.from("usuarios").select("*").eq("clerk_id", user.id).single(),
          client
            .from("negocios")
            .select("*")
            .eq("usuario_id", user.id)
            .order("created_at", { ascending: false }),
          client
            .from("usuarios")
            .select(
              "generaciones_estaticos, generaciones_video, analisis_realizados, negocios_count",
            )
            .eq("clerk_id", user.id)
            .single(),
          client
            .from("campanas_generadas")
            .select("*")
            .eq("usuario_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (userData?.plan) setPlanActual(userData.plan);
        if (statsData) setStats(statsData);
        if (historialData) setHistorial(historialData);

        const lista = negociosData || [];
        setNegocios(lista);

        if (lista.length > 0) {
          const principal = lista[0];
          setNegocio(principal);
          const { data: imgs } = await client
            .from("negocio_imagenes")
            .select("id, url, nombre")
            .eq("negocio_id", principal.id)
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

  // Refetch negocio + imágenes (llamado desde NegociosScreen tras cambios)
  const refetchNegocios = async () => {
    if (!supabase || !user) return;
    try {
      const { data: lista } = await supabase
        .from("negocios")
        .select("*")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false });

      const negociosActualizados = lista || [];
      setNegocios(negociosActualizados);

      if (negociosActualizados.length > 0) {
        const principal = negociosActualizados[0];
        setNegocio(principal);
        const { data: imgs } = await supabase
          .from("negocio_imagenes")
          .select("id, url, nombre")
          .eq("negocio_id", principal.id)
          .order("created_at", { ascending: true });
        setImagenesNegocio(imgs || []);
      } else {
        setNegocio(null);
        setImagenesNegocio([]);
      }
    } catch (e) {
      console.error("Error refetchNegocios:", e);
    }
  };

  // Refetch historial + stats (llamado desde HomeScreen si se necesita)
  const refetchHome = async () => {
    if (!supabase || !user) return;
    try {
      const [{ data: statsData }, { data: historialData }] = await Promise.all([
        supabase
          .from("usuarios")
          .select(
            "generaciones_estaticos, generaciones_video, analisis_realizados, negocios_count",
          )
          .eq("clerk_id", user.id)
          .single(),
        supabase
          .from("campanas_generadas")
          .select("*")
          .eq("usuario_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (statsData) setStats(statsData);
      if (historialData) setHistorial(historialData);
    } catch (e) {
      console.error("Error refetchHome:", e);
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
          element={
            <HomeScreen
              supabase={supabase}
              planActual={planActual}
              stats={stats}
              historial={historial}
              onRefetch={refetchHome}
            />
          }
        />
        <Route
          path="/negocios"
          element={
            <NegociosScreen
              supabase={supabase}
              planActual={planActual}
              negociosIniciales={negocios}
              onNegociosChange={refetchNegocios}
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
