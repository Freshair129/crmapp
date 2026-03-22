/**
 * Role-Based Access Control (Phase 36 — ADR-045 rev2)
 * New role structure: S-prefix = Special, R-prefix = Regular
 * DEV(S1) > MGR(R2) > TEC(S2) = HR(R4) = ACC(R8) > MKT(R3) = PUR(R5) = PD(R6) > ADM(R7) > SLS(R9) > AGT(R10) > STF(R11)
 * Multi-role: employees.roles[] (TEXT[]) — permissions are additive union of all assigned roles.
 */

/** Numeric permission level per role. Higher = more access. */
const ROLE_HIERARCHY = {
  DEV: 5,
  MGR: 4,
  TEC: 3.5,
  HR:  3,
  ACC: 3,
  MKT: 2.5,
  PUR: 2.5,
  PD:  2.5,
  ADM: 2,
  SLS: 1.5,
  AGT: 1,
  STF: 0.5,
};

/** Valid role names (all UPPERCASE). Synced with permissionMatrix.js ROLES. */
const VALID_ROLES = ['DEV', 'TEC', 'MGR', 'MKT', 'HR', 'PUR', 'PD', 'ADM', 'ACC', 'SLS', 'AGT', 'STF'];

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
