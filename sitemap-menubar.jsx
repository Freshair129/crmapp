import { useState } from "react";

const GROUPS = [
  {
    label: "OVERVIEW",
    color: "#6366f1",
    items: [
      { id: "dashboard",           label: "Dashboard",           icon: "📊", status: "live" },
      { id: "executive-analytics", label: "BI Engine",           icon: "🧠", status: "live" },
      { id: "forecast",            label: "Revenue Forecast",    icon: "📈", status: "planned", phase: "v2.5" },
      { id: "cohort",              label: "Cohort Analysis",     icon: "🔬", status: "planned", phase: "v2.5" },
    ],
  },
  {
    label: "SALES",
    color: "#f59e0b",
    items: [
      { id: "pos-system",          label: "Premium POS",         icon: "🛒", status: "live" },
      { id: "inventory-manager",   label: "Catalog Manager",     icon: "📦", status: "live" },
      { id: "audit-trail",         label: "Audit Trail",         icon: "🕐", status: "live" },
      { id: "receipts",            label: "Receipt History",     icon: "🧾", status: "live" },
    ],
  },
  {
    label: "CRM",
    color: "#10b981",
    items: [
      { id: "customers",           label: "Customers 360°",      icon: "👥", status: "live" },
      { id: "facebook-chat",       label: "Unified Inbox",       icon: "💬", status: "live" },
      { id: "line-connect",        label: "LINE Connect",        icon: "📱", status: "live" },
      { id: "whatsapp",            label: "WhatsApp",            icon: "📲", status: "planned", phase: "v3.0" },
      { id: "ai-draft",            label: "AI Reply Draft",      icon: "🤖", status: "planned", phase: "v2.3" },
      { id: "lead-score",          label: "Lead Scoring",        icon: "🎯", status: "planned", phase: "v2.3" },
    ],
  },
  {
    label: "MARKETING",
    color: "#ec4899",
    items: [
      { id: "facebook-ads",        label: "Facebook Ads",        icon: "📣", status: "live" },
      { id: "campaign-tracking",   label: "Campaign Tracking",   icon: "🎯", status: "live" },
      { id: "analytics",           label: "Analytics",           icon: "📉", status: "live" },
      { id: "notification-rules",  label: "Notification Center", icon: "🔔", status: "live" },
      { id: "knowledge-tree",      label: "Intelligence Tree",   icon: "🌳", status: "live", version: "v1.9" },
    ],
  },
  {
    label: "OPERATIONS",
    color: "#f97316",
    items: [
      { id: "courses",             label: "คอร์สเรียน",           icon: "📚", status: "live" },
      { id: "schedules",           label: "ตารางคลาส",           icon: "📅", status: "live" },
      { id: "visual-calendar",     label: "Visual Calendar",     icon: "🗓️", status: "planned", phase: "v2.0" },
      { id: "attendance",          label: "Class Attendance",    icon: "✅", status: "planned", phase: "v2.0" },
      { id: "recipes",             label: "เมนูสูตร",             icon: "📖", status: "live" },
      { id: "packages",            label: "แพ็กเกจ",             icon: "🎁", status: "live" },
      { id: "kitchen-stock",       label: "สต็อกครัว",           icon: "👨‍🍳", status: "live" },
      { id: "inventory-control",   label: "คลังสินค้า",          icon: "🏭", status: "live" },
      { id: "procurement",         label: "จัดซื้อ",              icon: "📋", status: "live" },
      { id: "assets",              label: "อุปกรณ์",              icon: "🖥️", status: "live" },
      { id: "certificates",        label: "Certificate PDF",     icon: "🏆", status: "planned", phase: "v2.2" },
    ],
  },
  {
    label: "PORTAL",
    color: "#8b5cf6",
    items: [
      { id: "portal-enrollment",   label: "My Enrollment",       icon: "🎓", status: "planned", phase: "v2.1" },
      { id: "portal-hours",        label: "Hours Progress",      icon: "⏱️", status: "planned", phase: "v2.1" },
      { id: "portal-cert",         label: "My Certificates",     icon: "📜", status: "planned", phase: "v2.1" },
      { id: "portal-payment",      label: "Upload Slip",         icon: "💳", status: "planned", phase: "v2.1" },
      { id: "portal-catalog",      label: "Course Catalog",      icon: "🗂️", status: "planned", phase: "v2.1" },
    ],
  },
  {
    label: "HR",
    color: "#06b6d4",
    items: [
      { id: "employees",           label: "Employees",           icon: "👤", status: "live" },
      { id: "tasks",               label: "Task Board",          icon: "📌", status: "live" },
      { id: "team-kpi",            label: "Team KPI",            icon: "⚙️", status: "live" },
      { id: "admin-performance",   label: "Admin Perf.",         icon: "⏱️", status: "live" },
    ],
  },
  {
    label: "SYSTEM",
    color: "#64748b",
    items: [
      { id: "ai-config",           label: "AI Reply Config",     icon: "🤖", status: "live" },
      { id: "system-config",       label: "System Config",       icon: "⚙️", status: "live" },
      { id: "permissions",         label: "Permissions Matrix",  icon: "🔑", status: "live" },
      { id: "settings",            label: "Legacy Settings",     icon: "🔧", status: "live" },
      { id: "mcp-tools",           label: "MCP Server (23 tools)", icon: "🔌", status: "live", version: "v1.9" },
    ],
  },
];

