import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { uploadProductImage, deleteProductImage } from '@/lib/supabaseStorage';

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/products/[id]/images — Upload product image
 * Body: multipart/form-data with field "file"
 * Returns: { url, index, images[] }
 */
export async function POST(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();

        // 1. Fetch product
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // 2. Parse current images
        const meta = product.metadata || {};
        const extraImages = Array.isArray(meta.images) ? meta.images : [];
        const allImages = product.image ? [product.image, ...extraImages] : [...extraImages];

        if (allImages.length >= MAX_IMAGES) {
            return NextResponse.json(
                { error: `Maximum ${MAX_IMAGES} images allowed` },
                { status: 400 }
            );
        }

        // 3. Read uploaded file
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
                { status: 400 }
            );
        }

        // 4. Upload to Supabase Storage
        const buffer = await file.arrayBuffer();
        const index = allImages.length;
        const publicUrl = await uploadProductImage(buffer, product.productId, index);

        if (!publicUrl) {
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        // 5. Update product — slot 0 = main image, 1-5 = metadata.images[]
        let updatedProduct;
        if (!product.image) {
            // First image → set as main
            updatedProduct = await prisma.product.update({
                where: { id },
                data: { image: publicUrl }
            });
        } else {
            // Additional images → append to metadata.images[]
            const newExtraImages = [...extraImages, publicUrl];
            updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    metadata: { ...meta, images: newExtraImages }
                }
            });
        }

        const finalImages = updatedProduct.image
            ? [updatedProduct.image, ...((updatedProduct.metadata?.images) || [])]
            : ((updatedProduct.metadata?.images) || []);

        logger.info('[ProductImages]', `Image uploaded for ${product.productId} (slot ${index})`);

        return NextResponse.json({
            url: publicUrl,
            index,
            images: finalImages
        }, { status: 201 });

    } catch (error) {
        logger.error('[ProductImages]', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/products/[id]/images — Remove a product image by index
 * Body: { index: number } (0 = main image, 1-5 = extras)
 */
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const prisma = await getPrisma();
        const body = await request.json();
        const { index } = body;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const meta = product.metadata || {};
        const extraImages = Array.isArray(meta.images) ? [...meta.images] : [];
        const allImages = product.image ? [product.image, ...extraImages] : [...extraImages];

        if (index < 0 || index >= allImages.length) {
            return NextResponse.json({ error: 'Invalid image index' }, { status: 400 });
        }

        // Delete from storage
        const urlToDelete = allImages[index];
        await deleteProductImage(urlToDelete);

        // Remove from DB
        allImages.splice(index, 1);
        const newMain = allImages[0] || null;
        const newExtras = allImages.slice(1);

        await prisma.product.update({
            where: { id },
            data: {
                image: newMain,
                metadata: { ...meta, images: newExtras.length > 0 ? newExtras : undefined }
            }
        });

        logger.info('[ProductImages]', `Image deleted for ${product.productId} (slot ${index})`);

        return NextResponse.json({
            images: allImages,
            deleted: urlToDelete
        });

    } catch (error) {
        logger.error('[ProductImages]', 'DELETE error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
