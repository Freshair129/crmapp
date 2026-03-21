'use client'

import { useState } from 'react'
import { PERMISSIONS, ROLES, DOMAINS, canWithMeta } from '@/lib/permissionMatrix'
import { CheckCircle2, XCircle, Eye, AlertTriangle, Lock, Info } from 'lucide-react'

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

/**
 * Helper to render permission status with icon
 */
function PermissionCell({ role, domain, action }) {
  const meta = canWithMeta(role, domain, action)

  if (!meta.allowed) {
    return (
      <div className="flex items-center justify-center" title="Denied">
        <XCircle className="w-5 h-5 text-red-400" />
      </div>
    )
  }

  if (meta.requiresApproval) {
    return (
      <div className="flex items-center justify-center" title="Requires approval">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
    )
  }

  if (meta.requiresLog) {
    return (
      <div className="flex items-center justify-center" title="Audit log required">
        <AlertTriangle className="w-5 h-5 text-blue-400" />
      </div>
    )
  }

  if (meta.ownOnly) {
    return (
      <div className="flex items-center justify-center" title="Own records only">
        <Eye className="w-5 h-5 text-purple-400" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center" title="Allowed">
      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    </div>
  )
}

/**
 * Main PermissionMatrix Component
 *
 * Read-only matrix viewer showing 8 roles × 7 domains × 5 actions
 * Includes role selector tabs and legend
 */
export default function PermissionMatrix({ currentUserRole }) {
  const [selectedRole, setSelectedRole] = useState('MANAGER')

  const rolePerms = PERMISSIONS[selectedRole] || {}

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-black text-lg uppercase tracking-widest">
          Permission Matrix
        </h3>
        <p className="text-white/40 text-xs font-bold">
          Viewing: <span className="text-[#C9A34E]">{selectedRole}</span>
        </p>
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              selectedRole === role
                ? 'bg-[#C9A34E] text-[#0A1A2F] border-[#C9A34E]'
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
          Legend
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-white/70 text-xs">Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-white/70 text-xs">Denied</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-white/70 text-xs">Own only</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-white/70 text-xs">Audit log</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-white/70 text-xs">Approval</span>
          </div>
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
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/60">
                View
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/60">
                Create
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/60">
                Edit
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/60">
                Delete
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-white/60">
                Approve
              </th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((domain, idx) => {
              const domainPerms = rolePerms[domain] || {}
              const hasAccess =
                domainPerms.view || domainPerms.create || domainPerms.edit || domainPerms.delete

              return (
                <tr
                  key={domain}
                  className={`border-b border-white/8 hover:bg-white/3 transition-colors ${
                    !hasAccess ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 font-bold text-white/80">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{DOMAIN_ICONS[domain]}</span>
                      <span>{DOMAIN_LABELS[domain]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <PermissionCell role={selectedRole} domain={domain} action="view" />
                  </td>
                  <td className="px-4 py-4">
                    <PermissionCell role={selectedRole} domain={domain} action="create" />
                  </td>
                  <td className="px-4 py-4">
                    <PermissionCell role={selectedRole} domain={domain} action="edit" />
                  </td>
                  <td className="px-4 py-4">
                    <PermissionCell role={selectedRole} domain={domain} action="delete" />
                  </td>
                  <td className="px-4 py-4">
                    <PermissionCell role={selectedRole} domain={domain} action="approve" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
        <div className="flex gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white/80 text-xs font-bold mb-1">Inherited Permissions</p>
            <p className="text-white/50 text-[10px]">
              สิทธิ์ที่แสดงเป็นค่า inherit จาก role ที่เลือก — ประเมิน ณ เวลา request
              ผ่าน <code className="bg-black/30 px-1.5 py-0.5 rounded text-[9px]">canWithMeta()</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
