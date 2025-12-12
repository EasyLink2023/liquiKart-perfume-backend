import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import middlewares and routes
import errorHandler from './middlewares/error.js';

// Routes
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customer.js';
import profileRoutes from './routes/profile.js';
import vendorRoutes from './routes/vendor.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import departmentRoutes from './routes/department.js';
import paymentRoutes from './routes/payment.js';
import orderRoutes from './routes/order.js';
import shippingRoutes from './routes/shipping.js';

// Middlewares
import authenticate from './middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ========== SECURITY & PERFORMANCE SETTINGS ==========

// Increase Node.js limits
app.disable('x-powered-by');

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"]
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const getCorsOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        return [
            'https://liquikartperfume.work-files.com',
        ];
    }
    return ['http://localhost:3000', 'http://localhost:5000'];
};

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = getCorsOrigins();

        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        console.log(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 200 : 1000,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true
});
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Prevent parameter pollution
app.use(hpp({
    whitelist: ['category', 'price', 'rating', 'createdAt']
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined', {
        skip: (req, res) => res.statusCode < 400
    }));
} else {
    app.use(morgan('dev'));
}

// Trust proxy
app.set('trust proxy', 1);

// Request timing middleware
app.use((req, res, next) => {
    req.startTime = Date.now();
    next();
});

// Static file serving
const staticOptions = {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Set correct content type
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
        };

        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
};

app.use('/uploads/profiles', express.static('uploads/profiles', staticOptions));
app.use('/uploads/products', express.static('uploads/products', staticOptions));
app.use('/uploads/categories', express.static('uploads/categories', staticOptions));

// ========== ROUTES ==========

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/vendor', vendorRoutes);

// Protected routes
app.use('/api/customer', authenticate, customerRoutes);
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/admin', authenticate, adminRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/orders', authenticate, orderRoutes);
app.use('/api/upload', authenticate, uploadRoutes);

// Shipping Routes
app.use('/api/shipping/fedex', shippingRoutes);


// ========== HEALTH & MONITORING ==========

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Planet of Wine API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use(errorHandler);

export default app;