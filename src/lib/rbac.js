/**
 * Role-Based Access Control (Phase 29 — ADR-045, updated Phase 34)
 * Role hierarchy: DEVELOPER > OWNER > MANAGER > ADMIN > MARKETING (L2.5) > HEAD_CHEF (L2.5) > EMPLOYEE > AGENT > GUEST
 * MARKETING and HEAD_CHEF are domain specialists at L2.5 — full access within their domains.
 * OWNER = business owner (คุณวอเตอร์) — L4.5 executive read-only across all domains.
 * Multi-role: employees.roles[] (TEXT[]) — permissions are additive union of all assigned roles.
 */

/** Numeric permission level per role. Higher = more access. */
const ROLE_HIERARCHY = {
  DEVELOPER:  5,
  OWNER:      4.5,
  MANAGER:    4,
  ADMIN:      2,
  MARKETING:  2.5,
  HEAD_CHEF:  2.5,
  EMPLOYEE:   1.5,
  AGENT:      1,
  GUEST:      0,
};

/** Valid role names (all UPPERCASE). Used for role validation. Synced with permissionMatrix.js ROLES. */
const VALID_ROLES = ['DEVELOPER', 'OWNER', 'ADMIN', 'MANAGER', 'MARKETING', 'HEAD_CHEF', 'EMPLOYEE', 'AGENT', 'GUEST'];

/**
 * Returns the numeric level of a role. Unknown roles default to GUEST (0).
 * @param {string} role
 * @returns {number}
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Returns true if the provided role is valid (exists in VALID_ROLES).
 * @param {string} role
 * @returns {boolean}
 */
function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

/**
 * Returns true if userRole meets or exceeds requiredRole.
 * @param {string} userRole     - Role of the current user
 * @param {string} requiredRole - Minimum role required
 * @returns {boolean}
 * @example hasPermission('MANAGER', 'ADMIN')      // true
 * @example hasPermission('AGENT',   'MANAGER')    // false
 * @example hasPermission('DEVELOPER', 'DEVELOPER')// true
 */
function hasPermission(userRole, requiredRole) {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Returns the highest permission level across an array of roles.
 * @param {string[]} roles
 * @returns {number}
 */
function getMaxRoleLevel(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return 0;
  return Math.max(...roles.map(getRoleLevel));
}

/**
 * Returns true if ANY role in the provided array meets or exceeds requiredRole.
 * @param {string[]} roles
 * @param {string}   requiredRole
 * @returns {boolean}
 */
function hasMultiRolePermission(roles, requiredRole) {
  return getMaxRoleLevel(roles) >= getRoleLevel(requiredRole);
}

export { ROLE_HIERARCHY, VALID_ROLES, hasPermission, getRoleLevel, isValidRole, getMaxRoleLevel, hasMultiRolePermission };
