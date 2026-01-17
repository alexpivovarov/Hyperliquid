import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import depositRoutes from './routes/deposits.js';

const app = express();

// =============================================================================
// Middleware
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Request logging (skip in test mode)
if (config.nodeEnv !== 'test') {
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim()),
        },
    }));
}

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// Routes
// =============================================================================

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api/deposits', depositRoutes);

// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        name: 'HyperGate API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/docs',
        health: '/health',
    });
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
