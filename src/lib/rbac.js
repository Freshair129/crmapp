/**
 * Role-Based Access Control (Phase 7 — ADR-026)
 * Role hierarchy: DEVELOPER > MANAGER > SUPERVISOR > ADMIN > AGENT > GUEST
 */

/** Numeric permission level per role. Higher = more access. */
const ROLE_HIERARCHY = {
  DEVELOPER:  5,
  MANAGER:    4,
  SUPERVISOR: 3,
  ADMIN:      2,
  AGENT:      1,
  GUEST:      0,
};

/**
 * Returns the numeric level of a role. Unknown roles default to GUEST (0).
 * @param {string} role
 * @returns {number}
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] ?? 0;
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

export { ROLE_HIERARCHY, hasPermission, getRoleLevel };
