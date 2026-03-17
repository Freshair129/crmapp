import { createClient } from '@supabase/supabase-js'

const BUCKET = 'ad-creatives'

let _client = null

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _client
}

/**
 * Upload image from URL to Supabase Storage
 * @param {string} imageUrl - Source URL (e.g. Facebook CDN)
 * @param {string} adId - Meta ad ID (used as filename)
 * @returns {string|null} Public URL in Supabase Storage
 */
export async function uploadAdImage(imageUrl, adId) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const path = `ads/${adId}.${ext}`

    const supabase = getClient()
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      })

    if (error) throw error

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error('[supabaseStorage] uploadAdImage failed', adId, err.message)
    return null
  }
}

/**
 * Get public URL for existing ad image (no re-upload)
 */
export function getAdImageUrl(adId, ext = 'jpg') {
  const supabase = getClient()
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`ads/${adId}.${ext}`)
  return data.publicUrl
}
