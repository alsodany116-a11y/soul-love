// Love Hunt - Dynamic Multi-Tenant Supabase Configuration (SaaS Mode)

const MASTER_SUPABASE_URL = "https://uckfkaahlarrpjbkcwjy.supabase.co";
const MASTER_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVja2ZrYWFobGFycnBqYmtjd2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTM1MDcsImV4cCI6MjA5ODU2OTUwN30.0bJ4GBJ2EDf75bvoZkL2GcOYBE6yW0NccXDb6eUrjb4";

let masterClient = null;
let tenantClient = null;
let currentTenantSlug = null;
let currentTenantDetails = null; // Caches password hash, details

/**
 * Initializes and returns the Master Supabase client (directory/registry database).
 */
export function getMasterClient() {
  if (!masterClient) {
    if (typeof window.supabase === 'undefined') {
      console.error("Supabase SDK is not loaded! Check that the script is present in index.html.");
      return null;
    }
    masterClient = window.supabase.createClient(MASTER_SUPABASE_URL, MASTER_SUPABASE_KEY);
  }
  return masterClient;
}

/**
 * Dynamically switches the active database tenant using a slug from the registry.
 */
export async function setTenantBySlug(slug) {
  if (!slug) {
    tenantClient = null;
    currentTenantSlug = null;
    currentTenantDetails = null;
    return null;
  }

  // If already loaded, return cached details
  if (currentTenantSlug === slug && tenantClient) {
    return currentTenantDetails;
  }

  const master = getMasterClient();
  if (!master) throw new Error("Could not initialize Master Supabase client.");

  // Query registry for credentials
  const { data, error } = await master
    .from('spaces_registry')
    .select('*')
    .eq('slug', slug.toLowerCase().trim())
    .single();

  if (error || !data) {
    console.error("Error finding space in registry:", error);
    tenantClient = null;
    currentTenantSlug = null;
    currentTenantDetails = null;
    throw new Error(`لم يتم العثور على مساحة الحب بالاسم: ${slug}`);
  }

  // Instantiate tenant client
  try {
    tenantClient = window.supabase.createClient(data.tenant_supabase_url, data.tenant_supabase_anon_key);
    currentTenantSlug = slug.toLowerCase().trim();
    currentTenantDetails = {
      id: data.id,
      slug: data.slug,
      adminPasswordHash: data.admin_password_hash,
      tenantSupabaseUrl: data.tenant_supabase_url,
      tenantSupabaseAnonKey: data.tenant_supabase_anon_key,
      createdAt: data.created_at
    };
    return currentTenantDetails;
  } catch (err) {
    console.error("Error instantiating tenant Supabase client:", err);
    tenantClient = null;
    currentTenantSlug = null;
    currentTenantDetails = null;
    throw new Error("خطأ في الاتصال بقاعدة بيانات المساحة المخصصة.");
  }
}

/**
 * Returns the active tenant client, or falls back to masterClient if none is set.
 */
export function getSupabase() {
  if (tenantClient) {
    return tenantClient;
  }
  return getMasterClient();
}

/**
 * Gets the current active tenant slug.
 */
export function getCurrentTenantSlug() {
  return currentTenantSlug;
}

/**
 * Gets details of the currently loaded tenant.
 */
export function getCurrentTenantDetails() {
  return currentTenantDetails;
}

export { MASTER_SUPABASE_URL as SUPABASE_URL, MASTER_SUPABASE_KEY as SUPABASE_KEY };
