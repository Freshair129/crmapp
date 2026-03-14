---
name: domain-marketing
description: >
  Context loader for Marketing/Ads domain (10 models, 26 API routes).
  Use when working on ad sync, ROAS calculation, campaign management,
  hourly ledger, creative fatigue, or Meta Graph API integration.
  Covers ADR-024 (Bottom-Up Aggregation) and all marketing pipelines.
---

# Domain: Marketing / Ads Intelligence

## Scope

This domain owns **10 Prisma models** and **26 API routes** related to Meta ad analytics,
campaign management, sync pipelines, and ROAS calculation.

**Trigger keywords:** ad, campaign, ROAS, spend, sync, hourly, ledger, fatigue, Meta API, marketing

---

## Architecture Decision: ADR-024

### D1 — Ad-Level First
Data flows from Meta API at the **Ad level** (not Campaign). This enables product attribution per ad and bottom-up checksum.

### D2 — Bottom-Up Hierarchical Aggregation
```
L1: Ad       → raw Meta API data (persisted)
L2: AdSet    → Sum(Ads in AdSet)  [computed in app layer, NOT stored]
L3: Campaign → Sum(AdSets)        [computed in app layer, NOT stored]
```
Campaign model has NO aggregated metrics fields. `fbSpend`/`fbRevenue` are audit snapshots only.

### D3 — Checksum Verification
After sync: `Sum(Ads.metrics) == Campaign.metrics (from Meta)`. Log discrepancies; don't block.

### D4 — Hourly Persistence (Two-Table)
- `AdHourlyMetric` = snapshot (upsert on each sync)
- `AdHourlyLedger` = **append-only** (insert only when delta != 0)

### D5 — Derived Metrics (runtime, NOT persisted)
```
ROAS = totalRevenue / totalSpend
CPA  = totalSpend / totalTransactions
CON  = totalTransactions / costPerResult
```

### D6 — Differential Sync
- Hourly: fetch only `effective_status: ['ACTIVE']` ads updated since last sync
- Daily 00:00-01:00: full sync to reset baseline

---

## Models (10)

| Model | Unique Key | Purpose |
|---|---|---|
| AdAccount | `accountId` (act_XXX) | Meta account container |
| Campaign | `campaignId` | Campaign container (NO aggregated metrics) |
| AdSet | `adSetId` | Ad set with daily budget + targeting JSON |
| Ad | `adId` | Individual ad — stores L1 aggregates |
| AdDailyMetric | `(adId, date)` | Daily snapshot per ad |
| AdHourlyMetric | `(adId, date, hour)` | Hourly snapshot per ad |
| AdHourlyLedger | indexed `(adId, date, hour)` | Append-only delta ledger |
| AdLiveStatus | `adId` (1:1) | Real-time running status |
| AdCreative | `creativeId` | Creative assets (image, video, headline) |
| Experiment | — | A/B test container |

**Hierarchy:** AdAccount → Campaign → AdSet → Ad → Metrics

---

## Repository: `src/lib/repositories/marketingRepo.js`

| Function | Purpose |
|---|---|
| `getCampaignWithMetrics(campaignId)` | Fetch campaign + nested adSets + ads |
| `getAdDailyMetrics(adId, days=30)` | Last N days daily metrics |
| `upsertAdDailyMetric(adId, date, data)` | Upsert daily; normalizes date to UTC 00:00 |
| `upsertAdHourlyMetric(adId, date, hour, data)` | Upsert hourly; composite key |
| `appendHourlyLedgerIfChanged(adId, date, hour, metrics)` | Delta-only insert (ADR-024 D4). Checks 6 fields. Returns null if no delta |
| `updateCampaignAuditSnapshot(campaignId, data)` | Update fb_* audit snapshot fields |

---

## API Routes (`/api/marketing/`)

### Analytics
| Route | Method | Purpose |
|---|---|---|
| `/ads` | GET | List ads with filters |
| `/ads/insights?ad_id=X` | GET | 30-day daily metrics for single ad (chart) |
| `/adsets` | GET | List ad sets |
| `/campaigns` | GET/POST | List/create campaigns |
| `/campaigns/[id]` | GET/PUT | Get/update campaign |
| `/campaigns/[id]/visibility` | PUT | Toggle visibility |
| `/daily` | GET | Daily aggregated metrics |
| `/hourly?date=YYYY-MM-DD` | GET | Hourly aggregated (24 slots) |
| `/insights` | GET | Campaign-level insights |
| `/fatigue` | GET | Creative fatigue analysis |
| `/ad-calendar` | GET | Campaign calendar |
| `/mapping` | GET/POST | Product-to-campaign mapping |

### Sync Pipelines
| Route | Method | Purpose |
|---|---|---|
| `/sync` | POST | Full sync from Meta API |
| `/sync-hourly` | POST | Hourly differential sync (ADR-024 D6) |
| `/sync-incremental` | POST | Incremental sync |
| `/sync-audit?months=1` | GET | Audit: pull Meta snapshots, log mismatches |

### Google Sheets
| Route | Method | Purpose |
|---|---|---|
| `/sheets/sync` | POST | Manual sheet sync trigger |
| `/sheets/config` | GET | Sync config (mode, interval) |

---

## Scripts

| Script | Purpose |
|---|---|
| `scripts/sync-meta-ads.mjs` | Standalone Meta Ads sync (pg.Client direct, no auth) |
| `scripts/backfill-hourly.mjs` | Backfill hourly metrics |

---

## External APIs

- **Meta Graph API v19.0** — all ad data fetching
- **Access Token:** `process.env.FB_ACCESS_TOKEN` (~90 day expiry)
- **Ad Account:** `process.env.FB_AD_ACCOUNT_ID` (format: `act_XXXXXXXXX`)
- **Rate Limits:** batch 50 ads, 2s delay between batches

---

## NFR Constraints

- Dashboard API response < 500ms (NFR2) — use Redis cache for aggregations
- Sync pipelines log to AuditLog with `traceId` format: `SYNC-ADS-YYYYMMDD-XXXX`

---

## Cross-Domain Boundaries

| Touches | How |
|---|---|
| Customer | `Customer.originId` stores source `ad_id` for ROAS attribution (ADR-025) |
| Order | `Order.conversationId NOT NULL` = Ads Revenue (ADR-030) |
| Chat | `/marketing/chat/*` routes handle FB/LINE messaging (see domain-inbox) |
