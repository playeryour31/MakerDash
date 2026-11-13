import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __makerPrisma: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['error', 'warn'] : ['error'],
  });
}

/** Shared singleton for Nest / scripts (safe in long-running Node). */
export const prisma: PrismaClient =
  global.__makerPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__makerPrisma = prisma;
}
