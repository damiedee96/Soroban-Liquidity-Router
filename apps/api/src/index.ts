import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger } from '@soroban-router/utils';
import { checkDatabaseHealth } from '@soroban-router/database';

// Import routes
import assetsRouter from './routes/assets';
import routesRouter from './routes/routes';
import quotesRouter from './routes/quotes';
import executionsRouter from './routes/executions';
import analyticsRouter from './routes/analytics';

// Load environment variables
dotenv.config();

const logger = createLogger('API');
const app = express();
const port = process.env.API_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    
    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    });
  }
});

// API Routes
app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/routes', routesRouter);
app.use('/api/v1/quotes', quotesRouter);
app.use('/api/v1/executions', executionsRouter);
app.use('/api/v1/analytics', analyticsRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error', { error: err.message, path: req.path });
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      details: err.details,
    },
  });
});

// Start server
app.listen(port, () => {
  logger.info(`API server running on port ${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`API base: http://localhost:${port}/api/v1`);
});

export default app;
