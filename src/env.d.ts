/// <reference types="next" />

// CSS module declarations
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Support for import.meta.env (used by auto-generated supabase client)
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID: string;
  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
