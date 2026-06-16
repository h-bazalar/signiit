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
          { data: historialData },
        ] = await Promise.all([
          client.from("usuarios").select("*").eq("clerk_id", user.id).single(),
          client
            .from("negocios")
            .select("*")
            .eq("usuario_id", user.id)
            .order("created_at", { ascending: false }),
          client
            .from("campanas_generadas")
            .select("*")
            .eq("usuario_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (userData?.plan) setPlanActual(userData.plan);
        setStats(userData);
        if (historialData) setHistorial(historialData);

        const lista = negociosData || [];
        setNegocios(lista);

        if (lista.length > 0) {
          const principal = lista[0];
          setNegocio(principal);
          const tokenApi = await getToken();
          const resImgs = await fetch(
            `/api/imagenes-negocio?negocioId=${principal.id}`,
            {
              headers: { Authorization: `Bearer ${tokenApi}` },
            },
          );
          const imgsData = resImgs.ok ? await resImgs.json() : { imagenes: [] };
          const imgs = imgsData.imagenes || [];
          setImagenesNegocio(imgs);
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

  // Refetch negocio + imágenes (llamado desde NegociosScreen tras cambios).
  // Acuña token + cliente frescos por llamada (los del init expiran ~60s) y
  // NUNCA blanquea el estado si la query falla: solo limpia cuando de verdad
  // no hay negocios (token válido + resultado vacío).
  const refetchNegocios = async () => {
    if (!user) return;
    try {
      const token = await getToken({ template: "supabase" });
      const client = createSupabaseClient(token);

      const { data: lista, error: errNegocios } = await client
        .from("negocios")
        .select("*")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false });
      if (errNegocios) throw errNegocios;

      const negociosActualizados = lista || [];
      setNegocios(negociosActualizados);

      if (negociosActualizados.length > 0) {
        const principal = negociosActualizados[0];
        setNegocio(principal);
        const { data: imgs, error: errImgs } = await client
          .from("negocio_imagenes")
          .select("id, url, nombre")
          .eq("negocio_id", principal.id)
          .order("created_at", { ascending: true });
        if (errImgs) throw errImgs;
        setImagenesNegocio(imgs || []);
      } else {
        setNegocio(null);
        setImagenesNegocio([]);
      }
    } catch (e) {
      console.error("Error refetchNegocios:", e);
    }
  };

  // Refetch historial + stats (llamado desde HomeScreen si se necesita).
  // Token + cliente frescos por llamada por la misma razón que refetchNegocios.
  const refetchHome = async () => {
    if (!user) return;
    try {
      const token = await getToken({ template: "supabase" });
      const client = createSupabaseClient(token);

      const [
        { data: statsData, error: statsErr },
        { data: historialData, error: histErr },
      ] = await Promise.all([
        client
          .from("usuarios")
          .select(
            "generaciones_estaticos, generaciones_video, analisis_realizados",
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
      if (statsErr) throw statsErr;
      if (histErr) throw histErr;
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
              negociosCount={negocios.length}
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
              getToken={getToken}
              stats={stats}
              onRefetch={refetchHome}
            />
          }
        />
        <Route
          path="/analisis"
          element={
            <AnalisisScreen
              supabase={supabase}
              planActual={planActual}
              onRefetch={refetchHome}
            />
          }
        />
        <Route
          path="/planes"
          element={
            <PlanesScreen
              planActual={planActual}
              creditos={
                stats ? { imagenes: stats.generaciones_estaticos ?? 0 } : null
              }
            />
          }
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
