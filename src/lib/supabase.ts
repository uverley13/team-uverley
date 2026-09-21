import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Do not throw while importing this module. A missing environment variable used
// to abort the whole client bundle before React could render the home page.
// Keep the app renderable and report the configuration problem in the console;
// authenticated/data operations will fail normally and be handled by the routes.
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

if (!hasSupabaseConfig) {
  console.error(
    'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno de Netlify.',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://supabase.invalid',
  supabaseAnonKey || 'missing-anon-key',
)
