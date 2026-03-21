/**
 * Central Permission Matrix for V School CRM v1.4.0 (Phase 29b)
 * ADR-045: RBAC Redesign — Domain Roles + Central Config
 *
 * Defines 8 roles × 7 domains × 6 actions with special values:
 * - true        = allowed (basic permission)
 * - false/undef = denied (no access)
 * - 'own'       = restricted to own records only
 * - 'log'       = allowed but audit log required
 * - 'request'   = allowed to request (needs approval by higher role)
 */

export const ROLES = [
  'DEVELOPER',
  'ADMIN',
  'MANAGER',
  'MARKETING',
  'HEAD_CHEF',
  'EMPLOYEE',
  'AGENT',
  'GUEST',
]

export const DOMAINS = [
  'business',   // Dashboard, Reports
  'sales',      // POS, Orders, Customers, Enrollments
  'inbox',      // Chat, Conversations
  'marketing',  // Ads Analytics, Sync, Pause/Resume, Budget, Bid
  'kitchen',    // Stock, Lots, PR, Recipe
  'catalog',    // Products, Assets, Packages
  'system',     // Employee Mgmt, Settings
]

export const ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'request',
]

/**
 * Central Permission Matrix
 *
 * Access Control Rules:
 * - true       = user allowed to perform action
 * - false/null = denied (default)
 * - 'own'      = only on records where user is owner/assignee
 * - 'log'      = allowed + audit logging required
 * - 'request'  = can initiate request (needs approver review)
 */
export const PERMISSIONS = {
  DEVELOPER: {
    business: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    sales: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    inbox: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    marketing: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    kitchen: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    catalog: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    system: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
  },

  ADMIN: {
    business: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    sales: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    inbox: {
      view: true,
      create: true,
      edit: true,
      // delete: false (default deny)
    },
    marketing: {
      // All actions denied for ADMIN (marketing is MARKETING's domain)
    },
    kitchen: {
      view: true,
      create: true,
      edit: true,
      // delete: false (default deny)
      approve: true,
    },
    catalog: {
      view: true,
      create: true,
      edit: true,
      // delete: false (default deny)
    },
    system: {
      view: true,
      // create/edit/delete: false (system-level, restricted)
    },
  },

  MANAGER: {
    business: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    sales: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    inbox: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    marketing: {
      view: true,
      create: true,
      edit: true,
      // delete: false
      approve: true,
    },
    kitchen: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    },
    catalog: {
      view: true,
      create: true,
      edit: true,
      delete: true,
    },
    system: {
      view: true,
      // create/edit/delete: false (system is dev-only)
    },
  },

  MARKETING: {
    business: {
      view: true,
    },
    sales: {
      view: true,
    },
    inbox: {
      view: true,
      create: true,
      edit: true,
    },
    marketing: {
      view: true,
      create: true,
      edit: 'log',    // edits require audit log
      approve: false, // cannot self-approve
      request: true,  // can request lifetime budget (needs MANAGER approval)
    },
    kitchen: {
      // No kitchen access
    },
    catalog: {
      view: true,
    },
    system: {
      // No system access
    },
  },

  HEAD_CHEF: {
    business: {
      view: true,
    },
    sales: {
      view: true,
      create: true,
      edit: true,
    },
    inbox: {
      // No inbox access
    },
    marketing: {
      // No marketing access
    },
    kitchen: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true, // Can approve PRs, recipes
    },
    catalog: {
      view: true,
    },
    system: {
      // No system access
    },
  },

  EMPLOYEE: {
    business: {
      view: true,
    },
    sales: {
      view: true,
      create: true,
      edit: true,
    },
    inbox: {
      view: true,
      create: true,
      edit: true,
    },
    marketing: {
      // No marketing access
    },
    kitchen: {
      view: true,
      create: true,
      edit: true,
      // approve: false (cannot approve PR)
      // delete: false (cannot delete stock)
    },
    catalog: {
      view: true,
    },
    system: {
      // No system access
    },
  },

  AGENT: {
    business: {
      view: true,
    },
    sales: {
      view: 'own',    // Only own customers
      create: true,
      edit: 'own',
    },
    inbox: {
      view: 'own',    // Only own conversations
      create: true,
      edit: 'own',
    },
    marketing: {
      // No marketing access
    },
    kitchen: {
      // No kitchen access
    },
    catalog: {
      view: true,
    },
    system: {
      // No system access
    },
  },

  GUEST: {
    business: {
      view: true,
    },
    sales: {
      view: true,
    },
    inbox: {
      // No inbox access
    },
    marketing: {
      // No marketing access
    },
    kitchen: {
      // No kitchen access
    },
    catalog: {
      view: true,
    },
    system: {
      // No system access
    },
  },
}

