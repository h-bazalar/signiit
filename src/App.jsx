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
import { useState, useEffect, useMemo } from "react";
import { ToastProvider, useToast } from "./context/ToastContext";
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
  const { addToast } = useToast();
  const [planActual, setPlanActual] = useState("free");
  const supabase = useMemo(() => createSupabaseClient(getToken), [getToken]);
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
        const tokenSesion = await getToken();

        // Todo en paralelo
        const [sesion, { data: negociosData }, { data: historialData }] =
          await Promise.all([
            fetch("/api/sesion-init", {
              method: "POST",
              headers: { Authorization: `Bearer ${tokenSesion}` },
            }).then((r) => (r.ok ? r.json() : null)),
            supabase
              .from("negocios")
              .select("*")
              .eq("usuario_id", user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("campanas_generadas")
              .select("*")
              .eq("usuario_id", user.id)
              .order("created_at", { ascending: false })
              .limit(10),
          ]);

        if (sesion?.plan) setPlanActual(sesion.plan);
        if (sesion?.stats) setStats(sesion.stats);
        if (historialData) setHistorial(historialData);

        const lista = negociosData || [];
        setNegocios(lista);

        if (lista.length > 0) {
          const principal = lista[0];
          setNegocio(principal);

          // Carga de imagenes aislada: su fallo NO debe tumbar el init.
          // 1 reintento ante fallo transitorio (token frio / Supabase despertando).
          let imgsCargadas = null;
          for (let intento = 0; intento < 2; intento++) {
            try {
              const tokenApi = await getToken();
              const resImgs = await fetch(
                `/api/imagenes-negocio?negocioId=${principal.id}`,
                { headers: { Authorization: `Bearer ${tokenApi}` } },
              );
              if (!resImgs.ok) throw new Error(`HTTP ${resImgs.status}`);
              const imgsData = await resImgs.json();
              imgsCargadas = imgsData.imagenes || [];
              break;
            } catch (errImgs) {
              console.error(
                `Error cargando imagenes (intento ${intento + 1}):`,
                errImgs,
              );
              if (intento === 0) await new Promise((r) => setTimeout(r, 800));
            }
          }

          if (imgsCargadas !== null) {
            setImagenesNegocio(imgsCargadas);
          } else {
            setImagenesNegocio([]);
            addToast(
              "No pudimos cargar tus imagenes de producto. Recarga la pagina para reintentar.",
              "error",
            );
          }
        }
      } catch (e) {
        console.error("Error init:", e);
        setError(e.message);
      } finally {
        setInicializado(true);
      }
    };

    init();
  }, [user, getToken, supabase, addToast]);

  // Refetch negocio + imágenes (llamado desde NegociosScreen tras cambios).
  // Acuña token + cliente frescos por llamada (los del init expiran ~60s) y
  // NUNCA blanquea el estado si la query falla: solo limpia cuando de verdad
  // no hay negocios (token válido + resultado vacío).
  const refetchNegocios = async () => {
    if (!user) return;
    try {
      const { data: lista, error: errNegocios } = await supabase
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
        const tokenApi = await getToken();
        const resImgs = await fetch(
          `/api/imagenes-negocio?negocioId=${principal.id}`,
          { headers: { Authorization: `Bearer ${tokenApi}` } },
        );
        if (!resImgs.ok) throw new Error(`HTTP ${resImgs.status}`);
        const imgsData = await resImgs.json();
        setImagenesNegocio(imgsData.imagenes || []);
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
      const [
        { data: statsData, error: statsErr },
        { data: historialData, error: histErr },
      ] = await Promise.all([
        supabase
          .from("usuarios")
          .select(
            "generaciones_estaticos, generaciones_video, analisis_realizados",
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
      if (statsErr) throw statsErr;
      if (histErr) throw histErr;
      if (statsData) setStats(statsData);
      if (historialData) setHistorial(historialData);
    } catch (e) {
      console.error("Error refetchHome:", e);
    }
  };

  if (!isLoaded || !inicializado)
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
            element={
              <AuthenticateWithRedirectCallback
                signInFallbackRedirectUrl="/"
                signUpFallbackRedirectUrl="/"
              />
            }
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
