import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan variables de Supabase en .env.local");
}

// Cliente unico con token SIEMPRE fresco: la opcion accessToken le pide el JWT
// a Clerk en CADA request, en vez de congelarlo al crear el cliente (que era la
// causa del bug del token vencido ~60s). Recibe la funcion getToken de useAuth().
export const createSupabaseClient = (getToken) =>
  createClient(supabaseUrl, supabaseKey, {
    accessToken: async () => (await getToken({ template: "supabase" })) ?? null,
  });