/**
 * Determines if a role can perform an action on a domain
 *
 * @param {string} role - User role (must be in ROLES)
 * @param {string} domain - Domain (must be in DOMAINS)
 * @param {string} action - Action (must be in ACTIONS)
 * @returns {boolean} true if allowed, false otherwise
 *
 * Note: Returns false for special values like 'own', 'log', 'request'
 * Use canWithMeta() if you need to distinguish permission types
 */
export function can(role, domain, action) {
  if (!ROLES.includes(role) || !DOMAINS.includes(domain) || !ACTIONS.includes(action)) {
    return false
  }

  const domainPerms = PERMISSIONS[role]?.[domain]
  if (!domainPerms) return false

  const permission = domainPerms[action]
  if (permission === true || permission === 'log' || permission === 'own') {
    return true
  }

  return false
}

/**
 * Enhanced permission check with metadata
 *
 * @param {string} role - User role
 * @param {string} domain - Domain
 * @param {string} action - Action
 * @returns {object} { allowed, requiresLog, ownOnly, requiresApproval }
 */
export function canWithMeta(role, domain, action) {
  if (!ROLES.includes(role) || !DOMAINS.includes(domain) || !ACTIONS.includes(action)) {
    return {
      allowed: false,
      requiresLog: false,
      ownOnly: false,
      requiresApproval: false,
    }
  }

  const domainPerms = PERMISSIONS[role]?.[domain]
  if (!domainPerms) {
    return {
      allowed: false,
      requiresLog: false,
      ownOnly: false,
      requiresApproval: false,
    }
  }

  const permission = domainPerms[action]

  const allowed = permission === true || permission === 'log' || permission === 'own' || permission === 'request'
  return {
    allowed,
    requiresLog: permission === 'log',
    ownOnly: permission === 'own',
    // requiresApproval when: permission value is 'request', OR action name is 'request' and it's allowed
    requiresApproval: permission === 'request' || (action === 'request' && allowed),
  }
}

/**
 * Get all accessible domains for a role
 *
 * @param {string} role - User role
 * @returns {array} Domains where user has at least 'view' access
 */
export function getAccessibleModules(role) {
  if (!ROLES.includes(role)) return []

  const rolePerms = PERMISSIONS[role]
  return DOMAINS.filter(domain => {
    const domainPerms = rolePerms?.[domain]
    if (!domainPerms) return false
    return domainPerms.view // Must have at least view permission
  })
}

/**
 * Validate role against allowlist
 *
 * @param {string} role - Role to validate
 * @returns {boolean} true if valid UPPERCASE role
 */
export function isValidRole(role) {
  return ROLES.includes(role)
}

/**
 * Get all permissions for a role
 *
 * @param {string} role - User role
 * @returns {object} Full permission object for the role, or {} if invalid
 */
export function getRolePermissions(role) {
  if (!ROLES.includes(role)) return {}
  return PERMISSIONS[role] || {}
}

/**
 * Check if a role has higher privileges than another
 *
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} true if role1 >= role2 in privilege
 *
 * Hierarchy: DEVELOPER > ADMIN > MANAGER > MARKETING/HEAD_CHEF > EMPLOYEE > AGENT > GUEST
 * MARKETING and HEAD_CHEF are equal (domain specialists at same level)
 */
export function hasHigherPrivilege(role1, role2) {
  const hierarchy = ['DEVELOPER', 'ADMIN', 'MANAGER', ['MARKETING', 'HEAD_CHEF'], 'EMPLOYEE', 'AGENT', 'GUEST']
  
  // Normalize indices
  let idx1 = -1
  let idx2 = -1
  
  for (let i = 0; i < hierarchy.length; i++) {
    const level = hierarchy[i]
    if (Array.isArray(level)) {
      if (level.includes(role1)) idx1 = i
      if (level.includes(role2)) idx2 = i
    } else {
      if (level === role1) idx1 = i
      if (level === role2) idx2 = i
    }
  }

  if (idx1 === -1 || idx2 === -1) return false
  return idx1 <= idx2
}
