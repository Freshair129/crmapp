/**
 * Central Permission Matrix — V School CRM (Phase 36, ADR-045 rev2)
 * Role structure redesign: S-prefix = Special, R-prefix = Regular
 *
 * 12 roles: DEV, TEC, MGR, MKT, HR, PUR, PD, ADM, ACC, SLS, AGT, STF
 *
 * Permission levels:
 * - [F] true       = Full CRUD (view + create + edit + delete)
 * - [A] 'approve'  = view + approve only
 * - [R] view:true  = Read only
 * - [N] {}         = No access
 * - 'own'          = Restricted to own records only
 * - 'log'          = Allowed + audit log required
 * - 'request'      = Allowed to request (needs approval)
 */

export const ROLES = [
  'DEV',  // S1 — Developer
  'TEC',  // S2 — Tech / IT
  'MGR',  // R2 — Management
  'MKT',  // R3 — Marketing
  'HR',   // R4 — Human Resource
  'PUR',  // R5 — Purchasing
  'PD',   // R6 — Warehouse / Production
  'ADM',  // R7 — Admin / Doc
  'ACC',  // R8 — Accounting
  'SLS',  // R9 — Sales
  'AGT',  // R10 — Agent (freelance/representative)
  'STF',  // R11 — Staff (general/cashier)
]

export const DOMAINS = [
  'business',   // Dashboard, BI Reports, Financial Overview
  'sales',      // POS, Orders, Customers, Enrollments
  'inbox',      // Chat, Conversations (FB + LINE)
  'marketing',  // Ads Analytics, Sync, Campaigns, Notification Rules
  'kitchen',    // Stock, Lots, PR, Recipe, Procurement
  'catalog',    // Products, Assets, Packages
  'system',     // Employee Mgmt, Settings, User Accounts
]

export const ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'request',
]

export const PERMISSIONS = {
  // ── S1: Developer — Full access all domains ──────────────────────────────
  DEV: {
    business:  { view: true, create: true, edit: true, delete: true, approve: true },
    sales:     { view: true, create: true, edit: true, delete: true, approve: true },
    inbox:     { view: true, create: true, edit: true, delete: true },
    marketing: { view: true, create: true, edit: true, delete: true, approve: true },
    kitchen:   { view: true, create: true, edit: true, delete: true, approve: true },
    catalog:   { view: true, create: true, edit: true, delete: true },
    system:    { view: true, create: true, edit: true, delete: true },
  },

  // ── S2: Tech / IT — [F] system, [R] all others ───────────────────────────
  TEC: {
    business:  { view: true },
    sales:     { view: true },
    inbox:     { view: true },
    marketing: { view: true },
    kitchen:   { view: true },
    catalog:   { view: true },
    system:    { view: true, create: true, edit: true, delete: true },
  },

  // ── R2: Management — [A] approve all, [R] cross ──────────────────────────
  MGR: {
    business:  { view: true, approve: true },
    sales:     { view: true, approve: true },
    inbox:     { view: true },
    marketing: { view: true, approve: true },
    kitchen:   { view: true, approve: true },
    catalog:   { view: true },
    system:    { view: true },
  },

  // ── R3: Marketing — [F] marketing, cross R9/R10/R11 ──────────────────────
  MKT: {
    business:  { view: true },
    sales:     { view: true, create: true, edit: true },
    inbox:     { view: true, create: true, edit: true },
    marketing: { view: true, create: true, edit: true, delete: true },
    kitchen:   {},
    catalog:   { view: true },
    system:    {},
  },

  // ── R4: Human Resource — [F] system (HR domain) ──────────────────────────
  HR: {
    business:  { view: true },
    sales:     {},
    inbox:     {},
    marketing: {},
    kitchen:   {},
    catalog:   {},
    system:    { view: true, create: true, edit: true, delete: true },
  },

  // ── R5: Purchasing — [F] kitchen/PO, cross R6 ────────────────────────────
  PUR: {
    business:  { view: true },
    sales:     {},
    inbox:     {},
    marketing: {},
    kitchen:   { view: true, create: true, edit: true, approve: true },
    catalog:   { view: true, create: true, edit: true },
    system:    {},
  },

  // ── R6: Warehouse / Production — [F] kitchen + catalog, cross R5 ─────────
  PD: {
    business:  { view: true },
    sales:     {},
    inbox:     {},
    marketing: {},
    kitchen:   { view: true, create: true, edit: true, delete: true },
    catalog:   { view: true, create: true, edit: true, delete: true },
    system:    {},
  },

  // ── R7: Admin / Doc — [F] enrollment, [R] cross ──────────────────────────
  ADM: {
    business:  { view: true },
    sales:     { view: true, create: true, edit: true },
    inbox:     { view: true },
    marketing: { view: true },
    kitchen:   {},
    catalog:   { view: true },
    system:    {},
  },

  // ── R8: Accounting — [F] business, [A] sales, [R] marketing ─────────────
  ACC: {
    business:  { view: true, create: true, edit: true, approve: true },
    sales:     { view: true, approve: true },
    inbox:     {},
    marketing: { view: true },
    kitchen:   {},
    catalog:   {},
    system:    {},
  },

  // ── R9: Sales — [F] sales, [R] marketing, inbox own ─────────────────────
  SLS: {
    business:  { view: true },
    sales:     { view: true, create: true, edit: true },
    inbox:     { view: 'own', create: true, edit: 'own' },
    marketing: { view: true },
    kitchen:   {},
    catalog:   { view: true },
    system:    {},
  },

  // ── R10: Agent — sales own + inbox own ───────────────────────────────────
  AGT: {
    business:  {},
    sales:     { view: 'own', create: true, edit: 'own' },
    inbox:     { view: 'own', create: true, edit: 'own' },
    marketing: {},
    kitchen:   {},
    catalog:   { view: true },
    system:    {},
  },

  // ── R11: Staff — cashier + basic tasks ───────────────────────────────────
  STF: {
    business:  {},
    sales:     { view: true, create: true },
    inbox:     {},
    marketing: {},
    kitchen:   { view: true },
    catalog:   { view: true },
    system:    {},
  },
}

