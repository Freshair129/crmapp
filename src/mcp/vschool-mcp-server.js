/**
 * V School CRM — MCP Server (Model Context Protocol)
 * AI-Native Operations for Cooking School CRM
 *
 * Transport: stdio (local) or Streamable HTTP (Vercel)
 * Tools: 15 tools across 5 domains
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import * as procurementRepo from '../lib/repositories/procurementRepo.js';
import * as inventoryRepo from '../lib/repositories/inventoryRepo.js';
import * as customerRepo from '../lib/repositories/customerRepo.js';
import * as scheduleRepo from '../lib/repositories/scheduleRepo.js';
import * as kitchenRepo from '../lib/repositories/kitchenRepo.js';
import { logger } from '../lib/logger.js';

const MODULE = 'V-School-MCP';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Initialize MCP Server
// ═══════════════════════════════════════════════════════════════════════════════

const server = new Server(
    {
        name: 'vschool-crm-server',
        version: '1.6.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Define Tools (AI-facing) — 15 tools across 5 domains
// ═══════════════════════════════════════════════════════════════════════════════

const TOOLS = [
    // ─── Customer Domain ─────────────────────────────────────────────────
    {
        name: 'customer.search',
        description: 'ค้นหาลูกค้าตามชื่อ, เบอร์โทร, หรือ customerId',
        inputSchema: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'ชื่อ, เบอร์โทร, หรือ ID' },
                limit: { type: 'number', description: 'จำนวนผลลัพธ์ (default 10)' },
            },
            required: ['search'],
        },
    },

    // ─── Schedule Domain ─────────────────────────────────────────────────
    {
        name: 'schedule.list_upcoming',
        description: 'แสดงตารางคลาสที่จะมาถึง (upcoming schedules)',
        inputSchema: {
            type: 'object',
            properties: {
                days: { type: 'number', description: 'จำนวนวันข้างหน้า (default 7)' },
            },
        },
    },
    {
        name: 'schedule.get_by_class',
        description: 'ดูตารางเรียนทั้งหมดของ classId หนึ่ง',
        inputSchema: {
            type: 'object',
            properties: {
                classId: { type: 'string', description: 'เช่น CLS-202603-001' },
            },
            required: ['classId'],
        },
    },

    // ─── Kitchen / Stock Domain ──────────────────────────────────────────
    {
        name: 'kitchen.check_stock',
        description: 'เช็คสต็อกวัตถุดิบครัว ดูว่าอะไรต่ำ อะไรหมด',
        inputSchema: {
            type: 'object',
            properties: {
                lowStockOnly: { type: 'boolean', description: 'แสดงเฉพาะสต็อกต่ำ (default false)' },
                category: { type: 'string', description: 'PROTEIN, VEGETABLE, CONDIMENT, DRY_GOODS, OTHER' },
            },
        },
    },
    {
        name: 'kitchen.get_expiring_lots',
        description: 'ดู lot วัตถุดิบที่ใกล้หมดอายุ',
        inputSchema: {
            type: 'object',
            properties: {
                days: { type: 'number', description: 'หมดอายุภายในกี่วัน (default 7)' },
            },
        },
    },

    // ─── Inventory Domain ────────────────────────────────────────────────
    {
        name: 'inventory.stock_levels',
        description: 'เช็คสต็อกสินค้าในคลัง (warehouse stock) — อุปกรณ์, merchandise',
        inputSchema: {
            type: 'object',
            properties: {
                warehouseId: { type: 'string', description: 'UUID ของคลัง (optional)' },
                lowStockOnly: { type: 'boolean', description: 'เฉพาะสต็อกต่ำ' },
            },
        },
    },
    {
        name: 'inventory.low_stock_alerts',
        description: 'แจ้งเตือนสินค้าที่สต็อกต่ำกว่า minStock ทุกคลัง',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'inventory.list_warehouses',
        description: 'แสดงรายการคลังสินค้าทั้งหมด',
        inputSchema: { type: 'object', properties: {} },
    },

    // ─── Procurement Domain ──────────────────────────────────────────────
    {
        name: 'procurement.calculate_bom',
        description: 'คำนวณวัตถุดิบที่ต้องใช้ (BOM) สำหรับคลาสเรียน — แสดง totalNeeded, currentStock, shortfall',
        inputSchema: {
            type: 'object',
            properties: {
                classId: { type: 'string', description: 'เช่น CLS-202603-001' },
            },
            required: ['classId'],
        },
    },
    {
        name: 'procurement.create_po_from_bom',
        description: 'สร้างใบสั่งซื้อ (PO) อัตโนมัติจากส่วนที่ขาดของคลาส — ⚠️ write operation',
        inputSchema: {
            type: 'object',
            properties: {
                classId: { type: 'string' },
                createdById: { type: 'string', description: 'UUID ของพนักงานผู้สร้าง' },
            },
            required: ['classId', 'createdById'],
        },
    },
    {
        name: 'procurement.get_po',
        description: 'ดึงรายละเอียดใบสั่งซื้อ (PO) รวมสถานะ, items, approvals, tracking',
        inputSchema: {
            type: 'object',
            properties: {
                poId: { type: 'string', description: 'UUID ของ PO' },
            },
            required: ['poId'],
        },
    },
    {
        name: 'procurement.list_pos',
        description: 'แสดงรายการ PO ทั้งหมด — filter ตาม status, classId',
        inputSchema: {
            type: 'object',
            properties: {
                status: { type: 'string', description: 'DRAFT, REQUEST_REVIEW, APPROVED, ORDERING, ORDERED, etc.' },
                classId: { type: 'string' },
                limit: { type: 'number', description: 'default 20' },
            },
        },
    },
    {
        name: 'procurement.list_suppliers',
        description: 'แสดงรายการซัพพลายเออร์',
        inputSchema: {
            type: 'object',
            properties: {
                search: { type: 'string' },
            },
        },
    },
    {
        name: 'procurement.pending_advances',
        description: 'แสดงเงินทดรองจ่ายที่ยังไม่ได้เบิกคืน',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'procurement.approve_po',
        description: 'อนุมัติหรือตีกลับ PO — ⚠️ write operation',
        inputSchema: {
            type: 'object',
            properties: {
                poId: { type: 'string', description: 'UUID ของ PO' },
                approverId: { type: 'string', description: 'UUID ของเชฟผู้อนุมัติ' },
                action: { type: 'string', enum: ['APPROVED', 'REJECTED'], description: 'APPROVED หรือ REJECTED' },
                reason: { type: 'string', description: 'เหตุผล (จำเป็นถ้า REJECTED)' },
            },
            required: ['poId', 'approverId', 'action'],
        },
    },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Implement Handlers (Logic Bridge)
// ═══════════════════════════════════════════════════════════════════════════════

function textResult(data) {
    return {
        content: [{
            type: 'text',
            text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        }],
    };
}

function errorResult(message) {
    return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${message}` }],
    };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            // ─── Customer ────────────────────────────────────────────────
            case 'customer.search': {
                const customers = await customerRepo.getAllCustomers({
                    search: args.search,
                    limit: args.limit || 10,
                });
                return textResult({
                    count: customers.length,
                    customers: customers.map(c => ({
                        id: c.id,
                        customerId: c.customerId,
                        name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
                        phone: c.phonePrimary,
                        email: c.email,
                        tier: c.membershipTier,
                        vpPoints: c.vpPoints,
                    })),
                });
            }

            // ─── Schedule ────────────────────────────────────────────────
            case 'schedule.list_upcoming': {
                const schedules = await scheduleRepo.getUpcomingSchedules(args.days || 7);
                return textResult(schedules);
            }

            case 'schedule.get_by_class': {
                const schedules = await scheduleRepo.getSchedulesByClass(args.classId);
                return textResult(schedules);
            }

            // ─── Kitchen ─────────────────────────────────────────────────
            case 'kitchen.check_stock': {
                const ingredients = await kitchenRepo.getAllIngredients({
                    lowStockOnly: args.lowStockOnly || false,
                    category: args.category,
                });
                return textResult({
                    count: ingredients.length,
                    ingredients: ingredients.map(i => ({
                        name: i.name,
                        currentStock: i.currentStock,
                        minStock: i.minStock,
                        unit: i.unit,
                        status: i.currentStock <= i.minStock ? 'LOW' : 'OK',
                    })),
                });
            }

            case 'kitchen.get_expiring_lots': {
                const lots = await kitchenRepo.getExpiringLots(args.days || 7);
                return textResult(lots);
            }

            // ─── Inventory ───────────────────────────────────────────────
            case 'inventory.stock_levels': {
                const stocks = await inventoryRepo.getStockLevels({
                    warehouseId: args.warehouseId,
                    lowStockOnly: args.lowStockOnly,
                });
                return textResult(stocks);
            }

            case 'inventory.low_stock_alerts': {
                const alerts = await inventoryRepo.getLowStockAlerts();
                return textResult({ count: alerts.length, alerts });
            }

            case 'inventory.list_warehouses': {
                const warehouses = await inventoryRepo.getAllWarehouses();
                return textResult(warehouses);
            }

            // ─── Procurement ─────────────────────────────────────────────
            case 'procurement.calculate_bom': {
                const bom = await procurementRepo.calculateClassBOM(args.classId);
                const summary = {
                    classId: bom.classId,
                    totalStudents: bom.totalStudents,
                    totalIngredients: bom.ingredients?.length || 0,
                    shortfallCount: bom.ingredients?.filter(i => i.shortfall > 0).length || 0,
                    ingredients: bom.ingredients,
                };
                return textResult(summary);
            }

            case 'procurement.create_po_from_bom': {
                const result = await procurementRepo.createPOFromBOM(args.classId, args.createdById);
                if (result.alreadySufficient) {
                    return textResult('วัตถุดิบเพียงพอแล้ว ไม่ต้องสร้าง PO');
                }
                return textResult({
                    message: 'สร้าง PO สำเร็จ',
                    poId: result.poId,
                    itemCount: result.items?.length || 0,
                    totalAmount: result.totalAmount,
                });
            }

            case 'procurement.get_po': {
                const po = await procurementRepo.getPurchaseOrderById(args.poId);
                if (!po) return errorResult('ไม่พบ PO');
                return textResult(po);
            }

            case 'procurement.list_pos': {
                const pos = await procurementRepo.getAllPurchaseOrders({
                    status: args.status,
                    classId: args.classId,
                    limit: args.limit || 20,
                });
                return textResult(pos);
            }

            case 'procurement.list_suppliers': {
                const suppliers = await procurementRepo.getAllSuppliers({
                    search: args.search,
                });
                return textResult(suppliers);
            }

            case 'procurement.pending_advances': {
                const advances = await procurementRepo.getPendingAdvances();
                return textResult({ count: advances.length, advances });
            }

            case 'procurement.approve_po': {
                if (args.action === 'REJECTED' && !args.reason) {
                    return errorResult('ต้องระบุเหตุผลเมื่อตีกลับ PO');
                }
                const result = await procurementRepo.approvePO(
                    args.poId, args.approverId, args.action, args.reason
                );
                return textResult({
                    message: args.action === 'APPROVED' ? 'อนุมัติ PO สำเร็จ' : 'ตีกลับ PO สำเร็จ',
                    approvalId: result.approvalId,
                    poStatus: args.action,
                });
            }

            default:
                return errorResult(`Unknown tool: ${name}`);
        }
    } catch (error) {
        logger.error(MODULE, `Tool execution failed: ${name}`, error);
        return errorResult(error.message);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Start Server (stdio transport)
// ═══════════════════════════════════════════════════════════════════════════════

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info(MODULE, 'MCP Server started via stdio — 15 tools ready');
}

run().catch((error) => {
    logger.error(MODULE, 'Fatal error starting MCP Server', error);
    process.exit(1);
});

// Export server for Streamable HTTP transport (Vercel API route)
export { server };
