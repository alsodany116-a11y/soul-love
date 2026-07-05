// Love Hunt - Storage & Backend Services Module
import { getSupabase, getMasterClient, getCurrentTenantDetails } from './config.js';

// Default UI Texts in Arabic
export const DEFAULT_UI_TEXTS = {
  lockTitle: "مغلق بالحب 🔒",
  lockDesc: "الرجاء إدخال كلمة المرور المشتركة للدخول إلى مساحة الحب.",
  lockBtn: "فتح المساحة 🔑",
  lockPlaceholder: "رمز المرور...",
  lockError: "كلمة المرور غير صحيحة، حاول مجددًا يا حب! 💖",
  
  hintBtn: "عرض تلميح 💡",
  submitBtn: "إرسال الإجابة 💌",
  hintPrefix: "💡 تلميح للحل:",
  
  celebrationTitle: "تهانينا يا حبيبي! 🎉❤️",
  celebrationGiftTitle: "رسالة حبنا الأبدية",
  envelopeOpenBtn: "افتح الهدية ✉️",
  enterWorldBtn: "دخول عالمنا المشترك 🚪✨",
  
  step1Title: "أيامنا معاً 📅",
  step1Btn: "أحلامنا المشتركة ➡️",
  
  step2Title: "خططنا وأحلامنا ☁️",
  step2Btn: "معرض صورنا ➡️",
  
  step3Title: "معرض صورنا 🖼️",
  step3Btn: "مواعيد تهمنا ➡️",
  
  step4Title: "مواعيد تهمنا 📌",
  step4Btn: "تاريخ لقاءاتنا ➡️",
  
  step5Title: "تاريخ لقاءاتنا ⏳",
  
  concludingMsg: "لقد تمكنت من فك رموز ذكرياتنا واجتياز كل المراحل بنجاح. لقد جمعنا الحب والوفاء معًا.",
  giftText: "حبيبتي الغالية، هذه رسالة حب مخبأة لك..."
};

/**
 * Hashes a plaintext password using browser-native SHA-256.
 * @param {string} password 
 * @returns {Promise<string>} Hex representation of the SHA-256 hash
 */
