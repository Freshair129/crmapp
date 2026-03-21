# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**V School CRM v2** — Greenfield rewrite ของระบบ CRM สำหรับ The V School (โรงเรียนสอนทำอาหารญี่ปุ่น, กรุงเทพฯ)

> ⚠️ นี่คือ v2 เขียนใหม่ทั้งหมด ไม่ใช่ refactor จาก `E:\data_hub`

---

## Version Status (อัพเดท: 2026-03-21)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0` | Auth Stable | ✅ released |
| `v0.10.0` | API Connected | ✅ released |
| `v0.11.0` | Revenue Split | ✅ released |
| `v0.12.0` | UI Enhanced | ✅ released |
| `v0.13.0` | Unified Inbox + Redis Cache | ✅ released |
| `v0.14.0` | NotificationRules + LINE Messaging | ✅ released |
| `v0.15.0` | Asset + Kitchen Ops + Course Enrollment | ✅ released |
| `v0.16.0` | Recipe + Package + Real-time Stock Deduction | ✅ released |
| `v0.18.0` | Production Hardening & API Optimization | ✅ released |
| `v0.19.0` | Schema Hardening (Phase 19 fixes) | ✅ released |
| `v0.20.0` | Lot ID + Class ID (Stock Batches + Course Cohorts) | ✅ released |
| `v0.21.0` | Bug Audit Fix + Repository Layer Refactor (Phase 17) | ✅ released |
| `v0.22.0` | FEFO Stock Deduction Refinement (Phase 21) | ✅ released |
| `v0.23.0` | Repository Layer Full Compliance (Phase 22) | ✅ released |
| `v0.24.0` | Comprehensive Unit Test Expansion — 50+ cases (Phase 14) | ✅ released |
| `v0.25.0` | Production Hardening Complete — RBAC + Security + Build (Phase 14) | ✅ released |
| `v0.26.0` | Chat-First Revenue Attribution — Slip OCR + REQ-07 + 186 tests (Phase 26) | ✅ released |
| `v0.27.0` | Upstash Migration — BullMQ→QStash, ioredis→Upstash, zero local infra (Phase 27) | ✅ released |
| `v1.0.0` | Production Ready — Docs Hardening + ADR-041 (Phase 28) | ✅ released |
| `v1.1.0` | POS ProductDetailModal + Sheet Auto-ID (ADR-042) | ✅ released |
| `v1.2.0` | Equipment Domain POS — hand/material/specs + shipping fields (ADR-043) | ✅ released |
| `v1.3.0` | Web Push Inbox Real-time — ลบ SSE+polling, VAPID (ADR-044) | ✅ released |
| `v1.4.0` | RBAC Redesign — Domain Roles + Ads Optimize Write (ADR-045) | ✅ released ← HEAD |
| `v1.5.0` | POS Receipt & Printer Integration (ADR-046) | 📋 planned |

**Branch:** `master` (งานประจำวัน) · `stable` → ชี้ที่ `v0.12.0`
**รายละเอียด rollback:** `docs/guide/version-control-and-rollback.md`


### v1.4.0 — สิ่งที่ทำแล้ว (Phase 29) ✅ — by Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/lib/permissionMatrix.js` | ✅ done | Central permission config + can() helper |
| `src/lib/rbac.js` | ✅ done | Update VALID_ROLES → 8 roles uppercase |
| `src/lib/authOptions.js` | ✅ done | Role validation uppercase |
| `src/components/TopBar.js` | ✅ done | ROLE_LABEL เพิ่ม MARKETING, HEAD_CHEF |
| `src/app/page.js` + components | ✅ done | แทน hardcoded role checks → can() |
| `src/app/api/ads/*/route.js` | ✅ done | Ads Optimize write routes (6 routes) |
| `src/lib/repositories/adsOptimizeRepo.js` | ✅ done | Meta API write wrapper |
| `prisma/schema.prisma` → AdsOptimizeRequest | ✅ done | Lifetime budget approval model |
| `docs/adr/045-rbac-redesign-ads-optimize.md` | ✅ done | ADR-045 |
| `docs/implement_plan_phase29.md` | ✅ done | Implementation plan |

> ⚠️ **Known Breaking Change — Role Migration**: ต้องรัน DB migration แก้ role values → UPPERCASE + เปลี่ยน NEXTAUTH_SECRET เพื่อ force re-login ทุก session
> ⚠️ **Known Gotcha — 8 Roles**: MARKETING (L2.5) + HEAD_CHEF (L2.5) เป็น domain specialist — ไม่ได้สูงกว่า ADMIN แต่ full access ในโดเมนของตัวเอง

### v1.3.0 — สิ่งที่ทำแล้ว (2026-03-21) ✅ — by Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `public/sw.js` | ✅ new | Service Worker — push event, notification click, PUSH_NAVIGATE |
| `src/lib/pushNotifier.js` | ✅ new | server helper ยิง push ทุก subscription + cleanup 410/404 |
| `src/app/api/push/subscribe/route.js` | ✅ new | POST subscribe / DELETE unsubscribe |
| `prisma/schema.prisma` → `PushSubscription` | ✅ new | endpoint, p256dh, auth, employeeId FK |
| `webhooks/facebook/route.js` | ✅ updated | fire-and-forget notifyInbox() |
| `webhooks/line/route.js` | ✅ updated | fire-and-forget notifyInbox() |
| `UnifiedInbox.js` | ✅ refactored | ลบ SSE+eventBus+polling ออกทั้งหมด → registerPush() |
| `docs/adr/044-web-push-inbox-realtime.md` | ✅ new | ADR-044 |

