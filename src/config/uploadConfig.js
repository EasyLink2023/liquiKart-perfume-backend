import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOAD_CONFIG = {
    MAX_FILES: {
        categories: 1,
        products: 10,
        profiles: 1
    },
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif'
    ],
    UPLOAD_DIRS: {
        categories: path.join(process.cwd(), 'uploads', 'categories'),
        products: path.join(process.cwd(), 'uploads', 'products'),
        profiles: path.join(process.cwd(), 'uploads', 'profiles')
    },
    IMAGE_OPTIMIZATION: {
        categories: {
            width: 400,
            height: 300,
            format: 'webp',
            quality: 80,
            fit: 'cover'
        },
        products: {
            width: 800,
            height: 600,
            format: 'webp',
            quality: 85,
            fit: 'cover'
        },
        profiles: {
            width: 300,
            height: 300,
            format: 'webp',
            quality: 90,
            fit: 'cover'
        }
    },
    COMPRESSION_LEVEL: {
        low: { quality: 60, effort: 2 },
        medium: { quality: 80, effort: 4 },
        high: { quality: 90, effort: 6 }
    },
    CACHE_CONTROL: 'public, max-age=31536000, immutable',
    CDN_ENABLED: process.env.CDN_ENABLED === 'true',
    CDN_BASE_URL: process.env.CDN_BASE_URL || ''
};

export const VALID_FOLDERS = ['categories', 'products', 'profiles'];