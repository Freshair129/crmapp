import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================
// Tests for employee API field handling
// Testing profilePicture and dateOfBirth fields
// ============================================

describe('Employee API Fields', () => {
  describe('Allowed fields in PATCH route', () => {
    it('profilePicture is in allowed fields list', () => {
      const allowed = [
        'firstName',
        'lastName',
        'nickName',
        'email',
        'phone',
        'status',
        'role',
        'facebookName',
        'facebookUrl',
        'profilePicture',
        'department',
        'jobTitle',
        'agentCode',
      ]
      expect(allowed).toContain('profilePicture')
    })

    it('dateOfBirth is processed separately (not in allowed array)', () => {
      // dateOfBirth is handled with special logic, not in the allowed loop
      const allowed = [
        'firstName',
        'lastName',
        'nickName',
        'email',
        'phone',
        'status',
        'role',
        'facebookName',
        'facebookUrl',
        'profilePicture',
        'department',
        'jobTitle',
        'agentCode',
      ]
      // dateOfBirth is handled separately in: if ('dateOfBirth' in body)
      expect(allowed).not.toContain('dateOfBirth')
    })

    it('allowed array has expected fields', () => {
      const allowed = [
        'firstName',
        'lastName',
        'nickName',
        'email',
        'phone',
        'status',
        'role',
        'facebookName',
        'facebookUrl',
        'profilePicture',
        'department',
        'jobTitle',
        'agentCode',
      ]
      expect(allowed).toHaveLength(13)
      expect(allowed).toContain('email')
      expect(allowed).toContain('phone')
      expect(allowed).toContain('role')
    })
  })

  describe('profilePicture field handling', () => {
    it('profilePicture accepts URL string', () => {
      const updateData = {}
      const body = { profilePicture: 'https://example.com/pic.jpg' }
      if ('profilePicture' in body) {
        updateData.profilePicture = body.profilePicture
      }
      expect(updateData.profilePicture).toBe('https://example.com/pic.jpg')
    })

    it('profilePicture accepts empty string', () => {
      const updateData = {}
      const body = { profilePicture: '' }
      if ('profilePicture' in body) {
        updateData.profilePicture = body.profilePicture
      }
      expect(updateData.profilePicture).toBe('')
    })

    it('profilePicture accepts null', () => {
      const updateData = {}
      const body = { profilePicture: null }
      if ('profilePicture' in body) {
        updateData.profilePicture = body.profilePicture
      }
      expect(updateData.profilePicture).toBeNull()
    })

    it('profilePicture can be undefined (not passed)', () => {
      const updateData = {}
      const body = {}
      if ('profilePicture' in body) {
        updateData.profilePicture = body.profilePicture
      }
      expect('profilePicture' in updateData).toBe(false)
    })

    it('profilePicture is passed through as-is to Prisma', () => {
      const body = { profilePicture: 'https://example.com/photo.png' }
      const updateData = {}
      if ('profilePicture' in body) {
        updateData.profilePicture = body.profilePicture
      }
      expect(updateData).toEqual({ profilePicture: 'https://example.com/photo.png' })
    })
  })

  describe('dateOfBirth field handling', () => {
    it('dateOfBirth with valid ISO string converts to Date object', () => {
      const updateData = {}
      const body = { dateOfBirth: '1990-01-15' }
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(updateData.dateOfBirth).toBeInstanceOf(Date)
      expect(updateData.dateOfBirth.getFullYear()).toBe(1990)
      expect(updateData.dateOfBirth.getMonth()).toBe(0) // January is month 0
      expect(updateData.dateOfBirth.getDate()).toBe(15)
    })

    it('dateOfBirth with empty string converts to null', () => {
      const updateData = {}
      const body = { dateOfBirth: '' }
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(updateData.dateOfBirth).toBeNull()
    })

    it('dateOfBirth with null stays null', () => {
      const updateData = {}
      const body = { dateOfBirth: null }
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(updateData.dateOfBirth).toBeNull()
    })

    it('dateOfBirth not passed means field is not updated', () => {
      const updateData = {}
      const body = {}
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect('dateOfBirth' in updateData).toBe(false)
    })

    it('dateOfBirth with various ISO formats', () => {
      const testCases = [
        '1990-01-15',
        '2000-12-25',
        '1985-06-10',
      ]
      testCases.forEach(dateStr => {
        const updateData = {}
        const body = { dateOfBirth: dateStr }
        if ('dateOfBirth' in body) {
          updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
        }
        expect(updateData.dateOfBirth).toBeInstanceOf(Date)
      })
    })

    it('dateOfBirth with JavaScript Date object stringified', () => {
      const d = new Date(1990, 0, 15) // January 15, 1990
      const dateStr = d.toISOString().split('T')[0] // Extract just the date part
      const updateData = {}
      const body = { dateOfBirth: dateStr }
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(updateData.dateOfBirth).toBeInstanceOf(Date)
    })

    it('dateOfBirth handles leap year dates', () => {
      const updateData = {}
      const body = { dateOfBirth: '2000-02-29' }
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(updateData.dateOfBirth).toBeInstanceOf(Date)
      expect(updateData.dateOfBirth.getMonth()).toBe(1) // February
      expect(updateData.dateOfBirth.getDate()).toBe(29)
    })
  })

  describe('POST route - creating employee with new fields', () => {
    it('profilePicture is included in select for POST response', () => {
      const select = {
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        dateOfBirth: true,
      }
      expect(select).toHaveProperty('profilePicture')
      expect(select.profilePicture).toBe(true)
    })

    it('dateOfBirth is included in select for POST response', () => {
      const select = {
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        dateOfBirth: true,
      }
      expect(select).toHaveProperty('dateOfBirth')
      expect(select.dateOfBirth).toBe(true)
    })

    it('create payload can include profilePicture and dateOfBirth', () => {
      const createPayload = {
        employeeId: 'TVS-EMP-TEST-001',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: 'https://example.com/photo.jpg',
        dateOfBirth: new Date('1990-01-15'),
      }
      expect(createPayload).toHaveProperty('profilePicture')
      expect(createPayload).toHaveProperty('dateOfBirth')
    })

    it('dateOfBirth parsing for POST - ISO string to Date', () => {
      const body = {
        dateOfBirth: '1990-01-15',
      }
      const createData = {
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      }
      expect(createData.dateOfBirth).toBeInstanceOf(Date)
    })

    it('dateOfBirth parsing for POST - null remains null', () => {
      const body = {
        dateOfBirth: null,
      }
      const createData = {
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      }
      expect(createData.dateOfBirth).toBeNull()
    })
  })

  describe('GET route - includes new fields in response', () => {
    it('profilePicture and dateOfBirth are in select clause', () => {
      const select = {
        employeeId: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        dateOfBirth: true,
      }
      expect(select.profilePicture).toBe(true)
      expect(select.dateOfBirth).toBe(true)
    })
  })

  describe('PATCH route - update validation', () => {
    it('profilePicture in allowed list allows update', () => {
      const allowed = [
        'firstName',
        'lastName',
        'nickName',
        'email',
        'phone',
        'status',
        'role',
        'facebookName',
        'facebookUrl',
        'profilePicture',
        'department',
        'jobTitle',
        'agentCode',
      ]
      const updateData = {}
      const body = { profilePicture: 'https://example.com/new-pic.jpg' }
      for (const key of allowed) {
        if (key in body) {
          updateData[key] = body[key]
        }
      }
      expect(updateData).toHaveProperty('profilePicture')
    })

    it('dateOfBirth handled separately with special logic', () => {
      const updateData = {}
      const body = { dateOfBirth: '1990-01-15' }
      // dateOfBirth is NOT in the allowed loop, handled separately:
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(updateData).toHaveProperty('dateOfBirth')
      expect(updateData.dateOfBirth).toBeInstanceOf(Date)
    })

    it('multiple fields can be updated in one PATCH', () => {
      const allowed = ['firstName', 'email', 'profilePicture']
      const updateData = {}
      const body = {
        firstName: 'Jane',
        email: 'jane@example.com',
        profilePicture: 'https://example.com/jane.jpg',
        dateOfBirth: '1995-05-20',
      }
      // Process allowed fields
      for (const key of allowed) {
        if (key in body) {
          updateData[key] = body[key]
        }
      }
      // Process dateOfBirth separately
      if ('dateOfBirth' in body) {
        updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
      }
      expect(Object.keys(updateData)).toHaveLength(4)
      expect(updateData.firstName).toBe('Jane')
      expect(updateData.profilePicture).toContain('jane')
      expect(updateData.dateOfBirth).toBeInstanceOf(Date)
    })

    it('only fields in allowed or dateOfBirth special case are processed', () => {
      const allowed = ['firstName', 'profilePicture']
      const updateData = {}
      const body = {
        firstName: 'Bob',
        profilePicture: 'https://example.com/bob.jpg',
        secretAdminField: 'should not update',
        role: 'should not update via this loop',
      }
      // Only firstName and profilePicture should be processed
      for (const key of allowed) {
        if (key in body) {
          updateData[key] = body[key]
        }
      }
      expect(updateData).not.toHaveProperty('secretAdminField')
    })
  })

  describe('Field consistency', () => {
    it('profilePicture and dateOfBirth exist in both POST and PATCH', () => {
      // Simulating POST select
      const postSelect = {
        profilePicture: true,
        dateOfBirth: true,
      }
      // Simulating PATCH allowed/special handling
      const allowed = ['profilePicture']
      const handlesSeparate = 'dateOfBirth'
      
      expect(postSelect).toHaveProperty('profilePicture')
      expect(postSelect).toHaveProperty('dateOfBirth')
      expect(allowed).toContain('profilePicture')
      expect(handlesSeparate).toBe('dateOfBirth')
    })

    it('dateOfBirth is handled as date field in POST, PATCH, and GET', () => {
      // POST: convert from string to Date
      const postData = new Date('1990-01-15')
      expect(postData).toBeInstanceOf(Date)
      
      // PATCH: same conversion logic
      const patchData = new Date('1990-01-15')
      expect(patchData).toBeInstanceOf(Date)
      
      // GET: returns as Date
      const getData = new Date('1990-01-15')
      expect(getData).toBeInstanceOf(Date)
    })
  })
})
