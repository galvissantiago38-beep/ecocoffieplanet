/* ============================================================
   ECOCOFFIEPLANET · Conexión con Supabase
   ------------------------------------------------------------
   👉 PEGA AQUÍ LOS 2 DATOS DE TU PROYECTO SUPABASE:
      (Supabase → Project Settings → API)
      - Project URL      → SUPABASE_URL
      - anon public key  → SUPABASE_ANON_KEY

   ⚠️ Usa SOLO la llave "anon public". NUNCA la "service_role"
      (esa es secreta y no debe ir en el código).

   Mientras no configures esto, la página sigue funcionando
   normal con los productos de config.js (sin reacciones).
   ============================================================ */

const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-LLAVE-PUBLICA-ANON";

// Crea el cliente global "sb". Si aún no está configurado o la
// librería no cargó, queda en null y la web usa el modo básico.
window.sb = (window.supabase && !SUPABASE_URL.includes("TU-PROYECTO"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
