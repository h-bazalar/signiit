import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { PLANES } from "../utils/constants";

export function useCreditos(supabase) {
  const { user } = useUser();
  const [creditos, setCreditos] = useState(null);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);

  const fetchCreditos = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select(
          "plan, generaciones_estaticos, generaciones_video, analisis_realizados",
        )
        .eq("clerk_id", user.id)
        .single();

      if (error) throw error;

      setPlan(data.plan || "free");
      setCreditos({
        imagenes: data.generaciones_estaticos ?? 0,
        videos: data.generaciones_video ?? 0,
        analisis: data.analisis_realizados ?? 0,
      });
    } catch (err) {
      console.error("Error fetching créditos:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchCreditos();
  }, [fetchCreditos]);

  const limites = PLANES[plan] ?? PLANES.free;

  const tieneCredito = {
    imagenes: creditos !== null ? creditos.imagenes < limites.imagenesTotal : true,
    videos: creditos !== null ? creditos.videos < limites.videos : false,
    analisis: creditos !== null ? creditos.analisis < limites.analisis : false,
  };

  return {
    creditos,
    plan,
    limites,
    tieneCredito,
    loading,
    refetch: fetchCreditos,
    ejecutarResetsCreditos: async () => {},
  };
}
