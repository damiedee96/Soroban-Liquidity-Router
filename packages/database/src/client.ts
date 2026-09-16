import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client instance
 * Ensures single instance across application (important for connection pooling)
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma Client with configuration
 */
function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });
}

/**
 * Singleton Prisma Client
 * In development, prevents hot-reload from creating multiple instances
 */
export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Graceful shutdown handler
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = await prisma.$queryRaw<Array<{ table_name: string; row_count: bigint }>>`
      SELECT 
        schemaname || '.' || tablename as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;
    `;

    return stats.map((stat) => ({
      tableName: stat.table_name,
      rowCount: Number(stat.row_count),
    }));
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return [];
  }
}

/**
 * Database connection pool info
 */
export async function getConnectionPoolInfo() {
  try {
    const result = await prisma.$queryRaw<
      Array<{
        total_connections: bigint;
        active_connections: bigint;
        idle_connections: bigint;
      }>
    >`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity) as total_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections;
    `;

    if (result.length > 0) {
      return {
        total: Number(result[0]!.total_connections),
        active: Number(result[0]!.active_connections),
        idle: Number(result[0]!.idle_connections),
      };
    }

    return { total: 0, active: 0, idle: 0 };
  } catch (error) {
    console.error('Failed to get connection pool info:', error);
    return { total: 0, active: 0, idle: 0 };
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
