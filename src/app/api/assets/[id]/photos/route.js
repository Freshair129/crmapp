import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';
import { getAssetById, updateAsset } from '@/lib/repositories/assetRepo';

const MAX_PHOTOS = 5;
const MAX_SIZE_BYTES = 800 * 1024; // 800KB per photo (after client-side compression)

/**
 * POST /api/assets/[id]/photos — Add a photo (base64) to asset
 * Body: { photo: "data:image/webp;base64,..." }
 */
export async function POST(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { photo } = await request.json();
        if (!photo || !photo.startsWith('data:image/')) {
            return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
        }

        // Size check (base64 is ~33% larger than binary)
        const sizeBytes = (photo.length * 3) / 4;
        if (sizeBytes > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: `Image too large (max ${MAX_SIZE_BYTES / 1024}KB)` }, { status: 400 });
        }

        const asset = await getAssetById(params.id);
        if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        const currentPhotos = Array.isArray(asset.photos) ? asset.photos : [];
        if (currentPhotos.length >= MAX_PHOTOS) {
            return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos allowed` }, { status: 400 });
        }

        const updatedPhotos = [...currentPhotos, photo];
        const updated = await updateAsset(params.id, { photos: updatedPhotos });

        logger.info('[AssetPhotos]', `Photo added to asset ${params.id} (${updatedPhotos.length}/${MAX_PHOTOS})`);
        return NextResponse.json({ photos: updated.photos });
    } catch (error) {
        logger.error('[AssetPhotos]', 'POST failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/assets/[id]/photos — Remove a photo by index
 * Body: { index: 0 }
 */
export async function DELETE(request, { params }) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { index } = await request.json();
        const asset = await getAssetById(params.id);
        if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        const currentPhotos = Array.isArray(asset.photos) ? asset.photos : [];
        if (index < 0 || index >= currentPhotos.length) {
            return NextResponse.json({ error: 'Invalid photo index' }, { status: 400 });
        }

        const updatedPhotos = currentPhotos.filter((_, i) => i !== index);
        const updated = await updateAsset(params.id, { photos: updatedPhotos });

        logger.info('[AssetPhotos]', `Photo ${index} removed from asset ${params.id}`);
        return NextResponse.json({ photos: updated.photos });
    } catch (error) {
        logger.error('[AssetPhotos]', 'DELETE failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
