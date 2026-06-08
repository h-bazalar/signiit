import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
  useAuth,
} from "@clerk/clerk-react";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    if (!user) return;

    const initSupabase = async () => {
      const token = await getToken({ template: "supabase" });
      const client = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      );
      setSupabase(client);

      const { data } = await client
        .from("usuarios")
        .select("plan")
        .eq("clerk_id", user.id)
        .single();

      if (data?.plan) setPlanActual(data.plan);
    };

    initSupabase();
  }, [user]);

  if (!isLoaded || !supabase)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F7F5F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            <NegociosScreen supabase={supabase} planActual={planActual} />
          }
        />
        <Route
          path="/campanas"
          element={
            <CampanasScreen supabase={supabase} planActual={planActual} />
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
