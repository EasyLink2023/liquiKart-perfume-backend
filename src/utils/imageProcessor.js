import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';

sharp.concurrency(Number(process.env.SHARP_CONCURRENCY) || 2);
sharp.cache(false);

const SUPPORTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif']);
const MAX_PIXELS = 10000 * 10000;

/**
 * Optimize image with production-ready settings
 */
export async function optimizeImage(buffer, options) {
    const originalSize = buffer.length;

    try {
        let sharpInstance = sharp(buffer, {
            limitInputPixels: MAX_PIXELS,
            sequentialRead: true,
            failOnError: false
        });

        if (options.width || options.height) {
            sharpInstance = sharpInstance.resize(options.width, options.height, {
                fit: options.fit || 'cover',
                withoutEnlargement: true,
                position: 'attention',
                kernel: sharp.kernel.lanczos3
            });
        }

        const compressionLevel = process.env.NODE_ENV === 'production' ? 'medium' : 'high';
        const compressedBuffer = await applyCompression(sharpInstance, options, compressionLevel);

        const metadata = await sharp(compressedBuffer).metadata();

        return {
            buffer: compressedBuffer,
            metadata: {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: options.format,
                size: compressedBuffer.length,
                originalSize,
                compression: compressionLevel
            }
        };
    } catch (error) {
        console.error('Image optimization failed:', error);
        throw new Error(`Image processing failed: ${error.message}`);
    }
}

/**
 * Apply compression with environment-specific settings
 */
async function applyCompression(sharpInstance, options, level = 'medium') {
    const compressionSettings = {
        low: { quality: 60, effort: 2 },
        medium: { quality: 80, effort: 4 },
        high: { quality: 90, effort: 6 }
    };

    const settings = compressionSettings[level];

    switch (options.format) {
        case 'jpeg':
            return sharpInstance
                .jpeg({
                    quality: settings.quality,
                    mozjpeg: true,
                    chromaSubsampling: '4:4:4'
                })
                .toBuffer();

        case 'png':
            return sharpInstance
                .png({
                    quality: settings.quality,
                    compressionLevel: 6,
                    palette: true,
                    effort: settings.effort
                })
                .toBuffer();

        case 'webp':
            return sharpInstance
                .webp({
                    quality: settings.quality,
                    effort: settings.effort,
                    alphaQuality: 80
                })
                .toBuffer();

        case 'avif':
            return sharpInstance
                .avif({
                    quality: settings.quality,
                    effort: settings.effort
                })
                .toBuffer();

        default:
            return sharpInstance.webp({ quality: 80 }).toBuffer();
    }
}

/**
 * Generate secure, unique filename
 */
export async function generateFilename(originalName) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName).toLowerCase();

    // Sanitize filename
    const nameWithoutExt = path.basename(originalName, extension)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);

    // Use webp for better compression in production
    const finalExtension = process.env.NODE_ENV === 'production' ? '.webp' :
        (extension === '.jpeg' ? '.jpg' : extension);

    return `${nameWithoutExt}-${timestamp}-${randomBytes}${finalExtension}`;
}

/**
 * Validate image with security checks
 */
export async function validateImage(buffer) {
    try {
        const metadata = await sharp(buffer, {
            limitInputPixels: MAX_PIXELS
        }).metadata();

        // Format validation
        if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format)) {
            return {
                isValid: false,
                error: `Unsupported image format: ${metadata.format}`
            };
        }

        // Dimension validation
        if (!metadata.width || !metadata.height || metadata.width === 0 || metadata.height === 0) {
            return { isValid: false, error: 'Invalid image dimensions' };
        }

        // Size validation
        const totalPixels = metadata.width * metadata.height;
        if (totalPixels > MAX_PIXELS) {
            return {
                isValid: false,
                error: `Image too large: ${metadata.width}x${metadata.height}`
            };
        }

        // Security: Check for potential malicious files
        if (buffer.length > 50 * 1024 * 1024) {
            return { isValid: false, error: 'File size exceeds security limits' };
        }

        return {
            isValid: true,
            metadata: {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height
            }
        };
    } catch (error) {
        return {
            isValid: false,
            error: `Image validation failed: ${error.message}`
        };
    }
}

/**
 * Generate multiple sizes for responsive images (production feature)
 */
export async function generateResponsiveSizes(buffer, folder) {
    const sizes = {
        thumbnail: { width: 150, height: 150 },
        medium: { width: 400, height: 300 },
        large: { width: 800, height: 600 }
    };

    const results = {};

    for (const [sizeName, dimensions] of Object.entries(sizes)) {
        try {
            const optimized = await optimizeImage(buffer, {
                ...UPLOAD_CONFIG.IMAGE_OPTIMIZATION[folder],
                ...dimensions
            });

            results[sizeName] = optimized;
        } catch (error) {
            console.warn(`Failed to generate ${sizeName} size:`, error);
        }
    }

    return results;
}