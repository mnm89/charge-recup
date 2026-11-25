import { PrismaClient } from '@prisma/client';

// Une seule instance du client en développement (le rechargement à chaud en créerait plusieurs).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
