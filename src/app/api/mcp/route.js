/**
 * MCP Streamable HTTP Transport — Vercel-compatible endpoint
 *
 * POST /api/mcp — handles MCP JSON-RPC requests
 *
 * This allows Claude Desktop (or any MCP client) to connect to the
 * V School CRM MCP server over HTTP instead of stdio.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import * as procurementRepo from '@/lib/repositories/procurementRepo';
import * as inventoryRepo from '@/lib/repositories/inventoryRepo';
import * as customerRepo from '@/lib/repositories/customerRepo';
import * as scheduleRepo from '@/lib/repositories/scheduleRepo';
import * as kitchenRepo from '@/lib/repositories/kitchenRepo';
import { logger } from '@/lib/logger';

const MODULE = 'MCP-HTTP';

// ─── Tool definitions (same as stdio server) ─────────────────────────────────

const TOOLS = [
    { name: 'customer.search', description: 'ค้นหาลูกค้าตามชื่อ, เบอร์โทร, หรือ customerId', inputSchema: { type: 'object', properties: { search: { type: 'string' }, limit: { type: 'number' } }, required: ['search'] } },
    { name: 'schedule.list_upcoming', description: 'ตารางคลาสที่จะมาถึง', inputSchema: { type: 'object', properties: { days: { type: 'number' } } } },
    { name: 'schedule.get_by_class', description: 'ตารางเรียนของ classId', inputSchema: { type: 'object', properties: { classId: { type: 'string' } }, required: ['classId'] } },
    { name: 'kitchen.check_stock', description: 'เช็คสต็อกวัตถุดิบครัว', inputSchema: { type: 'object', properties: { lowStockOnly: { type: 'boolean' }, category: { type: 'string' } } } },
    { name: 'kitchen.get_expiring_lots', description: 'Lot ใกล้หมดอายุ', inputSchema: { type: 'object', properties: { days: { type: 'number' } } } },
    { name: 'inventory.stock_levels', description: 'สต็อกสินค้าในคลัง', inputSchema: { type: 'object', properties: { warehouseId: { type: 'string' }, lowStockOnly: { type: 'boolean' } } } },
    { name: 'inventory.low_stock_alerts', description: 'แจ้งเตือนสต็อกต่ำ', inputSchema: { type: 'object', properties: {} } },
    { name: 'inventory.list_warehouses', description: 'รายการคลังสินค้า', inputSchema: { type: 'object', properties: {} } },
    { name: 'procurement.calculate_bom', description: 'คำนวณ BOM สำหรับคลาส', inputSchema: { type: 'object', properties: { classId: { type: 'string' } }, required: ['classId'] } },
    { name: 'procurement.create_po_from_bom', description: 'สร้าง PO จาก BOM ⚠️ write', inputSchema: { type: 'object', properties: { classId: { type: 'string' }, createdById: { type: 'string' } }, required: ['classId', 'createdById'] } },
    { name: 'procurement.get_po', description: 'รายละเอียด PO', inputSchema: { type: 'object', properties: { poId: { type: 'string' } }, required: ['poId'] } },
    { name: 'procurement.list_pos', description: 'รายการ PO', inputSchema: { type: 'object', properties: { status: { type: 'string' }, classId: { type: 'string' }, limit: { type: 'number' } } } },
    { name: 'procurement.list_suppliers', description: 'รายการซัพพลายเออร์', inputSchema: { type: 'object', properties: { search: { type: 'string' } } } },
    { name: 'procurement.pending_advances', description: 'เงินทดรองจ่ายรอเบิกคืน', inputSchema: { type: 'object', properties: {} } },
    { name: 'procurement.approve_po', description: 'อนุมัติ/ตีกลับ PO ⚠️ write', inputSchema: { type: 'object', properties: { poId: { type: 'string' }, approverId: { type: 'string' }, action: { type: 'string', enum: ['APPROVED', 'REJECTED'] }, reason: { type: 'string' } }, required: ['poId', 'approverId', 'action'] } },
];

// ─── Tool execution (shared logic) ───────────────────────────────────────────

function text(data) {
    return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}

async function executeTool(name, args) {
    switch (name) {
        case 'customer.search': {
            const customers = await customerRepo.getAllCustomers({ search: args.search, limit: args.limit || 10 });
            return text({ count: customers.length, customers: customers.map(c => ({ id: c.id, customerId: c.customerId, name: `${c.firstName || ''} ${c.lastName || ''}`.trim(), phone: c.phonePrimary, tier: c.membershipTier })) });
        }
        case 'schedule.list_upcoming': return text(await scheduleRepo.getUpcomingSchedules(args.days || 7));
        case 'schedule.get_by_class': return text(await scheduleRepo.getSchedulesByClass(args.classId));
        case 'kitchen.check_stock': {
            const items = await kitchenRepo.getAllIngredients({ lowStockOnly: args.lowStockOnly, category: args.category });
            return text({ count: items.length, ingredients: items.map(i => ({ name: i.name, stock: i.currentStock, min: i.minStock, unit: i.unit, status: i.currentStock <= i.minStock ? 'LOW' : 'OK' })) });
        }
        case 'kitchen.get_expiring_lots': return text(await kitchenRepo.getExpiringLots(args.days || 7));
        case 'inventory.stock_levels': return text(await inventoryRepo.getStockLevels({ warehouseId: args.warehouseId, lowStockOnly: args.lowStockOnly }));
        case 'inventory.low_stock_alerts': { const a = await inventoryRepo.getLowStockAlerts(); return text({ count: a.length, alerts: a }); }
        case 'inventory.list_warehouses': return text(await inventoryRepo.getAllWarehouses());
        case 'procurement.calculate_bom': return text(await procurementRepo.calculateClassBOM(args.classId));
        case 'procurement.create_po_from_bom': {
            const r = await procurementRepo.createPOFromBOM(args.classId, args.createdById);
            return r.alreadySufficient ? text('วัตถุดิบเพียงพอ ไม่ต้องสร้าง PO') : text({ message: 'สร้าง PO สำเร็จ', poId: r.poId, items: r.items?.length });
        }
        case 'procurement.get_po': { const po = await procurementRepo.getPurchaseOrderById(args.poId); return po ? text(po) : { isError: true, content: [{ type: 'text', text: 'ไม่พบ PO' }] }; }
        case 'procurement.list_pos': return text(await procurementRepo.getAllPurchaseOrders({ status: args.status, classId: args.classId, limit: args.limit || 20 }));
        case 'procurement.list_suppliers': return text(await procurementRepo.getAllSuppliers({ search: args.search }));
        case 'procurement.pending_advances': { const adv = await procurementRepo.getPendingAdvances(); return text({ count: adv.length, advances: adv }); }
        case 'procurement.approve_po': {
            if (args.action === 'REJECTED' && !args.reason) return { isError: true, content: [{ type: 'text', text: 'ต้องระบุเหตุผล' }] };
            const r = await procurementRepo.approvePO(args.poId, args.approverId, args.action, args.reason);
            return text({ message: args.action === 'APPROVED' ? 'อนุมัติสำเร็จ' : 'ตีกลับสำเร็จ', approvalId: r.approvalId });
        }
        default: return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
}

// ─── Stateless HTTP handler (Vercel-compatible) ──────────────────────────────

export async function POST(req) {
    try {
        const body = await req.json();
        const { method, id, params } = body;

        // JSON-RPC dispatch
        if (method === 'tools/list') {
            return Response.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
        }

        if (method === 'tools/call') {
            const { name, arguments: args } = params;
            try {
                const result = await executeTool(name, args || {});
                return Response.json({ jsonrpc: '2.0', id, result });
            } catch (error) {
                logger.error(MODULE, `Tool failed: ${name}`, error);
                return Response.json({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: error.message }] } });
            }
        }

        if (method === 'initialize') {
            return Response.json({
                jsonrpc: '2.0', id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'vschool-crm-server', version: '1.6.0' },
                },
            });
        }

        // Unsupported method
        return Response.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }, { status: 404 });
    } catch (error) {
        logger.error(MODULE, 'MCP HTTP error', error);
        return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: error.message } }, { status: 500 });
    }
}

// GET for health check
export async function GET() {
    return Response.json({
        status: 'ok',
        server: 'vschool-crm-mcp',
        version: '1.6.0',
        tools: TOOLS.length,
        transport: 'streamable-http',
    });
}
