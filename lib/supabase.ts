// ❗❗ Keine Client-Komponente! Keine "use client" ❗❗
// Diese Datei MUSS rein serverseitig sein.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
