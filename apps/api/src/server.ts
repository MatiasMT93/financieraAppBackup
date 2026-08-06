import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { env, corsOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { checkDbConnection, runMigrations } from './db/connection.js';
import { repairZombieIncidents } from './modules/operations/repository.js';
import { initializeSocket } from './realtime/socket.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';

import authRoutes from './modules/auth/routes.js';
import operationsRoutes from './modules/operations/routes.js';
import incidentsRoutes from './modules/incidents/routes.js';
import locationsRoutes from './modules/locations/routes.js';
import ownerRoutes from './modules/owner/routes.js';
import usersRoutes from './modules/users/routes.js';
import clientsRoutes from './modules/clients/routes.js';

const app = express();
const httpServer = createServer(app);

// Render, Railway y la mayoría de los PaaS colocan un proxy delante.
// Esto permite que Express reconozca correctamente la IP del cliente.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/api/version', (_req, res) => {
  res.json({
    versionCode: env.APP_VERSION_CODE,
    url: env.APP_DOWNLOAD_URL,
  });
});

app.use(errorHandler);

initializeSocket(httpServer);

async function start() {
  logger.info('Checking database connection');

  await checkDbConnection();

  logger.info('Database connection established');

  try {
    logger.info('Running database migrations');

    await runMigrations();

    logger.info('Database migrations up to date');
  } catch (error) {
    console.error('DATABASE_MIGRATION_ERROR:');
    console.error(error);

    if (error instanceof Error) {
      logger.error(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        },
        'Database migration failed',
      );
    } else {
      logger.error({ error }, 'Database migration failed');
    }

    throw error;
  }

  const repaired = await repairZombieIncidents();

  if (repaired > 0) {
    logger.info(`Repaired ${repaired} zombie incident operations`);
  }

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      `CambioApp API running on port ${env.PORT} [${env.NODE_ENV}]`,
    );
  });
}

start().catch((error: unknown) => {
  console.error('STARTUP_ERROR_FULL:');
  console.error(error);

  if (error instanceof Error) {
    logger.error(
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      },
      'Failed to start server',
    );
  } else {
    logger.error({ error }, 'Failed to start server');
  }

  process.exit(1);
});
  logger.error(err, 'Failed to start server');
  process.exit(1);
});
