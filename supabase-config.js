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

const SUPABASE_URL = "https://psytkytuajrxtizynydf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fgkruuGxn-lB7Hm_z4EOzg_-J-Qr15F";

// Crea el cliente global "sb". Si aún no está configurado o la
// librería no cargó, queda en null y la web usa el modo básico.
window.sb = (window.supabase && !SUPABASE_URL.includes("TU-PROYECTO"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// También los dejamos disponibles para el panel admin
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
