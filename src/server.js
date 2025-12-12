import 'dotenv/config';
import cluster from 'cluster';
import os from 'os';
import app from './app.js';
import sequelize from './config/database.js';

const logger = {
  info: (message, ...args) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args),
  error: (message, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args)
};

// Configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const numCPUs = isProduction ? os.cpus().length : 1;

// Graceful shutdown handler
const gracefulShutdown = async (signal, server) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  try {
    // Close HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server:', err);
          } else {
            logger.info('HTTP server closed');
          }
          resolve();
        });
      });
    }

    // Close database connection
    if (sequelize) {
      await sequelize.close();
      logger.info('Database connection closed');
    }

    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

// Worker process logic
const startWorker = async () => {
  try {
    // Database connection
    await sequelize.authenticate();
    logger.info('✅ Database connected successfully');

    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database synced');
    }

    // Start server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`🌐 Environment: ${NODE_ENV}`);
      logger.info(`👷 Worker PID: ${process.pid}`);

      if (cluster.worker) {
        logger.info(`👥 Worker ID: ${cluster.worker.id}`);
      }
    });

    server.timeout = 300000;
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 130000;

    app.timeout = 600000;
    app.server = server;

    // Setup graceful shutdown for this worker
    process.on('SIGINT', () => gracefulShutdown('SIGINT', server));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException', server);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (err) {
    logger.error('❌ Failed to start worker:', err);

    // Provide specific error messages for database
    if (err.original) {
      switch (err.original.code) {
        case 'ER_ACCESS_DENIED_ERROR':
          logger.error('Authentication failed. Check DB credentials in .env file');
          break;
        case 'ECONNREFUSED':
          logger.error('Connection refused. Is MySQL running?');
          break;
        case 'ER_BAD_DB_ERROR':
          logger.error(`Database '${process.env.DB_NAME}' does not exist`);
          break;
        default:
          logger.error('Database error:', err.original.code);
      }
    }

    process.exit(1);
  }
};

// Cluster setup for production
if (cluster.isPrimary && isProduction && numCPUs > 1) {
  logger.info(`Primary ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} worker processes`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker...');
    cluster.fork();
  });

  // Handle primary process shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down cluster...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
    process.exit(0);
  });

} else {
  // Single process for development or worker for production
  startWorker();
}