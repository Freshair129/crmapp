/**
 * backfill-ad-images.mjs
 * ดึง thumbnail ใหม่จาก Meta API → upload ขึ้น Supabase Storage → อัพเดต DB
 *
 * Usage:
 *   node scripts/backfill-ad-images.mjs             # รันจริง
 *   node scripts/backfill-ad-images.mjs --dry-run   # preview ไม่ upload
 *   node scripts/backfill-ad-images.mjs --limit 50  # จำกัดจำนวน
 */

import dotenv from 'dotenv'
dotenv.config()
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : null
const CONCURRENCY = 5
const BUCKET = 'ad-creatives'
const FB_TOKEN = process.env.FB_ACCESS_TOKEN

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let stats = { total: 0, uploaded: 0, skipped: 0, failed: 0 }

async function fetchThumbnailFromMeta(adId) {
  try {
    const url = `https://graph.facebook.com/v19.0/${adId}/adcreatives?fields=thumbnail_url,image_url&access_token=${FB_TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return null
    const creative = data.data?.[0]
    return creative?.thumbnail_url || creative?.image_url || null
  } catch {
    return null
  }
}

async function uploadToStorage(imageUrl, adId) {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const path = `ads/${adId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function processAd({ adId, creativeId, currentImageUrl }) {
  try {
    // ถ้า image_url ชี้ไป Supabase แล้ว ข้ามได้เลย
    if (currentImageUrl?.includes('supabase.co')) {
      stats.skipped++
      return
    }

    // ดึง thumbnail ใหม่จาก Meta
    const freshUrl = await fetchThumbnailFromMeta(adId)
    if (!freshUrl) {
      console.log(`  ⚠️  ${adId} — no thumbnail from Meta, skipping`)
      stats.skipped++
      return
    }

    if (DRY_RUN) {
      console.log(`  🔍 [dry-run] ${adId} → would upload`)
      stats.uploaded++
      return
    }

    const storageUrl = await uploadToStorage(freshUrl, adId)

    // อัพเดต DB
    await pool.query(
      'UPDATE ad_creatives SET image_url = $1, updated_at = NOW() WHERE id = $2',
      [storageUrl, creativeId]
    )

    console.log(`  ✅ ${adId} → ${storageUrl.slice(-40)}`)
    stats.uploaded++
  } catch (err) {
    console.error(`  ❌ ${adId} — ${err.message}`)
    stats.failed++
  }
}

async function runBatch(items) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(processAd))
    process.stdout.write(`\r  Progress: ${Math.min(i + CONCURRENCY, items.length)}/${items.length}`)
  }
  console.log()
}

async function main() {
  console.log(`\n🚀 backfill-ad-images ${DRY_RUN ? '[DRY RUN]' : ''} ${LIMIT ? `[limit=${LIMIT}]` : ''}\n`)

  const query = `
    SELECT a.ad_id, ac.id as creative_id, ac.image_url
    FROM ads a
    JOIN ad_creatives ac ON a.creative_id = ac.id
    WHERE ac.image_url IS NOT NULL
      AND ac.image_url NOT LIKE '%supabase.co%'
      AND a.created_at >= '2026-01-01'
    ORDER BY a.updated_at DESC
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `
  const { rows } = await pool.query(query)
  stats.total = rows.length

  console.log(`📋 Found ${rows.length} ads to process\n`)

  const items = rows.map(r => ({
    adId: r.ad_id,
    creativeId: r.creative_id,
    currentImageUrl: r.image_url
  }))

  await runBatch(items)

  console.log(`\n📊 Summary:`)
  console.log(`  Total   : ${stats.total}`)
  console.log(`  Uploaded: ${stats.uploaded}`)
  console.log(`  Skipped : ${stats.skipped}`)
  console.log(`  Failed  : ${stats.failed}`)

  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