> ⚠️ **Known Gotcha — VAPID env vars**: ต้อง set ใน Vercel Dashboard ด้วย (ไม่ใช่แค่ `.env.local`) — `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
> ⚠️ **Known Gotcha — Dev push**: local webhook ไม่ถึง browser → push ไม่ทำงานใน dev mode; ใช้ ngrok expose local server หรือ test บน Vercel preview
> ⚠️ **Known Gotcha — Prisma migration**: ต้อง run `prisma db push` (หรือ `migrate dev`) เพื่อสร้าง `push_subscriptions` table

### v1.2.0 — สิ่งที่ทำแล้ว (2026-03-21) ✅ — by Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → Product spec fields | ✅ done | hand, material, boxDimW/L/H, boxWeightG, shippingWeightG |
| `src/app/api/products/[id]/route.js` | ✅ updated | PUT pass-through ทุก spec field ใหม่ |
| `src/components/PremiumPOS.js` | ✅ updated | 3rd mainMode equipment, sub-cats, ORIGIN_COUNTRIES, badges, ProductDetailModal panel |

> ⚠️ **Known Gotcha — Equipment sub-cat**: ใช้ `fallbackSubCategory` ไม่ใช่ `category` สำหรับ sub-filter ใน equipment mode

### v0.13.0 — สิ่งที่ทำแล้ว (Phase 12) ✅
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/components/UnifiedInbox.js` | ✅ done | FB + LINE inbox รวม, pagination, reply, right customer card panel |
| `src/app/api/inbox/conversations/route.js` | ✅ done | enriched customer data: originId, membershipTier, intelligence |
| `src/app/api/inbox/conversations/[id]/messages/route.js` | ✅ done | GET paginated + POST reply |
| `src/components/ExecutiveAnalytics.js` | ✅ done | Lucide icons ครบ, Recharts charts |
| `src/lib/redis.js` | ✅ done | Redis singleton + getOrSet cache pattern (ADR-034) |
| `src/components/NotificationCenter.js` | ✅ done | Google Sheets sync + alert rules |

> ⚠️ **Known Gotcha — Customer model**: ไม่มี field `channel` — ใช้ `conversation.channel` แทน

