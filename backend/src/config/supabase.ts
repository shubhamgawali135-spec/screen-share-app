import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client for trusted server-side access only.
// Never expose this key or client to the frontend.
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
