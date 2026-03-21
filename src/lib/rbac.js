/**
 * Role-Based Access Control (Phase 29 — ADR-045)
 * Role hierarchy: DEVELOPER > MANAGER > ADMIN > MARKETING (L2.5) > HEAD_CHEF (L2.5) > EMPLOYEE > AGENT > GUEST
 * MARKETING and HEAD_CHEF are domain specialists at L2.5 — full access within their domains.
 */

/** Numeric permission level per role. Higher = more access. */
const ROLE_HIERARCHY = {
  DEVELOPER:  5,
  MANAGER:    4,
  ADMIN:      2,
  MARKETING:  2.5,
  HEAD_CHEF:  2.5,
  EMPLOYEE:   1.5,
  AGENT:      1,
  GUEST:      0,
};

/** Valid role names (all UPPERCASE). Used for role validation. */
const VALID_ROLES = ['DEVELOPER', 'MANAGER', 'ADMIN', 'MARKETING', 'HEAD_CHEF', 'EMPLOYEE', 'AGENT', 'GUEST'];

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

export { ROLE_HIERARCHY, VALID_ROLES, hasPermission, getRoleLevel, isValidRole };