export async function hashPassword(password) {
  if (!password) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Uploads a media file (Image, Video, Audio) to the Supabase Storage Bucket 'love-hunt-media'.
 * @param {File} file 
 * @returns {Promise<string>} Public URL of the uploaded file
 */
export async function uploadMedia(file) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('love-hunt-media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Supabase Storage upload failed:", error);
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from('love-hunt-media')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/* ============================================================================
   COUPLE SPACES API
   ============================================================================ */

/**
 * Creates a new Couple Space (Love Space) in the master registry.
 */
export async function createCoupleSpace(slug, adminPassword, tenantSupabaseUrl, tenantSupabaseAnonKey, price = 0, tier = 1) {
  const master = getMasterClient();
  if (!master) throw new Error("Master database is not initialized.");

  const adminPasswordHash = await hashPassword(adminPassword);
  
  const { data, error } = await master
    .from('spaces_registry')
    .insert([{ 
      slug: slug.toLowerCase().trim(),
      admin_password_hash: adminPasswordHash,
      tenant_supabase_url: tenantSupabaseUrl.trim(),
      tenant_supabase_anon_key: tenantSupabaseAnonKey.trim(),
      price: parseFloat(price) || 0,
      tier: parseInt(tier) || 1
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Error creating couple space in registry:", error);
    throw error;
  }

  return data.id;
}

/**
 * Checks if a password is correct for a couple space.
 */
export async function verifySpacePassword(spaceId, password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { data, error } = await supabase
    .from('couple_spaces')
    .select('password_hash')
    .eq('id', spaceId)
    .single();

  if (error || !data) {
    console.error("Error fetching space details:", error);
    return false;
  }

  const computedHash = await hashPassword(password);
  const isMatch = computedHash === data.password_hash;
  
  if (isMatch) {
    sessionStorage.setItem(`unlocked_${spaceId}`, 'true');
  }

  return isMatch;
}

/**
 * Searches the couple_spaces table to find a space matching the hashed password.
 */
export async function findSpaceByPassword(password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const computedHash = await hashPassword(password);
  
  const { data, error } = await supabase
    .from('couple_spaces')
    .select('id, custom_ui_texts')
    .eq('password_hash', computedHash);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Store unlock state locally
  sessionStorage.setItem(`unlocked_${data[0].id}`, 'true');

  return {
    id: data[0].id,
    customUiTexts: data[0].custom_ui_texts
  };
}


/**
 * Checks if the admin password is correct.
 */
export async function verifySpaceAdminPassword(spaceId, password) {
  const details = getCurrentTenantDetails();
  if (!details) {
    console.error("No active tenant loaded for verification.");
    return false;
  }

  const computedHash = await hashPassword(password);
  const isMatch = computedHash === details.adminPasswordHash;
  
  if (isMatch) {
    sessionStorage.setItem(`unlocked_admin_${spaceId}`, 'true');

    // Self-initialize the tenant's own database if the couple_spaces row is missing
    try {
      const tenantDb = getSupabase();
      const { data } = await tenantDb.from('couple_spaces').select('id').eq('id', spaceId).maybeSingle();
      if (!data) {
        console.log("Self-initializing tenant database for space:", spaceId);
        await tenantDb.from('couple_spaces').insert([{
          id: spaceId,
          password_hash: await hashPassword("love"), // Default play password
          admin_password_hash: "NOT_USED",
          custom_ui_texts: DEFAULT_UI_TEXTS
        }]);
      }
    } catch (err) {
      console.error("Auto-initialization of tenant db failed:", err);
    }
  }

  return isMatch;
}

export function isSpaceUnlocked(spaceId) {
  return sessionStorage.getItem(`unlocked_${spaceId}`) === 'true';
}

export function isSpaceAdminUnlocked(spaceId) {
  return sessionStorage.getItem(`unlocked_admin_${spaceId}`) === 'true';
}

/**
 * Fetches the Custom UI Texts configured for a space.
 */
export async function fetchSpaceUI(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  let { data, error } = await supabase
    .from('couple_spaces')
    .select('custom_ui_texts, his_photo_url, her_photo_url, password_plain, admin_password_plain')
    .eq('id', spaceId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching space UI configs:", error);
    throw error;
  }

  if (!data) {
    console.log("Self-initializing couple_spaces row for spaceId:", spaceId);
    const { data: newRow, error: insertError } = await supabase
      .from('couple_spaces')
      .insert([{
        id: spaceId,
        password_hash: await hashPassword("love"), // Default play password
        admin_password_hash: "NOT_USED",
        custom_ui_texts: DEFAULT_UI_TEXTS,
        password_plain: "love",
        admin_password_plain: ""
      }])
      .select('custom_ui_texts, his_photo_url, her_photo_url, password_plain, admin_password_plain')
      .single();

    if (insertError) {
      console.error("Error self-initializing space UI configs:", insertError);
      throw insertError;
    }
    data = newRow;
  }

  return {
    uiTexts: { ...DEFAULT_UI_TEXTS, ...data.custom_ui_texts },
    hisPhotoUrl: data.his_photo_url,
    herPhotoUrl: data.her_photo_url,
    passwordPlain: data.password_plain || "love",
    adminPasswordPlain: data.admin_password_plain || ""
  };
}

/**
 * Updates UI custom text overrides.
 */
export async function updateSpaceUI(spaceId, uiTexts) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { error } = await supabase
    .from('couple_spaces')
    .update({ custom_ui_texts: uiTexts })
    .eq('id', spaceId);

  if (error) {
    console.error("Error updating space UI:", error);
    throw error;
  }
}

/**
 * Updates passwords for the player and the admin in the tenant database and master registry.
 */
export async function updateSpacePasswords(spaceId, playerPassword, adminPassword) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  // Hash passwords
  const playerHash = await hashPassword(playerPassword);
  const adminHash = await hashPassword(adminPassword);

  // 1. Update tenant database couple_spaces
  const { error: tenantError } = await supabase
    .from('couple_spaces')
    .update({
      password_hash: playerHash,
      password_plain: playerPassword,
      admin_password_plain: adminPassword
    })
    .eq('id', spaceId);

  if (tenantError) {
    console.error("Error updating tenant passwords:", tenantError);
    throw tenantError;
  }

  // 2. Update master database spaces_registry so the login checks match the new hash!
  const master = getMasterClient();
  if (master) {
    const { error: masterError } = await master
      .from('spaces_registry')
      .update({
        admin_password_hash: adminHash
      })
      .eq('id', spaceId);

    if (masterError) {
      console.error("Error updating master registry password:", masterError);
      throw masterError;
    }
  }
}

/**
 * Updates avatar links (His & Her photo).
 */
export async function updateSpacePhotos(spaceId, hisPhotoUrl, herPhotoUrl) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { error } = await supabase
    .from('couple_spaces')
    .update({ 
      his_photo_url: hisPhotoUrl,
      her_photo_url: herPhotoUrl
    })
    .eq('id', spaceId);

  if (error) {
    console.error("Error updating space photos:", error);
    throw error;
  }
}

/* ============================================================================
   MUSIC TRACKS API
   ============================================================================ */

export async function fetchMusicTracks(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .eq('couple_space_id', spaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function saveMusicTrack(spaceId, title, url) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { data, error } = await supabase
    .from('music_tracks')
    .insert([{ couple_space_id: spaceId, title, url }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMusicTrack(trackId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { error } = await supabase
    .from('music_tracks')
    .delete()
    .eq('id', trackId);

  if (error) throw error;
}

/* ============================================================================
   GAMES API
   ============================================================================ */

export async function saveGame(gameData) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const record = {
    couple_space_id: gameData.coupleSpaceId,
    stages: gameData.stages,
    theme: gameData.theme,
    customization: gameData.customization,
    final_message: gameData.finalMessage || "",
    gift_message: gameData.giftMessage || "",
    celebration_media_url: gameData.celebrationMediaUrl || null,
    start_date: gameData.startDate || null,
    expiry_date: gameData.expiryDate || null
  };

  let query;
  if (gameData.id) {
    query = supabase
      .from('games')
      .update(record)
      .eq('id', gameData.id)
      .select('id')
      .single();
  } else {
    query = supabase
      .from('games')
      .insert([record])
      .select('id')
      .single();
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error saving game:", error);
    throw error;
  }

  return data.id;
}

export async function fetchGame(gameIdOrSlug) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  let query;
  // Check if the argument is a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameIdOrSlug);

  if (isUuid) {
    query = supabase.from('games').select('*').eq('id', gameIdOrSlug).single();
  } else {
    // If it's a slug, load the first game row in the tenant database
    query = supabase.from('games').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching game:", error);
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    coupleSpaceId: data.couple_space_id,
    stages: data.stages,
    theme: data.theme,
    customization: data.customization,
    finalMessage: data.final_message,
    giftMessage: data.gift_message,
    celebrationMediaUrl: data.celebration_media_url,
    startDate: data.start_date,
    expiryDate: data.expiry_date,
    views: data.views,
    completions: data.completions,
    createdAt: data.created_at
  };
}

export async function fetchGamesBySpace(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not initialized.");

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('couple_space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching space games:", error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    coupleSpaceId: item.couple_space_id,
    stages: item.stages,
    theme: item.theme,
    customization: item.customization,
    finalMessage: item.final_message,
    giftMessage: item.gift_message,
    celebrationMediaUrl: item.celebration_media_url,
    startDate: item.start_date,
    expiryDate: item.expiry_date,
    views: item.views,
    completions: item.completions,
    createdAt: item.created_at
  }));
}

export async function incrementGameViews(gameId) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data } = await supabase.from('games').select('views').eq('id', gameId).single();
    if (data) {
      await supabase.from('games').update({ views: (data.views || 0) + 1 }).eq('id', gameId);
    }
  } catch (err) {
    console.error(err);
  }
}