### v0.14.0 — สิ่งที่ทำแล้ว (Phase 13) ✅ — by Antigravity
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/app/api/notifications/rules/route.js` | ✅ done | GET list + POST create/upsert rules |
| `src/app/api/notifications/rules/[id]/route.js` | ✅ done | DELETE by UUID or ruleId |
| `src/lib/notificationEngine.js` | ✅ done | evaluateRules() — keyword/tier/VIP conditions → BullMQ queue |
| `src/workers/notificationWorker.mjs` | ✅ done | BullMQ worker — LINE push via pushMessage() |
| `src/lib/lineService.js` | ✅ updated | เพิ่ม pushMessage() generic function + quota circuit breaker |
| `src/lib/__tests__/notificationEngine.test.js` | ✅ done | Vitest — 4 test cases |
| `prisma/schema.prisma` → NotificationRule | ✅ done | model + ruleId format NOT-[YYYYMMDD]-[SERIAL] |
| FB+LINE webhooks | ✅ updated | integrated notificationEngine.evaluateRules() |

### v0.15.0 — สิ่งที่ทำแล้ว (Phase 15) ✅ — by Claude + Gemini CLI
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → 9 new models | ✅ done | Enrollment, EnrollmentItem, CourseSchedule, Ingredient, CourseBOM, PurchaseRequest, PurchaseRequestItem, Asset, AssetAssignment |
| `src/lib/repositories/enrollmentRepo.js` | ✅ done | createEnrollment + package expansion, updateHours + cert threshold (30/111/201h) |
| `src/lib/repositories/scheduleRepo.js` | ✅ done | CRUD for CourseSchedule (prisma.courseSchedule) |
| `src/lib/repositories/kitchenRepo.js` | ✅ done | upsertIngredient, upsertBOM, calculateStockNeeded, createPurchaseRequest (PR-YYYYMMDD-SERIAL) |
| `src/lib/repositories/assetRepo.js` | ✅ done | generateAssetId (AST-[CAT3]-[YYYY]-[SERIAL]), CRUD |
| `src/app/api/enrollments/route.js` + `[id]/route.js` | ✅ done | GET+POST / GET+PATCH(hoursToAdd) |
| `src/app/api/schedules/route.js` + `[id]/route.js` | ✅ done | GET(upcoming/days)+POST / GET+PATCH |
| `src/app/api/kitchen/ingredients/route.js` + `[id]/route.js` | ✅ done | GET(lowStockOnly)+POST / PATCH |
| `src/app/api/kitchen/purchase/route.js` + `[id]/route.js` | ✅ done | GET+POST(auto-generate) / PATCH |
| `src/app/api/assets/route.js` + `[id]/route.js` | ✅ done | GET(category/status/search)+POST / GET+PATCH |
| `src/app/api/sheets/sync-master-data/route.js` | ✅ done | POST — CSV sync courses/ingredients/BOM/assets from Google Sheets |
| `src/components/CourseEnrollmentPanel.js` | ✅ done | hours bar, cert badge, expandable items |
| `src/components/KitchenStockPanel.js` | ✅ done | ingredient table, low-stock filter, inline edit |
| `src/components/AssetPanel.js` | ✅ done | asset grid, category/status filter, create+edit modal |
| `src/components/ScheduleCalendar.js` | ✅ done | list/week view, create schedule modal |
| `src/components/PremiumPOS.js` | ✅ upgraded | inline customer creation + enrollment on checkout + success modal |
| `src/components/Sidebar.js` | ✅ updated | OPERATIONS nav group (ตารางคลาส, สต็อกครัว, อุปกรณ์) |
| `src/app/page.js` | ✅ updated | imports + view cases for schedules/kitchen-stock/assets |
| ADR-035, 036, 037 | ✅ done | Remove FB Login / Google Sheets SSOT / Product-as-Course-Catalog |

> ⚠️ **Known Gotcha — Phase 15 DB**: ใช้ `prisma db push` แทน `migrate dev` เพราะ DB drift (facebook_sub column)
> ⚠️ **Known Gotcha — Gemini scheduleRepo**: model name ต้องเป็น `prisma.courseSchedule` ไม่ใช่ `prisma.schedule`
> ⚠️ **Backlog**: Repository pattern violations ใน marketing/inbox routes — flag Phase 17

### v0.16.0 — สิ่งที่ทำแล้ว (Phase 16) ✅ — by Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → Recipe, CourseMenu, RecipeIngredient, RecipeEquipment | ✅ done | สูตรอาหาร + วัตถุดิบ + อุปกรณ์พิเศษ (tracked as stock) |
| `prisma/schema.prisma` → Package, PackageCourse, PackageGift, PackageEnrollment, PackageEnrollmentCourse | ✅ done | แพ็กเกจ + เงื่อนไข swap (1 ครั้ง/enrollment) + ของแถม |
| `prisma/schema.prisma` → Product.hours, Product.sessionType | ✅ done | ชั่วโมงเรียน + ช่วงเวลา (MORNING/AFTERNOON/EVENING) |
| `prisma/schema.prisma` → CourseSchedule.sessionType | ✅ done | ระบุ session เช้า-บ่าย-ค่ำ ต่อ schedule |
| `src/lib/repositories/recipeRepo.js` | ✅ done | CRUD recipes, CourseMenu junction, getMenusByProduct |
| `src/lib/repositories/packageRepo.js` | ✅ done | CRUD packages, createPackageEnrollment, swapCourseInEnrollment (transaction) |
| `src/lib/repositories/scheduleRepo.js` | ✅ updated | เพิ่ม completeSessionWithStockDeduction() — ตัดสต็อกใน prisma.$transaction |
| `src/app/api/recipes/route.js` + `[id]/route.js` | ✅ done | GET+POST / GET+PATCH |
| `src/app/api/packages/route.js` + `[id]/route.js` | ✅ done | GET+POST / GET+PATCH |
| `src/app/api/packages/[id]/swap/route.js` | ✅ done | POST — swap course ใน enrollment (1 ครั้ง, 409 ถ้าใช้แล้ว) |
| `src/app/api/packages/enrollments/route.js` | ✅ done | GET(by customerId)+POST |
| `src/app/api/schedules/[id]/complete/route.js` | ✅ done | POST — complete session + real-time stock deduction |
| `src/components/RecipePage.js` | ✅ done | list สูตร, expand วัตถุดิบ+อุปกรณ์, low-stock badge, add modal |
| `src/components/PackagePage.js` | ✅ done | list แพ็กเกจ, expand courses+gifts+swap groups, add modal (auto-calc originalPrice) |
| `src/components/Sidebar.js` | ✅ updated | เพิ่ม "เมนูสูตร" (BookOpen) + "แพ็กเกจ" (Gift) ใน OPERATIONS group |
| `src/app/page.js` | ✅ updated | imports + view cases for recipes/packages |

> ⚠️ **Known Gotcha — Phase 16 Stock Deduction**: ตัดสต็อกจาก `RecipeIngredient` (qty × studentCount) + `RecipeEquipment` (qtyRequired per session, ไม่คูณนักเรียน)
> ⚠️ **Known Gotcha — Package swap**: `swapUsedAt` ใน PackageEnrollment — ถ้า non-null = ใช้สิทธิ์ไปแล้ว → 409 response
> ⚠️ **Known Gotcha — PackageEnrollment ID format**: PENR-[YYYY]-[SERIAL] (ไม่ใช่ ENR)

### v0.18.0 — สิ่งที่ทำแล้ว (Phase 18) ✅ — by Antigravity
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/app/api/webhooks/facebook/route.js` | ✅ updated | Customer race condition fix (tx try-catch P2002) + env Page IDs |
| `src/app/api/marketing/sync-hourly/route.js` | ✅ updated | Exponential backoff retry (429) + batch processing (batchSize=5) |
| `src/app/api/marketing/chat/conversations/route.js` | ✅ updated | Pagination (limit/cursor) + Null-safe display mapping |
| `src/lib/redis.js` | ✅ updated | JSON.parse safety + _inflight timeout + Negative cache |

