import { createClient } from "@supabase/supabase-js";

// ❗ SERVER-SEITIG IMMER SERVICE_ROLE_KEY benutzen!
// NIE ANON KEY – der hat nicht genug Rechte.

export const supabase = createClient(
  process.env.SUPABASE_URL!,            // kein NEXT_PUBLIC_ da wir serverseitig sind
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // vollständiger Admin-Key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