export async function incrementGameCompletions(gameId) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data } = await supabase.from('games').select('completions').eq('id', gameId).single();
    if (data) {
      await supabase.from('games').update({ completions: (data.completions || 0) + 1 }).eq('id', gameId);
    }
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================================
   MEMORIES API
   ============================================================================ */

export async function fetchMemories(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('couple_space_id', spaceId)
    .order('date', { ascending: true }); // Chronological

  if (error) throw error;
  return data.map(m => ({
    id: m.id,
    title: m.title,
    date: m.date,
    description: m.description,
    photoUrl: m.photo_url
  }));
}

export async function saveMemory(spaceId, memory) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const record = {
    couple_space_id: spaceId,
    title: memory.title,
    date: memory.date,
    description: memory.description,
    photo_url: memory.photoUrl || null
  };

  const { data, error } = await supabase
    .from('memories')
    .insert([record])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateMemory(memoryId, memory) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const record = {
    title: memory.title,
    date: memory.date,
    description: memory.description,
    photo_url: memory.photoUrl || null
  };

  const { error } = await supabase
    .from('memories')
    .update(record)
    .eq('id', memoryId);

  if (error) throw error;
}

export async function deleteMemory(memoryId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId);

  if (error) throw error;
}

/* ============================================================================
   DREAMS API
   ============================================================================ */

export async function fetchDreams(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('couple_space_id', spaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(d => ({
    id: d.id,
    title: d.title,
    description: d.description,
    isAchieved: d.is_achieved
  }));
}

export async function saveDream(spaceId, dream) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const record = {
    couple_space_id: spaceId,
    title: dream.title,
    description: dream.description,
    is_achieved: dream.isAchieved || false
  };

  const { data, error } = await supabase
    .from('dreams')
    .insert([record])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateDream(dreamId, dreamData) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { error } = await supabase
    .from('dreams')
    .update({ 
      title: dreamData.title,
      description: dreamData.description,
      is_achieved: dreamData.isAchieved 
    })
    .eq('id', dreamId);

  if (error) throw error;
}

