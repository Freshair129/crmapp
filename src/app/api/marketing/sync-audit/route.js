import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { updateCampaignAuditSnapshot } from '@/lib/repositories/marketingRepo';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function graphGet(path, params = {}) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString());
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Graph API ${res.status}`);
    }
    return res.json();
}

/**
 * GET /api/marketing/sync-audit?months=1
 * Audit Task:
 * 1. Pull current Meta Campaign-level snapshots (The "Truth").
 * 2. Store in fb_* fields in Campaign model.
 * 3. Log mismatches vs. local aggregates in AuditLog.
 */
export async function GET(request) {
    try {
        if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
            return NextResponse.json({ success: false, error: 'FB credentials not configured' }, { status: 503 });
        }

        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '1', 10);
        const since = new Date(Date.now() - months * 30 * 86400000).toISOString().split('T')[0];
        const until = new Date().toISOString().split('T')[0];

        const prisma = await getPrisma();

        // 1. Fetch Campaign Insights directly from Meta
        const campaignInsights = await graphGet(`/${AD_ACCOUNT_ID}/insights`, {
            level: 'campaign',
            fields: 'campaign_id,campaign_name,spend,impressions,clicks,actions,action_values',
            time_range: JSON.stringify({ since, until }),
            limit: '1000'
        });

        const auditResults = [];
        let mismatches = 0;

        for (const meta of (campaignInsights.data || [])) {
            const campaignId = meta.campaign_id;
            
            // Meta values
            const mSpend = parseFloat(meta.spend || 0);
            const mClicks = parseInt(meta.clicks || 0, 10);
            const purchaseValue = (meta.action_values || []).find(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type));
            const mRevenue = purchaseValue ? parseFloat(purchaseValue.value || 0) : 0;
            const leadAction = (meta.actions || []).find(a => a.action_type === 'lead');
            const mLeads = leadAction ? parseInt(leadAction.value || 0) : 0;

            // Update Snapshot in DB
            await updateCampaignAuditSnapshot(campaignId, {
                spend: mSpend,
                clicks: mClicks,
                leads: mLeads,
                revenue: mRevenue
            });

            // Calculate Local Bottom-Up Aggregate for this campaign/range
            const localAggr = await prisma.adDailyMetric.aggregate({
                where: {
                    date: { gte: new Date(since), lte: new Date(until) },
                    ad: { adSet: { campaignId: campaignId } }
                },
                _sum: {
                    spend: true,
                    clicks: true,
                    leads: true,
                    revenue: true
                }
            });

            const lSpend = localAggr._sum.spend || 0;
            const diff = Math.abs(mSpend - lSpend);
            const deltaPct = mSpend > 0 ? (diff / mSpend) * 100 : 0;

            const isMismatch = deltaPct > 1; // > 1% mismatch
            if (isMismatch) {
                mismatches++;
                await prisma.auditLog.create({
                    data: {
                        action: 'MARKETING_AUDIT_MISMATCH',
                        actor: 'SYSTEM',
                        target: `Campaign:${campaignId}`,
                        status: 'WARNING',
                        details: {
                            campaignName: meta.campaign_name,
                            since,
                            until,
                            metaSpend: mSpend,
                            localSpend: lSpend,
                            delta: diff,
                            deltaPct
                        }
                    }
                });
            }

            auditResults.push({
                id: campaignId,
                name: meta.campaign_name,
                metaSpend: mSpend,
                localSpend: lSpend,
                isMismatch
            });
        }

        return NextResponse.json({
            success: true,
            range: `${since} to ${until}`,
            totalAudited: auditResults.length,
            mismatches,
            data: auditResults,
            syncedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error('[MarketingAudit]', 'Audit failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
