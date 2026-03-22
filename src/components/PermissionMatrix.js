'use client'

import { useState, useEffect, useCallback } from 'react'
import { PERMISSIONS, ROLES, DOMAINS } from '@/lib/permissionMatrix'
import { CheckCircle2, XCircle, Eye, AlertTriangle, Loader2, Save } from 'lucide-react'

const DOMAIN_ICONS = {
  business: '📊',
  sales: '🛒',
  inbox: '💬',
  marketing: '📢',
  kitchen: '🍳',
  catalog: '📦',
  system: '⚙️',
}

const DOMAIN_LABELS = {
  business: 'Business',
  sales: 'Sales',
  inbox: 'Inbox',
  marketing: 'Marketing',
  kitchen: 'Kitchen',
  catalog: 'Catalog',
  system: 'System',
}

// State cycle: true → false → 'own' → 'log' → 'request' → true
const STATES = [true, false, 'own', 'log', 'request']
function cycleState(current) {
  const idx = STATES.indexOf(current)
  return STATES[(idx + 1) % STATES.length]
}

function cellStyle(val) {
  if (!val)             return { icon: XCircle,      color: 'text-red-400',    bg: 'hover:bg-red-500/10',     title: 'Denied' }
  if (val === 'own')    return { icon: Eye,           color: 'text-purple-400', bg: 'hover:bg-purple-500/10',  title: 'Own only' }
  if (val === 'log')    return { icon: AlertTriangle, color: 'text-blue-400',   bg: 'hover:bg-blue-500/10',    title: 'Audit log' }
  if (val === 'request')return { icon: AlertTriangle, color: 'text-amber-400',  bg: 'hover:bg-amber-500/10',   title: 'Requires approval' }
  return                       { icon: CheckCircle2,  color: 'text-emerald-400',bg: 'hover:bg-emerald-500/10', title: 'Allowed' }
}

export default function PermissionMatrix({ currentUserRole }) {
  const [selectedRole, setSelectedRole]   = useState('MANAGER')
  const [draft, setDraft]                 = useState(null)   // full permissions object
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [isDirty, setIsDirty]             = useState(false)

  // Deep clone helper
  const clonePerms = (p) => JSON.parse(JSON.stringify(p))

  // Load from API on mount
  useEffect(() => {
    fetch('/api/permissions')
      .then(r => r.json())
      .then(data => {
        setDraft(clonePerms(data.permissions || PERMISSIONS))
        setLoading(false)
      })
      .catch(() => {
        setDraft(clonePerms(PERMISSIONS))
        setLoading(false)
      })
  }, [])

  // Click a cell → cycle its value
  const toggleCell = useCallback((domain, action) => {
    setDraft(prev => {
      const next = clonePerms(prev)
      const cur = next[selectedRole]?.[domain]?.[action]
      if (!next[selectedRole]) next[selectedRole] = {}
      if (!next[selectedRole][domain]) next[selectedRole][domain] = {}
      next[selectedRole][domain][action] = cycleState(cur ?? false)
      return next
    })
    setIsDirty(true)
  }, [selectedRole])

  // Save to DB
  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: draft }),
      })
      setIsDirty(false)
    } catch (err) {
      console.error('[PermissionMatrix] save failed', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    )
  }

  const rolePerms = draft?.[selectedRole] || {}

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-black text-lg uppercase tracking-widest">
          Permission Matrix
        </h3>
        <div className="flex items-center gap-3">
          <p className="text-white/40 text-xs font-bold">
            Editing: <span className="text-[#cc9d37]">{selectedRole}</span>
          </p>
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-[#cc9d37]/20">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              selectedRole === role
                ? 'bg-[#cc9d37] text-[#0c1a2f] border-[#cc9d37]'
                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white/80'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">
          Legend — กดที่ไอคอนเพื่อเปลี่ยนสิทธิ์
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { icon: CheckCircle2, color: 'text-emerald-400', label: 'Allowed' },
            { icon: XCircle,      color: 'text-red-400',     label: 'Denied' },
            { icon: Eye,          color: 'text-purple-400',  label: 'Own only' },
            { icon: AlertTriangle,color: 'text-blue-400',    label: 'Audit log' },
            { icon: AlertTriangle,color: 'text-amber-400',   label: 'Approval' },
          ].map(({ icon: Icon, color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
              <span className="text-white/70 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div className="overflow-x-auto bg-white/5 border border-white/8 rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/60">
                Domain
              </th>
              {['view', 'create', 'edit', 'delete', 'approve'].map(a => (
                <th key={a} className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/60">
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((domain) => {
              const domainPerms = rolePerms[domain] || {}
              const hasAccess = domainPerms.view || domainPerms.create || domainPerms.edit || domainPerms.delete

              return (
                <tr
                  key={domain}
                  className={`border-b border-white/8 transition-colors ${!hasAccess ? 'opacity-50' : ''}`}
                >
                  <td className="px-6 py-4 font-bold text-white/80">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{DOMAIN_ICONS[domain]}</span>
                      <span>{DOMAIN_LABELS[domain]}</span>
                    </div>
                  </td>
                  {['view', 'create', 'edit', 'delete', 'approve'].map(action => {
                    const val = domainPerms[action] ?? false
                    const { icon: Icon, color, bg, title } = cellStyle(val)
                    return (
                      <td key={action} className="px-4 py-3">
                        <button
                          onClick={() => toggleCell(domain, action)}
                          title={`${title} — คลิกเพื่อเปลี่ยน`}
                          className={`w-full flex items-center justify-center p-2 rounded-xl transition-all ${bg} cursor-pointer`}
                        >
                          <Icon className={`w-5 h-5 ${color}`} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