export async function toggleDreamAchieved(dreamId, isAchieved) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { error } = await supabase
    .from('dreams')
    .update({ is_achieved: isAchieved })
    .eq('id', dreamId);

  if (error) throw error;
}

export async function deleteDream(dreamId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { error } = await supabase
    .from('dreams')
    .delete()
    .eq('id', dreamId);

  if (error) throw error;
}

/* ============================================================================
   PHOTO GALLERY API
   ============================================================================ */

export async function fetchGallery(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .eq('couple_space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(g => ({
    id: g.id,
    url: g.url,
    caption: g.caption
  }));
}

export async function saveGalleryItem(spaceId, galleryItem) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const record = {
    couple_space_id: spaceId,
    url: galleryItem.url,
    caption: galleryItem.caption || ""
  };

  const { data, error } = await supabase
    .from('gallery')
    .insert([record])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGalleryItem(galleryId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { error } = await supabase
    .from('gallery')
    .delete()
    .eq('id', galleryId);

  if (error) throw error;
}

/* ============================================================================
   IMPORTANT DATES API
   ============================================================================ */

export async function fetchImportantDates(spaceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { data, error } = await supabase
    .from('important_dates')
    .select('*')
    .eq('couple_space_id', spaceId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data.map(d => ({
    id: d.id,
    title: d.title,
    date: d.date,
    isRecurring: d.is_recurring !== false
  }));
}

export async function saveImportantDate(spaceId, dateItem) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const record = {
    couple_space_id: spaceId,
    title: dateItem.title,
    date: dateItem.date,
    is_recurring: dateItem.isRecurring !== false
  };

  const { data, error } = await supabase
    .from('important_dates')
    .insert([record])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateImportantDate(dateId, dateItem) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const record = {
    title: dateItem.title,
    date: dateItem.date,
    is_recurring: dateItem.isRecurring !== false
  };

  const { error } = await supabase
    .from('important_dates')
    .update(record)
    .eq('id', dateId);

  if (error) throw error;
}

export async function deleteImportantDate(dateId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase not initialized.");

  const { error } = await supabase
    .from('important_dates')
    .delete()
    .eq('id', dateId);

  if (error) throw error;
}

/* ============================================================================
   MASTER ADMIN CONTROL PANEL API
   ============================================================================ */

const MASTER_UUID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_MASTER_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // SHA-256 hash of 'admin123'

export async function verifyMasterPassword(password) {
  const master = getMasterClient();
  if (!master) throw new Error("Master database not initialized.");

  const hashed = await hashPassword(password);

  // Try to fetch the special row
  let { data, error } = await master
    .from('couple_spaces')
    .select('*')
    .eq('id', MASTER_UUID)
    .maybeSingle();

  if (error) {
    console.error("Error fetching master config:", error);
    throw error;
  }

  if (!data) {
    // Create default master config row
    const { data: newRow, error: insertError } = await master
      .from('couple_spaces')
      .insert([{
        id: MASTER_UUID,
        password_hash: "DEFAULT_GAME_HASH",
        admin_password_hash: DEFAULT_MASTER_HASH
      }])
      .select('*')
      .single();

    if (insertError) {
      console.error("Error inserting default master password:", insertError);
      throw insertError;
    }
    data = newRow;
  }

  return data.admin_password_hash === hashed;
}

export async function updateMasterPassword(newPassword) {
  const master = getMasterClient();
  if (!master) throw new Error("Master database not initialized.");

  const hashed = await hashPassword(newPassword);

  const { error } = await master
    .from('couple_spaces')
    .update({ admin_password_hash: hashed })
    .eq('id', MASTER_UUID);

  if (error) throw error;
  return true;
}

export async function fetchAllSpaces() {
  const master = getMasterClient();
  if (!master) throw new Error("Master database not initialized.");

  const { data, error } = await master
    .from('spaces_registry')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching spaces registry:", error);
    throw error;
  }

  return data.map(s => ({
    id: s.id,
    slug: s.slug,
    supabaseUrl: s.tenant_supabase_url,
    createdAt: s.created_at,
    price: s.price || 0,
    tier: s.tier || 1,
    theme: 'rose_garden',
    views: 0,
    completions: 0
  }));
}

export async function deleteCoupleSpace(spaceId) {
  const master = getMasterClient();
  if (!master) throw new Error("Master database not initialized.");

  const { error } = await master
    .from('spaces_registry')
    .delete()
    .eq('id', spaceId);

  if (error) throw error;
  return true;
}
