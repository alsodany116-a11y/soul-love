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

function logDebug(msg) {
  console.log("[Debug]", msg);
}

/**
 * Dynamically switches the active database tenant using a slug from the registry.
 */
export async function setTenantBySlug(slug) {
  logDebug("setTenantBySlug called with slug: " + slug);
  if (!slug) {
    tenantClient = null;
    currentTenantSlug = null;
    currentTenantDetails = null;
    return null;
  }

  // If already loaded, return cached details
  if (currentTenantSlug === slug && tenantClient) {
    logDebug("Using cached tenant details.");
    return currentTenantDetails;
  }

  logDebug("Initializing Master Client...");
  const master = getMasterClient();
  if (!master) {
    logDebug("Master client is null!");
    throw new Error("Could not initialize Master Supabase client.");
  }

  logDebug("Querying registry for slug: " + slug);
  let result;
  try {
    result = await master
      .from('spaces_registry')
      .select('*')
      .eq('slug', slug.toLowerCase().trim())
      .single();
  } catch (ex) {
    logDebug("Registry query exception: " + ex.message);
    throw ex;
  }

  const { data, error } = result;
  if (error || !data) {
    logDebug("Registry query failed: " + (error ? error.message : "No data"));
    console.error("Error finding space in registry:", error);
    tenantClient = null;
    currentTenantSlug = null;
    currentTenantDetails = null;
    throw new Error(`لم يتم العثور على مساحة الحب بالاسم: ${slug}`);
  }

  logDebug("Registry query success. Tenant URL: " + data.tenant_supabase_url);

  // Instantiate tenant client
  try {
    logDebug("Creating Tenant Client...");
    tenantClient = window.supabase.createClient(data.tenant_supabase_url, data.tenant_supabase_anon_key);
    logDebug("Tenant Client created.");
    currentTenantSlug = slug.toLowerCase().trim();
    currentTenantDetails = {
      id: data.id,
      slug: data.slug,
      adminPasswordHash: data.admin_password_hash,
      tenantSupabaseUrl: data.tenant_supabase_url,
      tenantSupabaseAnonKey: data.tenant_supabase_anon_key,
      price: data.price || 0,
      tier: data.tier || 1,
      createdAt: data.created_at
    };
    logDebug("setTenantBySlug completed successfully.");
    return currentTenantDetails;
  } catch (err) {
    logDebug("Tenant Client creation failed: " + err.message);
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
 * Gets the current active tenant tier.
 */
export function getCurrentTenantTier() {
  return currentTenantDetails ? currentTenantDetails.tier : 1;
}

/**
 * Gets details of the currently loaded tenant.
 */
export function getCurrentTenantDetails() {
  return currentTenantDetails;
}

export { MASTER_SUPABASE_URL as SUPABASE_URL, MASTER_SUPABASE_KEY as SUPABASE_KEY };