> ⚠️ **Known Gotcha — FB Webhook Race**: `findFirst` -> `create` is NOT atomic. ต้องใช้ `try-catch` ครอบ `create` แล้วเช็ค `err.code === 'P2002'` (Prisma unique constraint) เสมอ
> ⚠️ **Known Gotcha — Redis Leaks**: ถ้าใช้ `_inflight` pattern ต้องมี watchdog timeout เสมอ ไม่งั้นถ้า Promise แขวนจะดึง RAM ไปเรื่อยๆ

### v0.20.0 — สิ่งที่ทำแล้ว (Phase 20) ✅ — by Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → IngredientLot | ✅ done | Lot tracking — LOT-YYYYMMDD-XXX, receivedQty, remainingQty, expiresAt, status (ACTIVE/CONSUMED/EXPIRED/RECALLED) |
| `prisma/schema.prisma` → CourseSchedule.classId | ✅ done | Class cohort ID — CLS-YYYYMM-XXX, optional grouping field สำหรับ multi-day course |
| `prisma/schema.prisma` → StockDeductionLog.lotId | ✅ done | Optional lot reference (human-readable, not FK) |
| `src/lib/repositories/kitchenRepo.js` | ✅ updated | + generateLotId, createLot, getLotsByIngredient, getAllLots, getExpiringLots, updateLotStatus |
| `src/lib/repositories/scheduleRepo.js` | ✅ updated | + generateClassId, getSchedulesByClass; createSchedule accepts optional classId |
| `src/app/api/kitchen/lots/route.js` | ✅ done | GET (filter: status, ingredientId, expiring=30) + POST |
| `src/app/api/kitchen/lots/[id]/route.js` | ✅ done | GET + PATCH (status, remainingQty, notes) |
| `id_standards.yaml` | ✅ updated | + LOT-YYYYMMDD-XXX + CLS-YYYYMM-XXX |

> ⚠️ **Known Gotcha — Lot vs currentStock**: `IngredientLot.remainingQty` ≠ `Ingredient.currentStock` — ทั้งสองต้องอัปเดตพร้อมกันเมื่อตัดสต็อก ใน Phase 21 ควร migrate `completeSessionWithStockDeduction` ให้ตัดจาก Lot FEFO ด้วย
> ⚠️ **Known Gotcha — classId auto-generate**: `generateClassId()` ไม่ได้ถูกเรียกอัตโนมัติใน createSchedule — Boss ต้องส่ง classId มาเอง หรือ call generateClassId() ก่อน

### v0.27.0 — สิ่งที่ทำแล้ว (Phase 27) ✅ — by Antigravity + Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/lib/redis.js` | ✅ updated | ioredis → @upstash/redis REST client (API เดิมไม่เปลี่ยน) |
| `src/lib/notificationEngine.js` | ✅ updated | `queue.add()` → `qstash.publishJSON()` |
| `src/app/api/workers/notification/route.js` | ✅ new | Vercel endpoint แทน notificationWorker.mjs — verify QStash sig |
| `src/workers/notificationWorker.mjs` | ✅ deleted | ถูกแทนด้วย /api/workers/notification |
| `queue.js` (BullMQ config) | ✅ deleted | ไม่จำเป็นอีกต่อไป |
| `webhookIntegration.test.js` | ✅ refactored | mock notificationEngine แทน queue.js (cleaner) |
| `package.json` | ✅ updated | ลบ bullmq, เพิ่ม @upstash/redis @upstash/qstash, ลบ worker script |

> ⚠️ **Known Gotcha — Upstash Free Tier**: Redis 10k req/day, QStash 500 msg/day — monitor เมื่อ traffic เพิ่ม
> ⚠️ **Known Gotcha — QStash Latency**: notification ไม่ instant เหมือน BullMQ — delay ~1-3s (ยอมรับได้สำหรับ cooking school)
> ⚠️ **Known Gotcha — QStash Signature**: `/api/workers/notification` ต้อง verify signature เสมอ — ห้ามลบ Receiver.verify()
> ⚠️ **Known Gotcha — Playwright Scraper**: ยังรันบน local machine — ไม่ได้ย้ายไป cloud (FB session required)

---

