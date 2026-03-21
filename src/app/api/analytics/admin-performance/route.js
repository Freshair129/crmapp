import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { getDateRange } from '@/lib/dateFilters';
import { Prisma } from '@prisma/client';

/**
 * GET /api/analytics/admin-performance?timeframe=today|this_week|this_month|last_month|all_time|year_2026
 *
 * Returns per-admin stats:
 *   messages, conversations, avg response time, monthly breakdown,
 *   revenue (from orders.closed_by_id), closing rate %, follow-up rate %,
 *   satisfaction score (0–100, heuristic), activity log (last 5 actions).
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'this_month';

        // Build date bounds
        let dateGte, dateLte;
        if (timeframe === 'year_2026') {
            dateGte = new Date('2026-01-01T00:00:00Z');
            dateLte = new Date('2026-12-31T23:59:59Z');
        } else {
            const { current } = getDateRange(timeframe);
            dateGte = current?.gte ?? null;
            dateLte = current?.lte ?? null;
        }

        const dateWhere = dateGte ? { gte: dateGte, ...(dateLte ? { lte: dateLte } : {}) } : undefined;

        // Conditional SQL fragments — fresh instances per query to avoid Prisma.sql reuse bugs
        const mkGte  = () => dateGte ? Prisma.sql`AND created_at >= ${dateGte}`   : Prisma.sql``;
        const mkLte  = () => dateLte ? Prisma.sql`AND created_at <= ${dateLte}`   : Prisma.sql``;
        const mkMGte = () => dateGte ? Prisma.sql`AND m.created_at >= ${dateGte}` : Prisma.sql``;
        const mkMLte = () => dateLte ? Prisma.sql`AND m.created_at <= ${dateLte}` : Prisma.sql``;

        // 1. Get all active employees who have responded to messages
        //    (ไม่ filter department — Fafah/Aoi เป็น AGENT แต่ตอบแชท)
        const responderIds = await prisma.$queryRaw`
            SELECT DISTINCT responder_id FROM messages
            WHERE responder_id IS NOT NULL
            ${mkGte()} ${mkLte()}
        `;
        const responderIdSet = new Set(responderIds.map(r => r.responder_id));

        const employees = await prisma.employee.findMany({
            where: {
                status: 'ACTIVE',
                id: { in: [...responderIdSet] },
            },
            select: { id: true, employeeId: true, firstName: true, lastName: true, nickName: true, role: true, department: true },
            orderBy: { employeeId: 'asc' },
        });

        // 2. Message counts + monthly breakdown per employee
        const msgStatRows = await prisma.$queryRaw`
            SELECT
                responder_id,
                COUNT(*)::int                                              AS total_messages,
                COUNT(DISTINCT conversation_id)::int                      AS conversations_with_msg,
                TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM') AS month
            FROM messages
            WHERE responder_id IS NOT NULL
              ${mkGte()} ${mkLte()}
            GROUP BY responder_id, TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM')
            ORDER BY responder_id, month
        `;

        // 3. Conversation-level assignments
        const convStatRows = await prisma.conversation.groupBy({
            by: ['assignedEmployeeId'],
            where: { assignedEmployeeId: { not: null }, ...(dateWhere ? { createdAt: dateWhere } : {}) },
            _count: { id: true },
        });

        // 4. Average first-response time per employee
        const rtRows = await prisma.$queryRaw`
            SELECT
                admin_msg.responder_id,
                ROUND(AVG(
                    EXTRACT(EPOCH FROM (admin_msg.admin_time - cust_msg.cust_time)) / 60.0
                )::numeric, 1) AS avg_response_minutes,
                COUNT(*)::int  AS response_count
            FROM (
                SELECT DISTINCT ON (conversation_id)
                    responder_id, conversation_id, created_at AS admin_time
                FROM messages
                WHERE responder_id IS NOT NULL ${mkGte()}
                ORDER BY conversation_id, created_at ASC
            ) admin_msg
            JOIN (
                SELECT DISTINCT ON (conversation_id)
                    conversation_id, created_at AS cust_time
                FROM messages
                WHERE responder_id IS NULL ${mkGte()}
                ORDER BY conversation_id, created_at ASC
            ) cust_msg ON cust_msg.conversation_id = admin_msg.conversation_id
            WHERE admin_msg.admin_time > cust_msg.cust_time
              AND EXTRACT(EPOCH FROM (admin_msg.admin_time - cust_msg.cust_time)) / 60 < 10080
            GROUP BY admin_msg.responder_id
        `;

        // 5. Team-wide hour-of-day breakdown (Bangkok time)
        const hourRows = await prisma.$queryRaw`
            SELECT
                EXTRACT(HOUR FROM m.created_at AT TIME ZONE 'Asia/Bangkok')::int AS hour_bkk,
                COUNT(*)::int AS messages
            FROM messages m
            JOIN employees e ON e.id = m.responder_id
                AND e.status = 'ACTIVE'
                AND (e.employee_id LIKE 'TVS-EMP-%' OR e.employee_id LIKE 'TVS-FL-%' OR e.employee_id LIKE 'TVS-CT-%')
            WHERE m.responder_id IS NOT NULL ${mkMGte()} ${mkMLte()}
            GROUP BY hour_bkk
            ORDER BY hour_bkk
        `;

        // 6. Revenue per employee (from orders.closed_by_id)
        const revenueRows = await prisma.$queryRaw`
            SELECT
                closed_by_id,
                COUNT(*)::int                             AS orders_count,
                COALESCE(SUM(total_amount), 0)::numeric   AS total_revenue
            FROM orders
            WHERE closed_by_id IS NOT NULL
              ${mkGte()} ${mkLte()}
            GROUP BY closed_by_id
        `;

        // 7. Follow-up indicator: conversations where admin sent the LAST message
        //    (proxy for proactive follow-up behaviour)
        const followupRows = await prisma.$queryRaw`
            SELECT
                last_msg.responder_id,
                COUNT(DISTINCT last_msg.conversation_id)::int AS followup_convs
            FROM (
                SELECT DISTINCT ON (conversation_id)
                    conversation_id, responder_id, created_at
                FROM messages
                WHERE responder_id IS NOT NULL
                  ${mkGte()}
                ORDER BY conversation_id, created_at DESC
            ) last_msg
            WHERE last_msg.responder_id IS NOT NULL
            GROUP BY last_msg.responder_id
        `;

        // 8. Activity log: last 200 admin messages with customer name — distributed in JS
        const activityRows = await prisma.$queryRaw`
            SELECT
                m.id,
                m.responder_id,
                m.created_at,
                m.content,
                m.has_attachment,
                m.attachment_type,
                m.conversation_id,
                COALESCE(cu.nick_name, cu.facebook_name, cu.first_name, 'ลูกค้า') AS customer_name,
                cu.id AS customer_id
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            JOIN customers cu ON cu.id = c.customer_id
            WHERE m.responder_id IS NOT NULL
              ${mkMGte()} ${mkMLte()}
            ORDER BY m.created_at DESC
            LIMIT 200
        `;

        // ─── Build lookup maps ─────────────────────────────────────────────────────

        const msgByEmp = {};
        for (const row of msgStatRows) {
            const eid = row.responder_id;
            if (!msgByEmp[eid]) msgByEmp[eid] = { total: 0, convs: 0, monthly: {} };
            msgByEmp[eid].total += Number(row.total_messages);
            msgByEmp[eid].convs = Math.max(msgByEmp[eid].convs, Number(row.conversations_with_msg));
            msgByEmp[eid].monthly[row.month] = (msgByEmp[eid].monthly[row.month] || 0) + Number(row.total_messages);
        }

        const convByEmp = {};
        for (const row of convStatRows) convByEmp[row.assignedEmployeeId] = row._count.id;

        const rtByEmp = {};
        for (const row of rtRows) {
            rtByEmp[row.responder_id] = { avg: Number(row.avg_response_minutes), count: Number(row.response_count) };
        }

        const revenueByEmp = {};
        for (const row of revenueRows) {
            revenueByEmp[row.closed_by_id] = {
                ordersCount: Number(row.orders_count),
                totalRevenue: Number(row.total_revenue),
            };
        }

        const followupByEmp = {};
        for (const row of followupRows) {
            followupByEmp[row.responder_id] = Number(row.followup_convs);
        }

        // Distribute activity log — top 5 per employee
        const activityByEmp = {};
        for (const row of activityRows) {
            const eid = row.responder_id;
            if (!activityByEmp[eid]) activityByEmp[eid] = [];
            if (activityByEmp[eid].length < 5) {
                activityByEmp[eid].push({
                    id: row.id,
                    conversationId: row.conversation_id,
                    customerName: row.customer_name,
                    customerId: row.customer_id,
                    content: row.content ? String(row.content).substring(0, 100) : null,
                    hasAttachment: Boolean(row.has_attachment),
                    attachmentType: row.attachment_type || null,
                    createdAt: row.created_at,
                });
            }
        }

        // ─── Satisfaction score heuristic (0–100) ─────────────────────────────────
        // Response time  : 40 pts — fast first-reply = higher score
        // Closing rate   : 35 pts — orders / conversations handled
        // Follow-up rate : 25 pts — % convs where admin sent last msg
        function computeSatisfaction(rtAvg, closingRate, followUpRate) {
            let rtScore = 0;
            if (rtAvg > 0) {
                if      (rtAvg < 5)  rtScore = 40;
                else if (rtAvg < 15) rtScore = 32;
                else if (rtAvg < 30) rtScore = 22;
                else if (rtAvg < 60) rtScore = 12;
                else                 rtScore = 5;
            }
            const crScore = Math.min(closingRate * 35, 35);
            const fuScore = Math.min(followUpRate * 25, 25);
            return Math.round(rtScore + crScore + fuScore);
        }

        // ─── Build per-admin response ──────────────────────────────────────────────
        const data = employees.map((emp) => {
            const msgStats     = msgByEmp[emp.id]     || { total: 0, convs: 0, monthly: {} };
            const rtStats      = rtByEmp[emp.id]      || { avg: 0, count: 0 };
            const revStats     = revenueByEmp[emp.id] || { ordersCount: 0, totalRevenue: 0 };
            const convsHandled = convByEmp[emp.id]    || msgStats.convs;
            const followupConvs = followupByEmp[emp.id] || 0;

            const closingRate   = convsHandled > 0 ? revStats.ordersCount / convsHandled : 0;
            const followUpRate  = convsHandled > 0 ? followupConvs       / convsHandled : 0;
            const satisfactionScore = computeSatisfaction(rtStats.avg, closingRate, followUpRate);

            return {
                id:         emp.id,
                employeeId: emp.employeeId,
                name:       emp.nickName || emp.firstName,
                fullName:   `${emp.firstName} ${emp.lastName}`.trim(),
                firstName:  emp.firstName,
                lastName:   emp.lastName,
                nickName:   emp.nickName,
                role:       emp.role,
                department: emp.department,
                stats: {
                    messages:               msgStats.total,
                    conversationsHandled:   convsHandled,
                    avgResponseTimeMinutes: rtStats.avg,
                    responseCount:          rtStats.count,
                    monthly:                msgStats.monthly,
                    // ── New fields ──────────────────────────────────────────────
                    totalRevenue:           revStats.totalRevenue,
                    ordersCount:            revStats.ordersCount,
                    closingRate:            Math.round(closingRate  * 100), // 0–100 %
                    followUpRate:           Math.round(followUpRate * 100), // 0–100 %
                    satisfactionScore,                                       // 0–100
                },
                activityLog: activityByEmp[emp.id] || [],
            };
        }).filter(e => e.stats.messages > 0 || e.stats.conversationsHandled > 0);

        data.sort((a, b) => b.stats.messages - a.stats.messages);

        // ─── Team summary ──────────────────────────────────────────────────────────
        const totalMessages      = data.reduce((s, e) => s + e.stats.messages, 0);
        const totalConversations = data.reduce((s, e) => s + e.stats.conversationsHandled, 0);
        const totalRevenue       = data.reduce((s, e) => s + e.stats.totalRevenue, 0);
        const rtEntries          = data.filter(e => e.stats.avgResponseTimeMinutes > 0);
        const avgResponseTimeMinutes = rtEntries.length > 0
            ? rtEntries.reduce((s, e) => s + e.stats.avgResponseTimeMinutes, 0) / rtEntries.length
            : 0;

        // Generate all months in the date range (not just months with data)
        // so the chart always shows a full timeline even if some months are empty
        const allMonths = (() => {
            const dataMonths = [...new Set(data.flatMap(e => Object.keys(e.stats.monthly)))].sort();
            if (!dateGte || !dateLte) return dataMonths;

            const months = [];
            const start = new Date(dateGte);
            const end = new Date(dateLte);
            const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
            while (cursor <= end) {
                const yyyy = cursor.getFullYear();
                const mm = String(cursor.getMonth() + 1).padStart(2, '0');
                months.push(`${yyyy}-${mm}`);
                cursor.setMonth(cursor.getMonth() + 1);
            }
            // Only include months up to the current month (don't show future empty months)
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            return months.filter(m => m <= currentMonth);
        })();
        const hourMap   = {};
        for (const r of hourRows) hourMap[Number(r.hour_bkk)] = Number(r.messages);
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, messages: hourMap[i] || 0 }));

        return NextResponse.json({
            success: true,
            data,
            summary: {
                totalEmployees: data.length,
                totalMessages,
                totalConversations,
                totalRevenue,
                avgResponseTimeMinutes,
                allMonths,
                hours,
            },
        });
    } catch (error) {
        logger.error('[AnalyticsAdminPerf]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
