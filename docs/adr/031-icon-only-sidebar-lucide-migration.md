# ADR-031 — Icon-Only Sidebar & Lucide React Migration

**Date:** 2026-03-13
**Status:** Accepted
**Deciders:** Lead (Claude), Implementation (Gemini)

---

## Context

Sidebar เดิม (`w-64`) แสดง icon + text label ทุกเมนู — ใช้พื้นที่ screen 256px และพึ่ง FontAwesome CDN (external dependency, ไม่ tree-shakeable)

ปัญหา:
1. พื้นที่ content area แคบลง โดยเฉพาะบน laptop 13"
2. FontAwesome CDN เพิ่ม HTTP request + ไม่ bundle-optimized
3. Icon set ใหญ่เกินจำเป็น (load ทั้ง library)

---

## Decision

### Sidebar Layout
- ปรับ width จาก `w-64` → `w-20` (80px)
- ลบ text label ออกทั้งหมด
- เพิ่ม **tooltip** (popup ขวา) เมื่อ hover แสดงชื่อเมนู
- Group separator: เปลี่ยนจาก text heading → เส้น `w-6 h-px`
- Active indicator: `bg-red-500` button + left-bar `w-1 h-5 bg-red-400`

### Icon Library Migration
- **ลบ**: FontAwesome CDN (`<link>` ใน `<head>`)
- **ใช้**: `lucide-react` (ติดตั้งแล้ว `^0.577.0`) — named imports เท่านั้น

```js
// Before
<i className="fas fa-chart-pie text-lg" />

// After
import { PieChart } from 'lucide-react'
<PieChart size={18} />
```

### Mapping ที่ใช้
| FontAwesome | Lucide |
|---|---|
| fa-chart-pie | PieChart |
| fa-analytics | Brain |
| fa-cash-register | ShoppingCart |
| fa-boxes | Package |
| fa-history | History |
| fa-users | Users |
| fa-comments | MessageCircle |
| fa-comment-dots | MessageSquare |
| fa-bullhorn | Megaphone |
| fa-crosshairs | Crosshair |
| fa-chart-line | TrendingUp |
| fa-bell | Bell |
| fa-user-tie | UserCircle |
| fa-chart-network | Settings2 |
| fa-stopwatch | Timer |
| fa-sliders-h | SlidersHorizontal |
| fa-cog | Settings |
| fa-sign-out-alt | LogOut |
| fa-search | Search |
| fa-moon / fa-sun | Moon / Sun |

---

## Consequences

**Positive:**
- Content area เพิ่มขึ้น 144px (w-64 → w-20)
- Bundle size ลด — Lucide tree-shakes เหลือเฉพาะ icon ที่ใช้จริง
- ไม่มี CDN dependency — ทำงาน offline ได้
- TypeScript-friendly (Lucide มี types ครบ)

**Negative:**
- ผู้ใช้ใหม่ต้อง hover เพื่อดูชื่อเมนู
- Icon บาง semantic อาจไม่ตรง 1:1 กับ FontAwesome เดิม

**Files changed:**
- `src/components/Sidebar.js`
- `src/components/TopBar.js` (new)