### v0.26.0 — สิ่งที่ทำแล้ว (Phase 26) ✅ — by Antigravity + Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `prisma/schema.prisma` → Conversation.firstTouchAdId | ✅ done | REQ-07 — บันทึก ad_id แรกที่ลูกค้ามาจาก (immutable) |
| `src/app/api/webhooks/facebook/route.js` | ✅ updated | บันทึก referral.ad_id เมื่อ CREATE conv เท่านั้น |
| `src/lib/slipParser.js` | ✅ done | Gemini Vision OCR — parseSlip() → confidence, amount, date, refNumber |
| `src/lib/repositories/paymentRepo.js` | ✅ done | createPendingFromSlip, getPendingSlips, verifyPayment, getMonthlyRevenue |
| `src/app/api/payments/verify/[id]/route.js` | ✅ done | PATCH — verify slip + auto-create Order |
| `src/app/api/payments/pending/route.js` | ✅ done | GET — pending slips รอ verify |
| Webhook: FB + LINE slip detection | ✅ done | fire-and-forget OCR เมื่อ attachmentType=image |
| Tests (186 cases / 25 files) | ✅ done | slipParser, paymentRepo, webhook integration — 100% pass |

> ⚠️ **Known Gotcha — Slip Confidence**: threshold 0.80 — ต่ำกว่านี้ไม่สร้าง Transaction อัตโนมัติ ต้องให้พนักงาน manual add
> ⚠️ **Known Gotcha — refNumber Duplicate**: สลิปเดียวกันส่ง 2 ครั้งใน chat → reject ที่ refNumber unique constraint
> ⚠️ **Known Gotcha — firstTouchAdId**: บันทึกเฉพาะตอน CREATE — ถ้า conversation สร้างก่อน Phase 26 จะ null (historical data)

---

