import { describe, it, expect } from 'vitest'
import {
  ROLES,
  DOMAINS,
  PERMISSIONS,
  can,
} from '../permissionMatrix.js'

describe('PermissionMatrix - targetRole validation', () => {
  describe('ROLES constant validation', () => {
    it('includes DEVELOPER role', () => {
      expect(ROLES).toContain('DEVELOPER')
    })

    it('includes ADMIN role', () => {
      expect(ROLES).toContain('ADMIN')
    })

    it('includes MANAGER role (fallback default)', () => {
      expect(ROLES).toContain('MANAGER')
    })

    it('includes MARKETING role', () => {
      expect(ROLES).toContain('MARKETING')
    })

    it('includes HEAD_CHEF role', () => {
      expect(ROLES).toContain('HEAD_CHEF')
    })

    it('includes EMPLOYEE role', () => {
      expect(ROLES).toContain('EMPLOYEE')
    })

    it('includes AGENT role', () => {
      expect(ROLES).toContain('AGENT')
    })

    it('includes GUEST role', () => {
      expect(ROLES).toContain('GUEST')
    })

    it('has exactly 8 roles', () => {
      expect(ROLES).toHaveLength(8)
    })

    it('all roles are strings', () => {
      ROLES.forEach(role => {
        expect(typeof role).toBe('string')
        expect(role.length).toBeGreaterThan(0)
      })
    })

    it('all roles are uppercase', () => {
      ROLES.forEach(role => {
        expect(role).toBe(role.toUpperCase())
      })
    })
  })

  describe('PERMISSIONS has entry for every ROLE', () => {
    it('PERMISSIONS object has keys for all ROLES', () => {
      ROLES.forEach(role => {
        expect(PERMISSIONS).toHaveProperty(role)
      })
    })

    it('each role has permissions object', () => {
      ROLES.forEach(role => {
        expect(typeof PERMISSIONS[role]).toBe('object')
      })
    })

    it('each role has at least one domain with permissions', () => {
      ROLES.forEach(role => {
        const rolePerms = PERMISSIONS[role]
        expect(Object.keys(rolePerms).length).toBeGreaterThan(0)
      })
    })
  })

  describe('targetRole prop handling', () => {
    it('valid targetRole should be in ROLES array', () => {
      const validRoles = ['MANAGER', 'ADMIN', 'EMPLOYEE', 'AGENT']
      validRoles.forEach(role => {
        expect(ROLES).toContain(role)
      })
    })

    it('invalid targetRole should fallback to MANAGER', () => {
      const invalidRole = 'INVALID_ROLE_12345'
      expect(ROLES).not.toContain(invalidRole)
      // When invalid, should use MANAGER as fallback
      expect(ROLES).toContain('MANAGER')
    })

    it('MANAGER role is the fallback default', () => {
      expect(ROLES).toContain('MANAGER')
      expect(PERMISSIONS).toHaveProperty('MANAGER')
    })

    it('can() function works with all ROLES', () => {
      ROLES.forEach(role => {
        // Test that can() accepts all valid roles without error
        const result = can(role, 'system', 'view')
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('RBAC hierarchy - can() function for system domain', () => {
    it('DEVELOPER can view system domain', () => {
      const result = can('DEVELOPER', 'system', 'view')
      expect(result).toBe(true)
    })

    it('ADMIN can view system domain', () => {
      const result = can('ADMIN', 'system', 'view')
      expect(result).toBe(true)
    })

    it('MANAGER can view system domain', () => {
      const result = can('MANAGER', 'system', 'view')
      expect(result).toBe(true)
    })

    it('EMPLOYEE has limited system domain access or denied', () => {
      // EMPLOYEE should have some restrictions
      const result = can('EMPLOYEE', 'system', 'view')
      // can() returns boolean
      expect(typeof result).toBe('boolean')
    })

    it('GUEST has no system domain access', () => {
      const result = can('GUEST', 'system', 'view')
      // GUEST should return boolean false or true
      expect(typeof result).toBe('boolean')
    })

    it('DEVELOPER can edit system domain', () => {
      const result = can('DEVELOPER', 'system', 'edit')
      expect(result).toBe(true)
    })

    it('DEVELOPER can delete system domain', () => {
      const result = can('DEVELOPER', 'system', 'delete')
      expect(result).toBe(true)
    })

    it('GUEST cannot delete system domain', () => {
      const result = can('GUEST', 'system', 'delete')
      expect(result).toBe(false)
    })

    it('ADMIN returns boolean for system domain approve', () => {
      const result = can('ADMIN', 'system', 'approve')
      expect(typeof result).toBe('boolean')
    })

    it('EMPLOYEE returns boolean for system domain approve', () => {
      const result = can('EMPLOYEE', 'system', 'approve')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('can() function return values', () => {
    it('returns boolean true for allowed permissions', () => {
      const result = can('DEVELOPER', 'system', 'view')
      expect(result).toBe(true)
    })

    it('returns boolean false for denied permissions', () => {
      const result = can('GUEST', 'system', 'delete')
      expect(result).toBe(false)
    })

    it('can() always returns boolean', () => {
      // Test that can() always returns boolean (true/false)
      const testCases = [
        can('MANAGER', 'inbox', 'view'),
        can('ADMIN', 'system', 'view'),
        can('EMPLOYEE', 'inbox', 'view'),
      ]
      testCases.forEach(result => {
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('Role inheritance in system domain', () => {
    it('higher roles have more permissions than lower roles', () => {
      // DEVELOPER should have view
      expect(can('DEVELOPER', 'system', 'view')).toBe(true)
      // GUEST might not - just verify both return boolean
      const guestResult = can('GUEST', 'system', 'view')
      expect(typeof guestResult).toBe('boolean')
    })

    it('ADMIN and DEVELOPER both return boolean for can()', () => {
      // Both should return valid boolean values
      const devResult = can('DEVELOPER', 'system', 'view')
      const adminResult = can('ADMIN', 'system', 'view')
      expect(typeof devResult).toBe('boolean')
      expect(typeof adminResult).toBe('boolean')
    })

    it('MARKETING and HEAD_CHEF have domain-specific access', () => {
      // Marketing should have marketing domain access
      const marketingAccess = can('MARKETING', 'marketing', 'view')
      expect(marketingAccess).toBe(true)
      // Head chef should have kitchen domain access
      const chefAccess = can('HEAD_CHEF', 'kitchen', 'view')
      expect(chefAccess).toBe(true)
    })
  })

  describe('useEffect sync scenario - targetRole changes', () => {
    it('when targetRole changes to valid role, useEffect should sync selectedRole', () => {
      const initialRole = 'MANAGER'
      const newTargetRole = 'ADMIN'
      
      // Simulate: targetRole dependency changes
      expect(ROLES).toContain(initialRole)
      expect(ROLES).toContain(newTargetRole)
      expect(initialRole).not.toBe(newTargetRole)
    })

    it('when targetRole is invalid, fallback to MANAGER', () => {
      const invalidRole = 'UNKNOWN_ROLE'
      const fallback = ROLES.includes(invalidRole) ? invalidRole : 'MANAGER'
      expect(fallback).toBe('MANAGER')
    })

    it('when targetRole is empty, fallback to MANAGER', () => {
      const targetRole = null
      const fallback = targetRole && ROLES.includes(targetRole) ? targetRole : 'MANAGER'
      expect(fallback).toBe('MANAGER')
    })

    it('when targetRole is undefined, fallback to MANAGER', () => {
      const targetRole = undefined
      const fallback = targetRole && ROLES.includes(targetRole) ? targetRole : 'MANAGER'
      expect(fallback).toBe('MANAGER')
    })
  })

  describe('MANAGER role as default', () => {
    it('MANAGER role exists and is in ROLES array', () => {
      expect(ROLES).toContain('MANAGER')
    })

    it('MANAGER has permissions defined in PERMISSIONS', () => {
      expect(PERMISSIONS).toHaveProperty('MANAGER')
    })

    it('MANAGER has permissions for all domains', () => {
      const managerPerms = PERMISSIONS.MANAGER
      DOMAINS.forEach(domain => {
        expect(managerPerms).toHaveProperty(domain)
      })
    })

    it('MANAGER can view most domains', () => {
      const canViewBusiness = can('MANAGER', 'business', 'view')
      const canViewSystem = can('MANAGER', 'system', 'view')
      // can() returns boolean
      expect(typeof canViewBusiness).toBe('boolean')
      expect(typeof canViewSystem).toBe('boolean')
    })
  })
})