/**
 * can(role, domain, action) → boolean
 * Returns true if role can perform action on domain.
 * Special values 'own', 'log', 'request' also return true (caller enforces restriction).
 */
export function can(role, domain, action) {
  if (!ROLES.includes(role) || !DOMAINS.includes(domain) || !ACTIONS.includes(action)) {
    return false
  }
  const perm = PERMISSIONS[role]?.[domain]?.[action]
  return perm === true || perm === 'own' || perm === 'log' || perm === 'request'
}

export function canWithMeta(role, domain, action) {
  if (!ROLES.includes(role) || !DOMAINS.includes(domain) || !ACTIONS.includes(action)) {
    return { allowed: false, requiresLog: false, ownOnly: false, requiresApproval: false }
  }
  const perm = PERMISSIONS[role]?.[domain]?.[action]
  const allowed = perm === true || perm === 'own' || perm === 'log' || perm === 'request'
  return {
    allowed,
    requiresLog:     perm === 'log',
    ownOnly:         perm === 'own',
    requiresApproval: perm === 'request' || (action === 'request' && allowed),
  }
}

export function getAccessibleModules(role) {
  if (!ROLES.includes(role)) return []
  const rolePerms = PERMISSIONS[role]
  return DOMAINS.filter(d => {
    const dp = rolePerms?.[d]
    return dp && (dp.view === true || dp.view === 'own')
  })
}

export function isValidRole(role) {
  return ROLES.includes(role)
}

export function getRolePermissions(role) {
  if (!ROLES.includes(role)) return {}
  return PERMISSIONS[role] || {}
}

export function hasHigherPrivilege(role1, role2) {
  const levels = { DEV: 5, TEC: 3.5, MGR: 4, MKT: 2.5, HR: 3, PUR: 2.5, PD: 2.5, ADM: 2, ACC: 3, SLS: 1.5, AGT: 1, STF: 0.5 }
  return (levels[role1] ?? 0) >= (levels[role2] ?? 0)
}
