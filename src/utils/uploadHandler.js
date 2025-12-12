import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_CONFIG, VALID_FOLDERS } from '../config/uploadConfig.js';
import { optimizeImage, generateFilename, validateImage } from './imageProcessor.js';

/**
 * Ensure upload directory exists with proper permissions
 */
export async function ensureUploadDirectory(uploadDir) {
    try {
        await fs.access(uploadDir);
    } catch {
        await fs.mkdir(uploadDir, { recursive: true, mode: 0o755 });

        const gitkeepPath = path.join(uploadDir, '.gitkeep');
        await fs.writeFile(gitkeepPath, '');
    }
}

/**
 * Validate file with security checks
 */
export function validateFile(file, folder) {
    if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return {
            isValid: false,
            error: `Invalid file type: ${file.mimetype}. Allowed: ${UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
        };
    }

    // File size validation
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        return {
            isValid: false,
            error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: ${UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    // Security: Check for potential zip bombs or malformed files
    if (file.size === 0) {
        return { isValid: false, error: 'Empty file' };
    }

    return { isValid: true };
}

/**
 * Validate file count limits
 */
export function validateFileCount(files, folder) {
    const maxFiles = UPLOAD_CONFIG.MAX_FILES[folder];

    if (files.length > maxFiles) {
        return `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed for ${folder} uploads`;
    }

    // Single file restrictions
    if ((folder === 'categories' || folder === 'profiles') && files.length > 1) {
        return `${folder} uploads allow only one file`;
    }

    return null;
}

/**
 * Process single file with error handling and cleanup
 */
export async function processSingleFile(file, uploadDir, folder) {
    let tempFilePath = null;

    try {
        // Initial validation
        const fileValidation = validateFile(file, folder);
        if (!fileValidation.isValid) {
            return { success: false, error: fileValidation.error };
        }

        // Image validation
        const imageValidation = await validateImage(file.buffer);
        if (!imageValidation.isValid) {
            return { success: false, error: imageValidation.error };
        }

        // Generate filename
        const filename = await generateFilename(file.originalname);
        const filePath = path.join(uploadDir, filename);

        // Optimize image
        const optimizationOptions = UPLOAD_CONFIG.IMAGE_OPTIMIZATION[folder];
        const processedImage = await optimizeImage(file.buffer, optimizationOptions);

        // Save optimized image
        await fs.writeFile(filePath, processedImage.buffer);

        const fileUrl = `/uploads/${folder}/${filename}`;

        const uploadedFile = {
            url: fileUrl,
            filename,
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype,
            width: processedImage.metadata.width,
            height: processedImage.metadata.height,
            optimizedSize: processedImage.metadata.size,
            optimizationRatio: Math.round(
                ((file.size - processedImage.metadata.size) / file.size) * 100
            ),
            format: processedImage.metadata.format,
            compression: processedImage.metadata.compression
        };

        return { success: true, file: uploadedFile };

    } catch (error) {
        // Cleanup temp file if exists
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
        }

        return {
            success: false,
            error: `File processing failed: ${error.message}`
        };
    }
}

/**
 * Main upload handler with production optimizations
 */
export async function handleUpload(files, folder) {
    if (!files || !Array.isArray(files) || files.length === 0) {
        return {
            success: false,
            message: 'No files uploaded',
            timestamp: new Date().toISOString()
        };
    }

    // Validate folder
    if (!VALID_FOLDERS.includes(folder)) {
        return {
            success: false,
            message: `Invalid upload folder. Must be one of: ${VALID_FOLDERS.join(', ')}`,
            timestamp: new Date().toISOString()
        };
    }

    // Validate file count
    const countError = validateFileCount(files, folder);
    if (countError) {
        return {
            success: false,
            message: countError,
            timestamp: new Date().toISOString()
        };
    }

    const uploadDir = UPLOAD_CONFIG.UPLOAD_DIRS[folder];
    const uploadedFiles = [];
    const errors = [];

    try {
        // Ensure directory exists
        await ensureUploadDirectory(uploadDir);

        // Process files in parallel with limited concurrency
        const processingPromises = files.map(file =>
            processSingleFile(file, uploadDir, folder)
        );

        const results = await Promise.allSettled(processingPromises);

        // Process results
        for (const result of results) {
            if (result.status === 'fulfilled') {
                const value = result.value;
                if (value.success) {
                    uploadedFiles.push(value.file);
                } else {
                    errors.push(value.error);
                }
            } else {
                errors.push(result.reason.message);
            }
        }

        // Handle partial failures
        if (errors.length > 0) {
            // Cleanup successfully uploaded files
            await cleanupUploadedFiles(uploadedFiles, uploadDir);

            if (errors.length === files.length) {
                return {
                    success: false,
                    message: errors[0],
                    timestamp: new Date().toISOString()
                };
            }

            return {
                success: false,
                message: `${uploadedFiles.length} uploaded, ${errors.length} failed: ${errors.join(', ')}`,
                partialSuccess: true,
                uploadedCount: uploadedFiles.length,
                errorCount: errors.length,
                timestamp: new Date().toISOString()
            };
        }

        // Success response
        return {
            success: true,
            data: { files: uploadedFiles },
            message: getSuccessMessage(folder, uploadedFiles.length),
            timestamp: new Date().toISOString(),
            totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0),
            optimizedSize: uploadedFiles.reduce((sum, file) => sum + file.optimizedSize, 0)
        };

    } catch (error) {
        console.error('Upload handler error:', error);

        // Emergency cleanup on critical errors
        await cleanupUploadedFiles(uploadedFiles, uploadDir);

        return {
            success: false,
            message: 'Upload processing failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Cleanup uploaded files on error
 */
async function cleanupUploadedFiles(files, uploadDir) {
    const cleanupPromises = files.map(async (file) => {
        try {
            const filePath = path.join(uploadDir, file.filename);
            await fs.unlink(filePath);
        } catch (error) {
            console.error(`Failed to cleanup file ${file.filename}:`, error);
        }
    });

    await Promise.allSettled(cleanupPromises);
}

/**
 * Get success message
 */
function getSuccessMessage(folder, fileCount) {
    const messages = {
        categories: 'Category image uploaded successfully',
        profiles: 'Profile image uploaded successfully',
        products: fileCount === 1
            ? 'Product image uploaded successfully'
            : `${fileCount} product images uploaded successfully`
    };
    return messages[folder];
}

/**
 * Delete file with security checks
 */
export async function deleteFile(filename, folder) {
    try {
        if (!VALID_FOLDERS.includes(folder)) {
            throw new Error('Invalid folder');
        }

        // Security: Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw new Error('Invalid filename');
        }

        const uploadDir = UPLOAD_CONFIG.UPLOAD_DIRS[folder];
        const filePath = path.join(uploadDir, filename);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return false;
        }

        // Delete file
        await fs.unlink(filePath);

        // Log deletion for audit
        console.log(`File deleted: ${filePath}`, {
            timestamp: new Date().toISOString(),
            folder,
            filename
        });

        return true;

    } catch (error) {
        console.error('Delete file error:', error);
        throw error;
    }
}

/**
 * Check if file exists
 */
export async function fileExists(filename, folder) {
    try {
        if (!VALID_FOLDERS.includes(folder)) {
            return false;
        }

        const uploadDir = UPLOAD_CONFIG.UPLOAD_DIRS[folder];
        const filePath = path.join(uploadDir, filename);

        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}