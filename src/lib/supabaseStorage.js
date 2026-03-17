import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const BUCKET = 'ad-creatives'
const WEBP_QUALITY = 80      // 80% quality — good balance size/clarity
const MAX_WIDTH = 1080       // cap ที่ 1080px (ขนาด ad มาตรฐาน)

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
 * Compress image buffer → WebP 80% quality, max 1080px wide
 * @param {ArrayBuffer} buffer - Raw image bytes
 * @returns {Buffer} Compressed WebP buffer
 */
async function compressToWebP(buffer) {
  return sharp(Buffer.from(buffer))
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

/**
 * Upload image from URL → compress to WebP → Supabase Storage
 * @param {string} imageUrl - Source URL (Facebook CDN or direct)
 * @param {string} adId - Meta ad ID (used as filename)
 * @param {object} opts
 * @param {boolean} opts.fullQuality - ดึง full-size image แทน thumbnail
 * @returns {string|null} Public URL in Supabase Storage
 */
export async function uploadAdImage(imageUrl, adId, { fullQuality = false } = {}) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)

    const rawBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    // Skip compression for GIF/SVG/tiny files (<5KB = already thumbnail)
    const isAnimated = contentType.includes('gif')
    const isSvg = contentType.includes('svg')
    const isTiny = rawBuffer.byteLength < 5120

    let finalBuffer, finalContentType, ext

    if (isAnimated || isSvg || isTiny) {
      // เก็บตามเดิม ไม่ compress
      finalBuffer = Buffer.from(rawBuffer)
      finalContentType = contentType
      ext = isSvg ? 'svg' : contentType.includes('png') ? 'png' : 'jpg'
    } else {
      // Compress → WebP
      finalBuffer = await compressToWebP(rawBuffer)
      finalContentType = 'image/webp'
      ext = 'webp'
    }

    const path = `ads/${adId}.${ext}`
    const supabase = getClient()

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, finalBuffer, {
        contentType: finalContentType,
        upsert: true,
      })

    if (error) throw error

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)

    // Log compression ratio for full-quality uploads
    if (fullQuality && !isTiny) {
      const ratio = ((1 - finalBuffer.length / rawBuffer.byteLength) * 100).toFixed(0)
      console.log(`[storage] ${adId} ${Math.round(rawBuffer.byteLength/1024)}KB → ${Math.round(finalBuffer.length/1024)}KB WebP (${ratio}% saved)`)
    }

    return data.publicUrl
  } catch (err) {
    console.error('[supabaseStorage] uploadAdImage failed', adId, err.message)
    return null
  }
}

/**
 * Get public URL for existing ad image
 */
export function getAdImageUrl(adId, ext = 'webp') {
  const supabase = getClient()
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`ads/${adId}.${ext}`)
  return data.publicUrl
}
