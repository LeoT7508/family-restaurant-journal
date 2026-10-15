/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Your Supabase project URL. */
  readonly VITE_SUPABASE_URL?: string
  /** The public anon / publishable key. Never put the service_role key here. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
