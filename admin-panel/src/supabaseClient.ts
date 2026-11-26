import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY. Скопируйте .env.example в .env.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