const PHASE_COLORS = {
  "v2.0": "#f43f5e",
  "v2.1": "#8b5cf6",
  "v2.2": "#f59e0b",
  "v2.3": "#10b981",
  "v2.4": "#f97316",
  "v2.5": "#6366f1",
  "v3.0": "#ec4899",
};

export default function SitemapDiagram() {
  const [filter, setFilter] = useState("all");
  const [hoveredGroup, setHoveredGroup] = useState(null);

  const liveCount = GROUPS.flatMap(g => g.items).filter(i => i.status === "live").length;
  const plannedCount = GROUPS.flatMap(g => g.items).filter(i => i.status === "planned").length;

  const filteredGroups = GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => {
      if (filter === "all") return true;
      if (filter === "live") return i.status === "live";
      if (filter === "planned") return i.status === "planned";
      return i.phase === filter || i.version === filter;
    })
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0a0f1e", minHeight: "100vh", padding: "24px", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 8, height: 32, background: "#6366f1", borderRadius: 4 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.05em", color: "#f8fafc" }}>
              V SCHOOL CRM — MENU SITEMAP
            </div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.12em", fontFamily: "monospace" }}>
              v1.9.0 HEAD → v3.0.0 PLANNED · {liveCount} live · {plannedCount} planned · {GROUPS.length} groups
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          {["all", "live", "planned", "v2.0", "v2.1", "v2.2", "v2.3", "v2.4", "v2.5", "v3.0"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: filter === f ? (PHASE_COLORS[f] || "#6366f1") : "#1e293b",
                background: filter === f ? (PHASE_COLORS[f] || "#6366f1") + "22" : "transparent",
                color: filter === f ? (PHASE_COLORS[f] || "#6366f1") : "#64748b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}
            >
              {f === "all" ? "ALL" : f === "live" ? "✅ LIVE" : f === "planned" ? "🔲 PLANNED" : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}>
        {filteredGroups.map((group) => (
          <div
            key={group.label}
            onMouseEnter={() => setHoveredGroup(group.label)}
            onMouseLeave={() => setHoveredGroup(null)}
            style={{
              background: "#0f172a",
              border: `1px solid ${hoveredGroup === group.label ? group.color + "66" : "#1e293b"}`,
              borderRadius: 12,
              overflow: "hidden",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: hoveredGroup === group.label ? `0 0 20px ${group.color}22` : "none",
            }}
          >
            {/* Group header */}
            <div style={{
              background: group.color + "18",
              borderBottom: `1px solid ${group.color}33`,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <div style={{ width: 4, height: 14, background: group.color, borderRadius: 2 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: group.color }}>
                {group.label}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: 9, color: group.color + "99",
                fontFamily: "monospace"
              }}>
                {group.items.length} items
              </span>
            </div>

            {/* Items */}
            <div style={{ padding: "8px 0" }}>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    opacity: item.status === "planned" ? 0.7 : 1,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  <span style={{
                    fontSize: 12,
                    color: item.status === "planned" ? "#94a3b8" : "#e2e8f0",
                    flex: 1,
                    fontWeight: item.status === "live" ? 500 : 400,
                  }}>
                    {item.label}
                  </span>
                  {item.phase && (
                    <span style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: PHASE_COLORS[item.phase] + "22",
                      color: PHASE_COLORS[item.phase],
                      border: `1px solid ${PHASE_COLORS[item.phase]}44`,
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}>
                      {item.phase}
                    </span>
                  )}
                  {item.version && (
                    <span style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: "#10b98122",
                      color: "#10b981",
                      border: "1px solid #10b98144",
                      fontFamily: "monospace",
                      fontWeight: 700,
                    }}>
                      {item.version}
                    </span>
                  )}
                  {item.status === "live" && !item.version && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 24,
        padding: "12px 16px",
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 10,
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", fontWeight: 700 }}>LEGEND</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Live (v1.9.0)</span>
        </div>
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <div key={phase} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {phase} — {{
                "v2.0": "Calendar+Attendance",
                "v2.1": "Student Portal",
                "v2.2": "Cert PDF",
                "v2.3": "AI Smart Inbox",
                "v2.4": "Procurement",
                "v2.5": "BI+Export",
                "v3.0": "PWA+WhatsApp",
              }[phase]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
