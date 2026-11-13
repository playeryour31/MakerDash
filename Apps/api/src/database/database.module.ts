import { Global, Module, Logger } from '@nestjs/common';

/**
 * Legacy Mongo module — no-op. All data lives in PostgreSQL now.
 */
@Global()
@Module({})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  onModuleInit() {
    this.logger.log('MongoDB disabled — PostgreSQL is the sole data store');
  }
}

export function isMongoReady() {
  return false;
}
