/**
 * backfill-ad-images.mjs
 * ดึง full-quality image จาก Meta API → compress WebP 80% → upload Supabase Storage → อัพเดต DB
 *
 * Usage:
 *   node scripts/backfill-ad-images.mjs             # รันจริง
 *   node scripts/backfill-ad-images.mjs --dry-run   # preview ไม่ upload
 *   node scripts/backfill-ad-images.mjs --limit=50  # จำกัดจำนวน
 */

import dotenv from 'dotenv'
dotenv.config()
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : null
const CONCURRENCY = 5
const BUCKET = 'ad-creatives'
const FB_TOKEN = process.env.FB_ACCESS_TOKEN
const WEBP_QUALITY = 80
const MAX_WIDTH = 1080

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let stats = { total: 0, uploaded: 0, skipped: 0, failed: 0, savedKB: 0 }

/**
 * ดึง full-quality image URL จาก Meta
 * ลำดับ priority: adimages > adcreatives image_url > thumbnail_url
 */
async function fetchFullImageFromMeta(adId) {
  try {
    // 1. ลอง adcreatives ก่อน
    const url = `https://graph.facebook.com/v19.0/${adId}/adcreatives?fields=thumbnail_url,image_url,object_story_spec&access_token=${FB_TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null

    const creative = data.data?.[0]
    const fullUrl = creative?.object_story_spec?.link_data?.picture
      || creative?.object_story_spec?.video_data?.image_url
      || creative?.image_url
      || creative?.thumbnail_url
      || null

    return { url: fullUrl, isThumbnail: !creative?.image_url && !creative?.object_story_spec }
  } catch {
    return null
  }
}

async function compressToWebP(buffer) {
  return sharp(Buffer.from(buffer))
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

async function uploadToStorage(imageUrl, adId) {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const rawBuffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'

  const isTiny = rawBuffer.byteLength < 5120
  const isGif = contentType.includes('gif')

  let finalBuffer, finalContentType, ext, savedKB = 0

  if (isGif || isTiny) {
    finalBuffer = Buffer.from(rawBuffer)
    finalContentType = contentType
    ext = contentType.includes('png') ? 'png' : 'jpg'
  } else {
    finalBuffer = await compressToWebP(rawBuffer)
    finalContentType = 'image/webp'
    ext = 'webp'
    savedKB = Math.round((rawBuffer.byteLength - finalBuffer.length) / 1024)
  }

  const path = `ads/${adId}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, finalBuffer, { contentType: finalContentType, upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, originalKB: Math.round(rawBuffer.byteLength / 1024), finalKB: Math.round(finalBuffer.length / 1024), savedKB }
}

async function processAd({ adId, creativeId }) {
  try {
    // ข้ามถ้ามี webp แล้ว (full quality)
    const existing = await pool.query(
      'SELECT image_url FROM ad_creatives WHERE id = $1',
      [creativeId]
    )
    const currentUrl = existing.rows[0]?.image_url
    if (currentUrl?.includes('supabase.co') && currentUrl?.includes('.webp')) {
      stats.skipped++
      return
    }

    const result = await fetchFullImageFromMeta(adId)
    if (!result?.url) {
      stats.skipped++
      return
    }

    if (DRY_RUN) {
      console.log(`  🔍 [dry-run] ${adId} → would upload ${result.isThumbnail ? '(thumbnail only)' : '(full image)'}`)
      stats.uploaded++
      return
    }

    const upload = await uploadToStorage(result.url, adId)

    await pool.query(
      'UPDATE ad_creatives SET image_url = $1, updated_at = NOW() WHERE id = $2',
      [upload.url, creativeId]
    )

    const tag = result.isThumbnail ? '(thumb)' : `(${upload.originalKB}→${upload.finalKB}KB)`
    console.log(`  ✅ ${adId} ${tag} saved ${upload.savedKB}KB`)
    stats.uploaded++
    stats.savedKB += upload.savedKB
  } catch (err) {
    console.error(`  ❌ ${adId} — ${err.message}`)
    stats.failed++
  }
}

async function runBatch(items) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(processAd))
    process.stdout.write(`\r  Progress: ${Math.min(i + CONCURRENCY, items.length)}/${items.length}  `)
  }
  console.log()
}

async function main() {
  console.log(`\n🚀 backfill-ad-images (WebP 80%) ${DRY_RUN ? '[DRY RUN]' : ''} ${LIMIT ? `[limit=${LIMIT}]` : ''}\n`)

  const query = `
    SELECT a.ad_id, ac.id as creative_id
    FROM ads a
    JOIN ad_creatives ac ON a.creative_id = ac.id
    WHERE a.created_at >= '2026-01-01'
    ORDER BY a.updated_at DESC
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `
  const { rows } = await pool.query(query)
  stats.total = rows.length

  console.log(`📋 Found ${rows.length} ads to process\n`)

  await runBatch(rows.map(r => ({ adId: r.ad_id, creativeId: r.creative_id })))

  console.log(`\n📊 Summary:`)
  console.log(`  Total    : ${stats.total}`)
  console.log(`  Uploaded : ${stats.uploaded}`)
  console.log(`  Skipped  : ${stats.skipped}`)
  console.log(`  Failed   : ${stats.failed}`)
  console.log(`  Saved    : ${stats.savedKB} KB (${(stats.savedKB/1024).toFixed(1)} MB)`)

  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
