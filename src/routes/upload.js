import express from 'express';
import multer from 'multer';
import { handleUpload, deleteFile, fileExists } from '../utils/uploadHandler.js';
import { UPLOAD_CONFIG, VALID_FOLDERS } from '../config/uploadConfig.js';

const router = express.Router();

// Production multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
        files: Math.max(...Object.values(UPLOAD_CONFIG.MAX_FILES))
    },
    fileFilter: (req, file, cb) => {
        if (UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
    }
});

// Error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/:folder',
    upload.single('image'),
    asyncHandler(async (req, res) => {
        const { folder } = req.params;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please use "image" field name.',
                timestamp: new Date().toISOString()
            });
        }

        const result = await handleUpload([req.file], folder);

        const status = result.success ? 200 : 400;
        res.status(status).json(result);
    })
);

router.post('/:folder/multiple',
    upload.array('images', 10),
    asyncHandler(async (req, res) => {
        const { folder } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded. Please use "images" field name.',
                timestamp: new Date().toISOString()
            });
        }

        const result = await handleUpload(req.files, folder);

        const status = result.success ? 200 : 400;
        res.status(status).json(result);
    })
);

// Delete image
router.delete('/:folder/:filename',
    asyncHandler(async (req, res) => {
        const { folder, filename } = req.params;

        if (!VALID_FOLDERS.includes(folder)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid upload folder',
                timestamp: new Date().toISOString()
            });
        }

        // Security validation
        if (!filename || filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename',
                timestamp: new Date().toISOString()
            });
        }

        const success = await deleteFile(filename, folder);

        if (success) {
            res.json({
                success: true,
                message: 'File deleted successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'File not found or could not be deleted',
                timestamp: new Date().toISOString()
            });
        }
    })
);

// Check if file exists
router.get('/exists/:folder/:filename',
    asyncHandler(async (req, res) => {
        const { folder, filename } = req.params;

        if (!VALID_FOLDERS.includes(folder)) {
            return res.status(400).json({
                exists: false,
                timestamp: new Date().toISOString()
            });
        }

        const exists = await fileExists(filename, folder);
        res.json({
            exists,
            timestamp: new Date().toISOString()
        });
    })
);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uploadConfig: {
            maxFileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
            allowedTypes: UPLOAD_CONFIG.ALLOWED_MIME_TYPES,
            maxFiles: UPLOAD_CONFIG.MAX_FILES
        }
    });
});

// Global error handler for upload routes
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size: ${UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
                timestamp: new Date().toISOString()
            });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded',
                timestamp: new Date().toISOString()
            });
        }
    }

    console.error('Upload route error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

export default router;