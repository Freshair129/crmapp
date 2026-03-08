import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MAPPING_FILE = path.join(process.cwd(), 'data', 'ad-mapping.json');

async function readMapping() {
    try {
        const raw = await fs.readFile(MAPPING_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { campaign_mappings: [], ad_mappings: [] };
    }
}

async function writeMapping(mapping) {
    await fs.mkdir(path.dirname(MAPPING_FILE), { recursive: true });
    await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2));
}

/**
 * GET /api/marketing/mapping
 * Returns { campaign_mappings: [], ad_mappings: [] }
 */
export async function GET() {
    try {
        const mapping = await readMapping();
        return NextResponse.json(mapping);
    } catch (error) {
        logger.error('[MappingAPI]', 'GET error', error);
        return NextResponse.json({ campaign_mappings: [], ad_mappings: [] });
    }
}

/**
 * POST /api/marketing/mapping
 * Body: { type: 'campaign'|'ad', data: { campaign_name?, ad_name?, product_id, product_name } }
 * Returns { success, mapping }
 */
export async function POST(request) {
    try {
        const { type, data } = await request.json();
        const mapping = await readMapping();

        if (type === 'campaign') {
            const existing = mapping.campaign_mappings.findIndex(
                (m) => m.campaign_name === data.campaign_name
            );
            if (existing >= 0) {
                mapping.campaign_mappings[existing] = data;
            } else {
                mapping.campaign_mappings.push(data);
            }
        } else if (type === 'ad') {
            const existing = mapping.ad_mappings.findIndex(
                (m) => m.ad_name === data.ad_name
            );
            if (existing >= 0) {
                mapping.ad_mappings[existing] = data;
            } else {
                mapping.ad_mappings.push(data);
            }
        }

        await writeMapping(mapping);
        return NextResponse.json({ success: true, mapping });
    } catch (error) {
        logger.error('[MappingAPI]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/marketing/mapping?type=campaign|ad&name=...
 * Returns { success, mapping }
 */
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const name = searchParams.get('name');

        const mapping = await readMapping();

        if (type === 'campaign') {
            mapping.campaign_mappings = mapping.campaign_mappings.filter(
                (m) => m.campaign_name !== name
            );
        } else if (type === 'ad') {
            mapping.ad_mappings = mapping.ad_mappings.filter(
                (m) => m.ad_name !== name
            );
        }

        await writeMapping(mapping);
        return NextResponse.json({ success: true, mapping });
    } catch (error) {
        logger.error('[MappingAPI]', 'DELETE error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