### v0.23.0 — สิ่งที่ทำแล้ว (Phase 22) ✅ — by Boss + Claude
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/app/api/marketing/sync/status/route.js` | ✅ done | เปลี่ยนจาก direct Redis → `marketingRepo.getSyncStatus()` + `logger` |
| `src/app/api/marketing/sync/route.js` | ✅ done | ย้าย DB logic → `marketingRepo.js` |
| `src/app/api/marketing/chat/conversations/route.js` | ✅ done | ใช้ `inboxRepo.getConversations()` ครบ |
| `src/app/api/marketing/insights/route.js` | ✅ done | ย้าย aggregation → `marketingRepo.js` |
| Unit Tests | ✅ done | test coverage สำหรับ logic ที่ย้าย |

> ✅ **Architecture Compliance:** ไม่มี `import { getPrisma }` โดยตรงใน `/api/marketing/*` หรือ `/api/inbox/*` อีกต่อไป

---

### v0.21.0 — สิ่งที่ทำแล้ว (Phase 20.5 + Phase 17) ✅ — by Claude + Antigravity
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/app/api/inbox/conversations/route.js` | ✅ fixed | C1: missing `await getPrisma()` → crash fix |
| `src/components/PremiumPOS.js` | ✅ fixed | C2: FA CDN icons → Lucide (ADR-031); C3: `?phone=` → `?search=` |
| `src/app/api/marketing/insights/route.js` | ✅ fixed | D1: `acc.impressions` → `acc.reach` ใน reduce |
| `src/components/Analytics.js` | ✅ fixed | D2: timeframe `'lifetime'` → `'all_time'` |
| `src/app/api/analytics/team/route.js` | ✅ fixed | S1: marketingRevenue/Purchases/Leads stub 0 → aggregate จาก AdDailyMetric จริง |
| `src/app/api/marketing/sheets/sync/route.js` | ✅ fixed | S2: cache TTL=0 → 3600 |
| `src/app/api/marketing/sync/route.js` | ✅ optimized | Parallel ad upserts (chunks 25) + bulk daily metrics ($transaction) + RateLimitError fail-fast → HTTP 429 |
| `src/components/LoginPage.js` | ✅ fixed | `result?.ok` → `window.location.href = '/'` (force reload ทันที ไม่รอ polling) |
| `src/lib/repositories/inboxRepo.js` | ✅ new | Phase 17: getConversations, getConversationMessages, postReply |
| `src/lib/repositories/marketingRepo.js` | ✅ updated | Phase 17: getCampaignsWithAggregatedMetrics, getAdSetsWithAggregatedMetrics, getAdsWithMetrics |
| `src/app/api/sheets/sync-master-data/route.js` | ✅ fixed | upsertBOM removed in Phase 20 → deprecation warning แทน |
| `src/lib/dateFilters.js` | ✅ new | รวม getDateRange + getMarketingRangeFilter + TIMEFRAME_LABELS (เดิมชื่อ timeframes.js) |
| `src/lib/__tests__/inboxRepo.test.js` | ✅ new | 3 tests |
| `src/lib/__tests__/syncMasterData.test.js` | ✅ updated | ลบ upsertBOM test + เพิ่ม deprecation warning test |

> ⚠️ **Known Gotcha — Antigravity unreviewed**: Pattern = "functional but wrong" bugs — ผ่าน lint/build แต่ logic ผิด → audit data output เสมอ ไม่ใช่แค่ syntax
> ⚠️ **Known Gotcha — FB Rate Limit**: sync/route.js fail-fast ที่ RateLimitError (code 4/17/32/613) → HTTP 429 + retryAfter:900 — ต้องรอ ~15 นาที แล้ว retry ผ่าน cron

---

## Source of Truth (ยึดสองไฟล์นี้เหนือสิ่งอื่นใด)

| ไฟล์ | หน้าที่ |
|---|---|
| `system_requirements.yaml` | WHAT to build — Functional & Non-Functional Requirements, API spec |
| `id_standards.yaml` | HOW to name — ID formats, casing conventions, ที่มาของ ID ทุกตัว |

**กฎ:** ถ้า code หรือ reference จาก `E:\data_hub` ขัดแย้งกับ 2 ไฟล์นี้ → ยึดตาม spec เสมอ

---

## Reference (ใช้ได้เมื่อไม่ขัดแย้ง)

- `E:\data_hub\crm-app\` — production codebase เก่า (messy, ใช้เป็น logic reference)
- `E:\crm\docs\adr\` — ADR 001–023 สำหรับเข้าใจ decisions ที่ผ่านมา

---

## Session Start Protocol (บังคับ — ทำทุกครั้งที่เริ่ม session ใหม่)

1. **อ่าน `MEMORY.md`** — ตรวจว่า Antigravity ทำอะไรไปบ้างระหว่างที่ Claude ไม่อยู่
2. **อ่าน `GOAL.md` → Project Status table** — ดู Active Phase + Known Issues
3. **อ่าน `CHANGELOG.md` → LATEST pointer** — รู้ว่า HEAD อยู่ที่ version ไหน; ถ้า LATEST ≠ CLAUDE.md version table → sync ก่อน
4. ถ้ามีการเปลี่ยนแปลงที่ Claude ไม่เห็นด้วย → บันทึกใน MEMORY.md + แจ้ง Boss
5. ถ้าไม่มีอะไรเปลี่ยน → ข้ามได้ ทำงานต่อปกติ

> 📋 **Changelog protocol:** หลังทุก commit ที่มีนัยสำคัญ → สร้าง `changelog/CL-[YYYYMMDD]-[NNN].md` + อัปเดต `CHANGELOG.md` sliding window (Recent = 5 entries) ดู spec ใน `changelog/CHANGELOG_SYSTEM.md`

---

## Conflict Resolution Protocol

เมื่อ Agent ตัดสินใจที่ขัดแย้งกับ architecture:

| ระดับ | ตัวอย่าง | ใครตัดสิน |
|---|---|---|
| **Naming/Style** | ตั้งชื่อ variable ผิด convention | Agent แก้เองได้ |
| **Implementation** | เลือก algorithm ต่างกัน | Claude review แล้วอนุมัติ/แก้ |
| **Architecture** | เพิ่ม model ใหม่, เปลี่ยน DB schema | Claude ตัดสินใจ + เขียน ADR |
| **Breaking Change** | เปลี่ยน API contract, ลบ field | Boss อนุมัติเท่านั้น |

**กฎ:** ถ้า Antigravity ทำ Architecture-level change ไปแล้ว → Claude ต้อง review + เขียน ADR retroactive

---

## Domain Routing (ใช้เลือก context ตาม task)

| Task เกี่ยวกับ | โหลด Skill | ADR หลัก | Key Files |
|---|---|---|---|
| Ad sync, ROAS, campaign | `domain-marketing` | ADR-024 | marketingRepo.js, sync-meta-ads.mjs |
| Chat, webhook, inbox | `domain-inbox` | ADR-028, 033 | UnifiedInbox.js, webhooks/ |
| Customer, order, identity | `domain-customer` | ADR-025, 030 | customerRepo.js, identityService.js |
| DB, Redis, auth, deploy | `domain-infra` | ADR-026, 034 | prisma.ts, redis.js, middleware.js |

---

## Architecture Decisions ใหม่ (v2)

| ADR | Decision |
|---|---|
| ADR-024 | Marketing Intelligence: Bottom-Up Aggregation, Checksum, Hourly Ledger |
| ADR-025 | Identity Resolution: Phone E.164, Cross-platform Merge, LINE Attribution |
| ADR-026 | RBAC: 6-tier role hierarchy, server-side guard |
| ADR-027 | DB Schema Init: 23 models, UUID PKs, named relations |
| ADR-028 | Facebook Messaging: Webhook < 200ms, fire-and-forget, prisma.$transaction |
| ADR-029 | Employee Registry: Auto-generate TVS-EMP ID, JSONB identities, bcrypt |
| ADR-030 | Revenue Channel Split: conversationId → Ads vs Store classification |
| ADR-031 | Icon-Only Sidebar: w-20, Lucide migration ออกจาก FontAwesome CDN |
| ADR-032 | UI Enhancement (A): Recharts charts, Framer Motion animations |
| ADR-035 | Remove Facebook Login: CredentialsOnly auth (FB hides admin PSID) |
| ADR-036 | Google Sheets as SSOT: master data sync via CSV URL, 4 env vars |
| ADR-037 | Product-as-Course-Catalog: reuse Product model, certLevel 30/111/201h |
| ADR-043 | Equipment Domain POS: hand/material/specs/shipping fields, ORIGIN_COUNTRIES dropdown |
| ADR-044 | Web Push Inbox: VAPID, Service Worker, ลบ SSE+polling ออก |
| ADR-045 | RBAC Redesign: 8 roles, permissionMatrix.js, Ads Optimize write (Meta API) |
| ADR-046 | POS Receipt & Printer: Receipt model, thermal 80mm ESC/POS, LINE send, history |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Redis + BullMQ |
| AI | Google Gemini |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |

---

## Naming Conventions (จาก `id_standards.yaml`)

| Context | Convention | ตัวอย่าง |
|---|---|---|
| DB columns / Prisma `@map` | `snake_case` | `customer_id`, `fb_thread_id` |
| JS/TS application code | `camelCase` | `customerId`, `fbThreadId` |
| React Components | `PascalCase` | `CustomerList`, `FacebookChat` |
| Env vars | `SCREAMING_SNAKE` | `FB_PAGE_ACCESS_TOKEN` |
| CSS | Tailwind utility classes | — |

**ห้ามใช้ `snake_case` ใน JS/TS layer เด็ดขาด**

---

## Key ID Formats (จาก `id_standards.yaml`)

```
Customer    : TVS-CUS-[CH]-[YY]-[XXXX]     e.g. TVS-CUS-FB-26-0123
Member      : MEM-[YY][AGENT][INTENT]-[NO] e.g. MEM-26BKKP-0001
Agent Code  : AGT-[TYPE]-[YEAR]-[SERIAL]   e.g. AGT-H-26-003
Task        : TSK-[YYYYMMDD]-[SERIAL]      e.g. TSK-20260308-001
Conversation: t_{15_digit_uid}             e.g. t_10163799966326505
Message     : mid.$c... หรือ m_...
Trace/Sync  : SYNC-[TYPE]-[YYYYMMDD]-[RND] e.g. SYNC-ADS-20260308-A92B
```

---

## Non-Functional Requirements (ห้ามละเมิด)

- **NFR1** — Webhook ตอบ Facebook < 200ms เสมอ
- **NFR2** — Dashboard API < 500ms (ใช้ local JSON cache)
- **NFR3** — BullMQ retry ≥ 5 ครั้ง, exponential backoff
- **NFR5** — Identity upsert ต้องอยู่ใน `prisma.$transaction`

---

## Error Handling Rules

- **ห้าม** `catch(e) {}` เงียบ — ต้อง log ทุกครั้ง
- Format: `console.error('[ModuleName] message', error)`
- API routes: `NextResponse.json({ error }, { status })`
- Workers: `throw error` เพื่อให้ BullMQ retry

---

## Database Access Pattern

- ทุก DB operation ต้องผ่าน repository layer (`src/lib/repositories/`)
- ห้ามเรียก Prisma โดยตรงจาก API route หรือ Component
- Cache operations ผ่าน `src/lib/cache/cacheSync.js` เท่านั้น
- File I/O ใช้ `fs.promises` เสมอ — ห้าม `readFileSync/writeFileSync`

---

---

## Role & Hierarchy

1. **Claude (Lead Architect)**: กำหนดทิศทางภาพรวม, อนุมัติ ADRs, และตัดสินใจเรื่อง Architecture หลัก
2. **Antigravity (Senior Agent)**: รับแผนจาก Claude, วางแผนละเอียด (Task Breakdown), และดำเนินการแบบ End-to-End (Context ใน `ANTIGRAVITY.md`)
3. **Gemini CLI (Sub-agent)**: รับหน้าที่ Implement เฉพาะจุด, เขียน Unit Test หรือ Boilerplate (Context ใน `GEMINI.md`)

---

## Sub-agent Protocol (Gemini CLI)

```bash
# รันจาก /Users/ideab/Desktop/crm เสมอ เพื่อให้ GEMINI.md โหลด context อัตโนมัติ
cd /Users/ideab/Desktop/crm
echo "INTERFACE_SPEC" | gemini -p "implement, code only" -o text
```

- ส่งเฉพาะ **function signature / interface** ไม่ส่งโค้ดทั้งไฟล์
- Gemini: boilerplate, helpers, unit tests
- Claude: architectural decisions, integration logic, security, QA

---

## Auto-Update Protocol (บังคับ — ทำทุกครั้งหลังเสร็จงาน)

หลังทำงานชิ้นใหญ่ หรือ commit สำเร็จ Claude **ต้องอัปเดต** ไฟล์เหล่านี้โดยไม่ต้องรอให้สั่ง:

| ไฟล์ | เมื่อไหร่ต้องอัปเดต |
|---|---|
| `CLAUDE.md` | เมื่อ version status เปลี่ยน, phase เสร็จ, หรือมี Known Gotcha ใหม่ |
| `GEMINI.md` | เมื่อ phase เปลี่ยน (DONE/CURRENT/PLANNED), DB schema เพิ่มฟิลด์, หรือ API routes ใหม่ |
| `GOAL.md` | เมื่อ task ใน phase เสร็จ → tick ✅, หรือ phase ใหม่เริ่ม |
| `CHANGELOG.md` | เมื่อทำ commit ที่มีนัยสำคัญ (feature, fix, breaking change) |

### กฎ
1. หลัง commit ทุกครั้ง → ตรวจ CLAUDE.md version table ว่าตรงไหม
2. เมื่อ phase เสร็จ → อัปเดต GOAL.md table + เพิ่ม detail section
3. ถ้า API route ใหม่ → เพิ่มใน GEMINI.md Directory section
4. Known Gotcha ใหม่ → เพิ่มใน CLAUDE.md ทันที

---

## Docs Ownership Table

ตารางนี้บอกว่า "เมื่อ code เปลี่ยนแบบนี้ → ต้องอัปเดต doc ไหนบ้าง" เพื่อป้องกัน docs drift

| เมื่อ Code เปลี่ยน | ต้องอัปเดต Doc เหล่านี้ |
|---|---|
| เพิ่ม Prisma model ใหม่ | `prisma/schema.prisma` → `docs/architecture/database-erd/high-level.md`, `full-schema.md`, `domain-architecture.md` (section boundaries) |
| เพิ่ม field ใน model | `docs/architecture/database-erd/full-schema.md` (entity detail section) |
| API route ใหม่ | `GEMINI.md` (Directory section), `docs/API_REFERENCE.md` |
| ตัดสินใจ Architecture ใหม่ (ADR) | สร้างไฟล์ `docs/adr/0NN-title.md` + เพิ่ม entry ใน `CLAUDE.md` (ADR table) |
| Domain boundary เปลี่ยน | `docs/architecture/domain-architecture.md` (Part 1 + Part 3 version history) |
| Data flow เปลี่ยน (webhook, queue, cache) | `docs/architecture/domain-architecture.md` (Part 2 flow diagrams) |
| Revenue/Attribution logic เปลี่ยน | `docs/architecture/revenue-attribution-model.md` |
| ID format ใหม่ / เปลี่ยน | `id_standards.yaml` (root SSOT) — **ห้ามแก้ `docs/id_standards.yaml`** (ถูกลบแล้ว) |
| Phase/Version เสร็จ | `CLAUDE.md` (version table + changelog section), `GOAL.md`, `CHANGELOG.md` |
| Known Gotcha พบใหม่ | `CLAUDE.md` ทันที (ภายใต้ phase ที่เกี่ยวข้อง) |
| NFR / Performance rule เปลี่ยน | `CLAUDE.md` (Non-Functional Requirements section) |

### Docs Location Map (SSOT)

| Document | Path | Owner | หมายเหตุ |
|---|---|---|---|
| Functional requirements | `system_requirements.yaml` (root) | Boss + Claude | **ห้ามแก้ `docs/system_requirements.yaml`** (ถูกลบแล้ว) |
| ID standards | `id_standards.yaml` (root) | Claude | SSOT เดียว — v1.3.0 header |
| DB ERD high-level | `docs/architecture/database-erd/high-level.md` | Claude | อัปเดตทุกครั้งที่ model เปลี่ยน |
| DB ERD full schema | `docs/architecture/database-erd/full-schema.md` | Claude | entity + field detail |
| Domain boundaries + flows | `docs/architecture/domain-architecture.md` | Claude | merged จาก domain-boundaries + domain-flows |
| Revenue attribution model | `docs/architecture/revenue-attribution-model.md` | Claude | business-facing, audience ≠ ERD |
| ADR (v2, active) | `docs/adr/024` → latest | Claude | ทุก Architecture decision ต้องมี ADR |
| ADR (v1, archived) | `docs/archive/adr-v1/` | Read-only | ADR 001-023 — ไม่แก้ไข |
| Version history | `CHANGELOG.md` + `changelog/CL-*.md` | Claude | sliding window 5 entries |
| Agent context | `CLAUDE.md`, `GEMINI.md`, `ANTIGRAVITY.md` | Claude | sync หลัง commit ทุกครั้ง |

---

## Development Commands

```bash
cd /Users/ideab/Desktop/crm
docker compose up -d       # PostgreSQL (port 5433) + Redis
npx prisma generate
npx prisma migrate dev
npm run dev                 # http://localhost:3000
npm run worker              # BullMQ worker (terminal แยก)
```

**Node.js:** v22 LTS (Iron) — ดู `.nvmrc`

---

## Docs Structure

```
crm/
  system_requirements.yaml   ← spec หลัก (SSOT — ห้ามมี docs/ copy)
  id_standards.yaml          ← naming หลัก (SSOT — ห้ามมี docs/ copy)
  CLAUDE.md                  ← this file
  ANTIGRAVITY.md             ← Senior Agent context
  GEMINI.md                  ← Gemini sub-agent context
  CHANGELOG.md               ← version history (sliding window 5)
  architect_plan.md          ← implementation roadmap
  prisma/schema.prisma       ← database schema
  docs/
    adr/                     ← ADR 024–latest (v2 active)
    archive/
      adr-v1/                ← ADR 001–023 (v1 archived, read-only)
    architecture/
      database-erd/
        high-level.md        ← conceptual ERD
        full-schema.md       ← full entity + field detail
      domain-architecture.md ← domain boundaries + data flows (merged)
      revenue-attribution-model.md ← ROAS + attribution business model
  changelog/                 ← CL-YYYYMMDD-NNN.md entries
  automation/                ← Playwright scripts
  src/                       ← Next.js app
```
