import { describe, it, expect } from 'vitest'
import {
  ROLES,
  DOMAINS,
  ACTIONS,
  PERMISSIONS,
  can,
  canWithMeta,
  getAccessibleModules,
  isValidRole,
  getRolePermissions,
  hasHigherPrivilege,
} from '../permissionMatrix.js'

describe('permissionMatrix', () => {
  // ========== BASIC VALIDATION ==========

  describe('Constants', () => {
    it('has 8 roles defined', () => {
      expect(ROLES).toHaveLength(8)
      expect(ROLES).toContain('DEVELOPER')
      expect(ROLES).toContain('ADMIN')
      expect(ROLES).toContain('MANAGER')
      expect(ROLES).toContain('MARKETING')
      expect(ROLES).toContain('HEAD_CHEF')
      expect(ROLES).toContain('EMPLOYEE')
      expect(ROLES).toContain('AGENT')
      expect(ROLES).toContain('GUEST')
    })

    it('has 7 domains defined', () => {
      expect(DOMAINS).toHaveLength(7)
      expect(DOMAINS).toContain('business')
      expect(DOMAINS).toContain('sales')
      expect(DOMAINS).toContain('inbox')
      expect(DOMAINS).toContain('marketing')
      expect(DOMAINS).toContain('kitchen')
      expect(DOMAINS).toContain('catalog')
      expect(DOMAINS).toContain('system')
    })

    it('has 6 actions defined', () => {
      expect(ACTIONS).toHaveLength(6)
      expect(ACTIONS).toContain('view')
      expect(ACTIONS).toContain('create')
      expect(ACTIONS).toContain('edit')
      expect(ACTIONS).toContain('delete')
      expect(ACTIONS).toContain('approve')
      expect(ACTIONS).toContain('request')
    })
  })

  // ========== DEVELOPER ROLE ==========

  describe('DEVELOPER role', () => {
    it('can view everything', () => {
      DOMAINS.forEach(domain => {
        expect(can('DEVELOPER', domain, 'view')).toBe(true)
      })
    })

    it('can create/edit/delete in all domains', () => {
      DOMAINS.forEach(domain => {
        expect(can('DEVELOPER', domain, 'create')).toBe(true)
        expect(can('DEVELOPER', domain, 'edit')).toBe(true)
        // inbox has no delete, others have it
        if (domain !== 'inbox') {
          expect(can('DEVELOPER', domain, 'delete')).toBe(true)
        }
      })
    })

    it('can approve in most domains', () => {
      expect(can('DEVELOPER', 'business', 'approve')).toBe(true)
      expect(can('DEVELOPER', 'sales', 'approve')).toBe(true)
      expect(can('DEVELOPER', 'marketing', 'approve')).toBe(true)
      expect(can('DEVELOPER', 'kitchen', 'approve')).toBe(true)
    })
  })

  // ========== MANAGER ROLE ==========

  describe('MANAGER role', () => {
    it('can approve in business/sales/marketing/kitchen', () => {
      expect(can('MANAGER', 'business', 'approve')).toBe(true)
      expect(can('MANAGER', 'sales', 'approve')).toBe(true)
      expect(can('MANAGER', 'marketing', 'approve')).toBe(true)
      expect(can('MANAGER', 'kitchen', 'approve')).toBe(true)
    })

    it('cannot access system (create/edit/delete)', () => {
      expect(can('MANAGER', 'system', 'create')).toBe(false)
      expect(can('MANAGER', 'system', 'edit')).toBe(false)
      expect(can('MANAGER', 'system', 'delete')).toBe(false)
    })

    it('can view system but not modify', () => {
      expect(can('MANAGER', 'system', 'view')).toBe(true)
      expect(can('MANAGER', 'system', 'create')).toBe(false)
    })
  })

  // ========== ADMIN ROLE ==========

  describe('ADMIN role', () => {
    it('cannot view marketing at all', () => {
      expect(can('ADMIN', 'marketing', 'view')).toBe(false)
      expect(can('ADMIN', 'marketing', 'create')).toBe(false)
      expect(can('ADMIN', 'marketing', 'edit')).toBe(false)
      expect(can('ADMIN', 'marketing', 'delete')).toBe(false)
      expect(can('ADMIN', 'marketing', 'approve')).toBe(false)
    })

    it('can view and manage business/sales/kitchen/catalog', () => {
      expect(can('ADMIN', 'business', 'view')).toBe(true)
      expect(can('ADMIN', 'sales', 'view')).toBe(true)
      expect(can('ADMIN', 'kitchen', 'view')).toBe(true)
      expect(can('ADMIN', 'catalog', 'view')).toBe(true)
    })

    it('cannot delete from inbox', () => {
      expect(can('ADMIN', 'inbox', 'delete')).toBe(false)
    })
  })

  // ========== MARKETING ROLE ==========

  describe('MARKETING role', () => {
    it('can view marketing (domain-specific)', () => {
      expect(can('MARKETING', 'marketing', 'view')).toBe(true)
    })

    it('can create and edit marketing with logging', () => {
      expect(can('MARKETING', 'marketing', 'create')).toBe(true)
      expect(can('MARKETING', 'marketing', 'edit')).toBe(true)
    })

    it('cannot approve marketing (self-approval blocked)', () => {
      expect(can('MARKETING', 'marketing', 'approve')).toBe(false)
    })

    it('cannot delete marketing', () => {
      expect(can('MARKETING', 'marketing', 'delete')).toBe(false)
    })

    it('can only view other domains (business/sales/catalog)', () => {
      expect(can('MARKETING', 'business', 'view')).toBe(true)
      expect(can('MARKETING', 'sales', 'view')).toBe(true)
      expect(can('MARKETING', 'catalog', 'view')).toBe(true)
      expect(can('MARKETING', 'business', 'create')).toBe(false)
      expect(can('MARKETING', 'sales', 'create')).toBe(false)
    })

    it('can manage inbox (view/create/edit)', () => {
      expect(can('MARKETING', 'inbox', 'view')).toBe(true)
      expect(can('MARKETING', 'inbox', 'create')).toBe(true)
      expect(can('MARKETING', 'inbox', 'edit')).toBe(true)
    })

    it('has no kitchen or system access', () => {
      expect(can('MARKETING', 'kitchen', 'view')).toBe(false)
      expect(can('MARKETING', 'system', 'view')).toBe(false)
    })
  })

  // ========== HEAD_CHEF ROLE ==========

  describe('HEAD_CHEF role', () => {
    it('has full kitchen access (view/create/edit/delete/approve)', () => {
      expect(can('HEAD_CHEF', 'kitchen', 'view')).toBe(true)
      expect(can('HEAD_CHEF', 'kitchen', 'create')).toBe(true)
      expect(can('HEAD_CHEF', 'kitchen', 'edit')).toBe(true)
      expect(can('HEAD_CHEF', 'kitchen', 'delete')).toBe(true)
      expect(can('HEAD_CHEF', 'kitchen', 'approve')).toBe(true)
    })

    it('has no marketing access', () => {
      expect(can('HEAD_CHEF', 'marketing', 'view')).toBe(false)
    })

    it('has no inbox access', () => {
      expect(can('HEAD_CHEF', 'inbox', 'view')).toBe(false)
    })

    it('can view and modify sales (partial)', () => {
      expect(can('HEAD_CHEF', 'sales', 'view')).toBe(true)
      expect(can('HEAD_CHEF', 'sales', 'create')).toBe(true)
      expect(can('HEAD_CHEF', 'sales', 'edit')).toBe(true)
    })

    it('has no system access', () => {
      expect(can('HEAD_CHEF', 'system', 'view')).toBe(false)
    })
  })

  // ========== EMPLOYEE ROLE ==========

  describe('EMPLOYEE role', () => {
    it('can view/create/edit kitchen (no approve/delete)', () => {
      expect(can('EMPLOYEE', 'kitchen', 'view')).toBe(true)
      expect(can('EMPLOYEE', 'kitchen', 'create')).toBe(true)
      expect(can('EMPLOYEE', 'kitchen', 'edit')).toBe(true)
      expect(can('EMPLOYEE', 'kitchen', 'approve')).toBe(false)
      expect(can('EMPLOYEE', 'kitchen', 'delete')).toBe(false)
    })

    it('can create sales orders/enrollments', () => {
      expect(can('EMPLOYEE', 'sales', 'view')).toBe(true)
      expect(can('EMPLOYEE', 'sales', 'create')).toBe(true)
      expect(can('EMPLOYEE', 'sales', 'edit')).toBe(true)
    })

    it('can manage own conversations', () => {
      expect(can('EMPLOYEE', 'inbox', 'view')).toBe(true)
      expect(can('EMPLOYEE', 'inbox', 'create')).toBe(true)
      expect(can('EMPLOYEE', 'inbox', 'edit')).toBe(true)
    })

    it('has no marketing/system access', () => {
      expect(can('EMPLOYEE', 'marketing', 'view')).toBe(false)
      expect(can('EMPLOYEE', 'system', 'view')).toBe(false)
    })
  })

  // ========== AGENT ROLE ==========

  describe('AGENT role', () => {
    it('has own-only access to sales', () => {
      expect(can('AGENT', 'sales', 'view')).toBe(true)
      expect(can('AGENT', 'sales', 'create')).toBe(true)
      expect(can('AGENT', 'sales', 'edit')).toBe(true)
    })

    it('has own-only access to inbox', () => {
      expect(can('AGENT', 'inbox', 'view')).toBe(true)
      expect(can('AGENT', 'inbox', 'create')).toBe(true)
      expect(can('AGENT', 'inbox', 'edit')).toBe(true)
    })

    it('can only view business/catalog', () => {
      expect(can('AGENT', 'business', 'view')).toBe(true)
      expect(can('AGENT', 'business', 'create')).toBe(false)
      expect(can('AGENT', 'catalog', 'view')).toBe(true)
      expect(can('AGENT', 'catalog', 'create')).toBe(false)
    })

    it('has no kitchen/marketing/system access', () => {
      expect(can('AGENT', 'kitchen', 'view')).toBe(false)
      expect(can('AGENT', 'marketing', 'view')).toBe(false)
      expect(can('AGENT', 'system', 'view')).toBe(false)
    })
  })

  // ========== GUEST ROLE ==========

  describe('GUEST role', () => {
    it('can only view business/sales/catalog', () => {
      expect(can('GUEST', 'business', 'view')).toBe(true)
      expect(can('GUEST', 'sales', 'view')).toBe(true)
      expect(can('GUEST', 'catalog', 'view')).toBe(true)
    })

    it('cannot create/edit/delete anything', () => {
      expect(can('GUEST', 'business', 'create')).toBe(false)
      expect(can('GUEST', 'sales', 'create')).toBe(false)
      expect(can('GUEST', 'catalog', 'create')).toBe(false)
    })

    it('has no inbox/marketing/kitchen/system access', () => {
      expect(can('GUEST', 'inbox', 'view')).toBe(false)
      expect(can('GUEST', 'marketing', 'view')).toBe(false)
      expect(can('GUEST', 'kitchen', 'view')).toBe(false)
      expect(can('GUEST', 'system', 'view')).toBe(false)
    })
  })

  // ========== CAN() FUNCTION BEHAVIOR ==========

  describe('can() function', () => {
    it('returns false for invalid role', () => {
      expect(can('INVALID_ROLE', 'business', 'view')).toBe(false)
    })

    it('returns false for invalid domain', () => {
      expect(can('DEVELOPER', 'invalid_domain', 'view')).toBe(false)
    })

    it('returns false for invalid action', () => {
      expect(can('DEVELOPER', 'business', 'invalid_action')).toBe(false)
    })

    it('returns false for missing domains in role', () => {
      // GUEST doesn't have inbox permissions
      expect(can('GUEST', 'inbox', 'view')).toBe(false)
    })

    it('correctly interprets special values (own, log) as allowed', () => {
      // MARKETING has 'log' for edit
      expect(can('MARKETING', 'marketing', 'edit')).toBe(true)
      // AGENT has 'own' for sales/view
      expect(can('AGENT', 'sales', 'view')).toBe(true)
      expect(can('AGENT', 'inbox', 'view')).toBe(true)
    })
  })

  // ========== CANWITHMETA() FUNCTION ==========

  describe('canWithMeta() function', () => {
    it('returns meta for granted permission', () => {
      const result = canWithMeta('DEVELOPER', 'business', 'view')
      expect(result.allowed).toBe(true)
      expect(result.requiresLog).toBe(false)
      expect(result.ownOnly).toBe(false)
      expect(result.requiresApproval).toBe(false)
    })

    it('detects log requirement for MARKETING edit', () => {
      const result = canWithMeta('MARKETING', 'marketing', 'edit')
      expect(result.allowed).toBe(true)
      expect(result.requiresLog).toBe(true)
    })

    it('detects own-only restriction for AGENT', () => {
      const result = canWithMeta('AGENT', 'sales', 'view')
      expect(result.allowed).toBe(true)
      expect(result.ownOnly).toBe(true)
    })

    it('detects request requirement for MARKETING lifetime budget', () => {
      // Note: This assumes future expansion with 'request' action
      const result = canWithMeta('MARKETING', 'marketing', 'request')
      expect(result.requiresApproval).toBe(true)
    })

    it('returns denied for invalid role', () => {
      const result = canWithMeta('INVALID', 'business', 'view')
      expect(result.allowed).toBe(false)
      expect(result.requiresLog).toBe(false)
      expect(result.ownOnly).toBe(false)
      expect(result.requiresApproval).toBe(false)
    })
  })

  // ========== GETACCESSIBLEMODULES() FUNCTION ==========

  describe('getAccessibleModules() function', () => {
    it('returns correct modules for DEVELOPER', () => {
      const modules = getAccessibleModules('DEVELOPER')
      expect(modules).toEqual(DOMAINS) // All domains
    })

    it('returns restricted modules for MARKETING', () => {
      const modules = getAccessibleModules('MARKETING')
      expect(modules).toContain('business')
      expect(modules).toContain('sales')
      expect(modules).toContain('inbox')
      expect(modules).toContain('marketing')
      expect(modules).toContain('catalog')
      expect(modules).not.toContain('kitchen')
      expect(modules).not.toContain('system')
    })

    it('returns restricted modules for AGENT', () => {
      const modules = getAccessibleModules('AGENT')
      expect(modules).toContain('business')
      expect(modules).toContain('sales')
      expect(modules).toContain('inbox')
      expect(modules).toContain('catalog')
      expect(modules).not.toContain('marketing')
      expect(modules).not.toContain('kitchen')
      expect(modules).not.toContain('system')
    })

    it('returns only readable domains', () => {
      const modules = getAccessibleModules('GUEST')
      expect(modules.length).toBeLessThan(DOMAINS.length)
      modules.forEach(domain => {
        expect(can('GUEST', domain, 'view')).toBe(true)
      })
    })

    it('returns empty array for invalid role', () => {
      const modules = getAccessibleModules('INVALID')
      expect(modules).toEqual([])
    })
  })

  // ========== ISVALIDROLE() FUNCTION ==========

  describe('isValidRole() function', () => {
    it('validates all defined roles', () => {
      ROLES.forEach(role => {
        expect(isValidRole(role)).toBe(true)
      })
    })

    it('rejects invalid roles', () => {
      expect(isValidRole('INVALID')).toBe(false)
      expect(isValidRole('developer')).toBe(false) // lowercase
      expect(isValidRole('')).toBe(false)
      expect(isValidRole(null)).toBe(false)
    })
  })

  // ========== GETROLEPERMISSIONS() FUNCTION ==========

  describe('getRolePermissions() function', () => {
    it('returns full permission object for valid role', () => {
      const perms = getRolePermissions('DEVELOPER')
      expect(perms).toEqual(PERMISSIONS['DEVELOPER'])
      expect(Object.keys(perms).length).toBeGreaterThan(0)
    })

    it('returns empty object for invalid role', () => {
      const perms = getRolePermissions('INVALID')
      expect(perms).toEqual({})
    })
  })

  // ========== HASHIGHERPRIVILEGE() FUNCTION ==========

  describe('hasHigherPrivilege() function', () => {
    it('DEVELOPER > all roles', () => {
      ROLES.forEach(role => {
        expect(hasHigherPrivilege('DEVELOPER', role)).toBe(true)
      })
    })

    it('ADMIN > MANAGER/MARKETING/HEAD_CHEF/EMPLOYEE/AGENT/GUEST', () => {
      expect(hasHigherPrivilege('ADMIN', 'MANAGER')).toBe(true)
      expect(hasHigherPrivilege('ADMIN', 'EMPLOYEE')).toBe(true)
      expect(hasHigherPrivilege('ADMIN', 'GUEST')).toBe(true)
    })

    it('MANAGER > MARKETING/HEAD_CHEF/EMPLOYEE/AGENT/GUEST', () => {
      expect(hasHigherPrivilege('MANAGER', 'MARKETING')).toBe(true)
      expect(hasHigherPrivilege('MANAGER', 'EMPLOYEE')).toBe(true)
      expect(hasHigherPrivilege('MANAGER', 'GUEST')).toBe(true)
    })

    it('MARKETING and HEAD_CHEF are equal (domain specialists)', () => {
      expect(hasHigherPrivilege('MARKETING', 'HEAD_CHEF')).toBe(true)
      expect(hasHigherPrivilege('HEAD_CHEF', 'MARKETING')).toBe(true)
    })

    it('EMPLOYEE > AGENT/GUEST', () => {
      expect(hasHigherPrivilege('EMPLOYEE', 'AGENT')).toBe(true)
      expect(hasHigherPrivilege('EMPLOYEE', 'GUEST')).toBe(true)
    })

    it('AGENT > GUEST', () => {
      expect(hasHigherPrivilege('AGENT', 'GUEST')).toBe(true)
    })

    it('returns false for invalid roles', () => {
      expect(hasHigherPrivilege('INVALID', 'GUEST')).toBe(false)
      expect(hasHigherPrivilege('DEVELOPER', 'INVALID')).toBe(false)
    })
  })

  // ========== INTEGRATION TESTS ==========

  describe('Integration scenarios', () => {
    it('DEVELOPER can manage all domains completely', () => {
      DOMAINS.forEach(domain => {
        expect(can('DEVELOPER', domain, 'view')).toBe(true)
        expect(can('DEVELOPER', domain, 'create')).toBe(true)
      })
    })

    it('ADMIN cannot manage marketing but can see everything else', () => {
      expect(can('ADMIN', 'marketing', 'view')).toBe(false)
      DOMAINS.filter(d => d !== 'marketing').forEach(domain => {
        expect(can('ADMIN', domain, 'view')).toBe(true)
      })
    })

    it('HEAD_CHEF is domain specialist with full kitchen control', () => {
      expect(can('HEAD_CHEF', 'kitchen', 'approve')).toBe(true)
      expect(can('HEAD_CHEF', 'marketing', 'view')).toBe(false)
      expect(can('HEAD_CHEF', 'marketing', 'approve')).toBe(false)
    })

    it('EMPLOYEE cannot approve kitchen PRs', () => {
      expect(can('EMPLOYEE', 'kitchen', 'view')).toBe(true)
      expect(can('EMPLOYEE', 'kitchen', 'create')).toBe(true)
      expect(can('EMPLOYEE', 'kitchen', 'approve')).toBe(false)
    })

    it('AGENT is restricted to own records in sales/inbox', () => {
      expect(can('AGENT', 'sales', 'view')).toBe(true)
      expect(can('AGENT', 'inbox', 'view')).toBe(true)
      expect(can('AGENT', 'kitchen', 'view')).toBe(false)
      expect(can('AGENT', 'marketing', 'view')).toBe(false)
    })

    it('GUEST has read-only access to public domains', () => {
      expect(can('GUEST', 'business', 'view')).toBe(true)
      expect(can('GUEST', 'sales', 'view')).toBe(true)
      expect(can('GUEST', 'catalog', 'view')).toBe(true)
      expect(can('GUEST', 'business', 'create')).toBe(false)
      expect(can('GUEST', 'business', 'edit')).toBe(false)
      expect(can('GUEST', 'business', 'delete')).toBe(false)
    })
  })
})
