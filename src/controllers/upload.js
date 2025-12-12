import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sendResponse from "../utils/responseHelper.js";

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const folder = req.params.folderName;
      const frontendPath = path.join(
        process.env.SERVER_ENV === "development" ? 'D:/projects/' : 'var/www/',
        'planetofwine/public/images',
        folder
      );

      // Create directory recursively
      if (!fs.existsSync(frontendPath)) {
        fs.mkdirSync(frontendPath, { recursive: true });
        console.log(`Directory created: ${frontendPath}`);
      }

      cb(null, frontendPath);
    } catch (error) {
      console.error('Error creating directory:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const originalName = file.originalname;
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const ext = path.extname(sanitizedName);
      const name = path.basename(sanitizedName, ext);
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);

      const finalFilename = `${name}-${timestamp}-${random}${ext}`;

      console.log(`Sanitized filename: ${originalName} -> ${finalFilename}`);
      cb(null, finalFilename);
    } catch (error) {
      console.error('Error generating filename:', error);
      cb(error, null);
    }
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
    }
  }
});

export const uploadImages = [
  upload.array('images', 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return sendResponse(res, {
          status: 400,
          message: 'No files uploaded',
        });
      }

      const folder = req.params.folderName;
      const baseUrl = process.env.SERVER_ENV === 'production'
        ? process.env.CLIENT_URL
        : 'http://localhost:3000';

      const uploadedFiles = req.files.map(file => ({
        url: `${baseUrl}/images/${folder}/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      }));

      console.log(`Uploaded ${uploadedFiles.length} file(s) successfully:`);
      uploadedFiles.forEach(file => {
        console.log(`- ${file.originalName} -> ${file.filename}`);
      });

      return sendResponse(res, {
        status: 200,
        message: `${uploadedFiles.length} image(s) uploaded successfully`,
        data: { files: uploadedFiles },
      });
    } catch (err) {
      console.error('Upload error:', err);
      return sendResponse(res, {
        status: 500,
        message: 'Image upload failed',
        error: err.message,
      });
    }
  },
];