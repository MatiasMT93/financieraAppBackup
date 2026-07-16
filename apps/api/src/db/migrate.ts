import 'dotenv/config';
import { runMigrations } from './connection.js';
import { logger } from '../config/logger.js';

logger.info('Running database migrations...');
runMigrations()
  .then(() => {
    logger.info('Migrations completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    logger.error(err, 'Migration failed');
    process.exit(1);
  });
