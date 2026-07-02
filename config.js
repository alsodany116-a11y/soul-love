// Love Hunt - Supabase Configuration

const SUPABASE_URL = "https://uckfkaahlarrpjbkcwjy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVja2ZrYWFobGFycnBqYmtjd2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTM1MDcsImV4cCI6MjA5ODU2OTUwN30.0bJ4GBJ2EDf75bvoZkL2GcOYBE6yW0NccXDb6eUrjb4";

let supabaseClient = null;

/**
 * Initializes and returns the global Supabase client.
 * Assumes the @supabase/supabase-js library is loaded via script tag in index.html.
 */
export function getSupabase() {
  if (!supabaseClient) {
    if (typeof window.supabase === 'undefined') {
      console.error("Supabase SDK is not loaded! Check that the script is present in index.html.");
      return null;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

export { SUPABASE_URL, SUPABASE_KEY };
