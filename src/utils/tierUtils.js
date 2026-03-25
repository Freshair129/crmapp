/**
 * Client-safe tier utility — mirrors system_config.yaml tiers
 * Source of truth: system_config.yaml (tiers section)
 * DO NOT edit thresholds here manually — update system_config.yaml instead,
 * then sync this file to match.
 */

export const TIER_CONFIG = [
    { code: 'TIER1', label: 'V Member',   badge: '🥈', color: '#9CA3AF', minSpend: 0,      minHours: 0   },
    { code: 'TIER2', label: 'V Silver',   badge: '🥈', color: '#C0C0C0', minSpend: 20000,  minHours: 0   },
    { code: 'TIER3', label: 'V Gold',     badge: '🥇', color: '#cc9d37', minSpend: 50000,  minHours: 30  },
    { code: 'TIER4', label: 'V Platinum', badge: '💎', color: '#E5E4E2', minSpend: 100000, minHours: 111 },
    { code: 'TIER5', label: 'V Black',    badge: '⬛', color: '#9b8cff', minSpend: 200000, minHours: 201 },
];

export function calculateTier(totalSpend = 0, totalHours = 0) {
    let current = TIER_CONFIG[0];
    for (const t of TIER_CONFIG) {
        if (totalSpend >= t.minSpend && totalHours >= t.minHours) {
            current = t;
        }
    }

    const currentIdx = TIER_CONFIG.indexOf(current);
    const next = TIER_CONFIG[currentIdx + 1] || null;

    return {
        ...current,
        nextTier: next,
        progressSpend: next ? Math.min(100, Math.round((totalSpend / next.minSpend) * 100)) : 100,
        progressHours: next && next.minHours > 0
            ? Math.min(100, Math.round((totalHours / next.minHours) * 100))
            : 100,
    };
}
