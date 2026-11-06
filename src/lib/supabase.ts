import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
// Netlify's Supabase integration exposes the key as VITE_SUPABASE_PUBLISHABLE_KEY;
// VITE_SUPABASE_ANON_KEY is kept as a fallback for older setups.
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey)

if (!hasSupabaseConfig) {
  console.error(
    'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en Netlify.',
  )
}

// Keep the application renderable when deployment variables are missing.
// Database/auth calls will return errors until the real variables are set.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
)
