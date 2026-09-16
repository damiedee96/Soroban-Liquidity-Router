import { Router } from 'express';
import { prisma } from '@soroban-router/database';

const router = Router();

// Platform metrics
router.get('/platform', async (req, res, next) => {
  try {
    const period = (req.query.period as string) || '24h';
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [totalExecutions, successfulExecutions, totalAssets, totalSources] = await Promise.all([
      prisma.execution.count({ where: { createdAt: { gte: since } } }),
      prisma.execution.count({
        where: { createdAt: { gte: since }, status: 'CONFIRMED' },
      }),
      prisma.asset.count({ where: { status: 'ACTIVE' } }),
      prisma.liquiditySource.count({ where: { status: 'ACTIVE' } }),
    ]);

    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    res.json({
      success: true,
      data: {
        period,
        totalExecutions,
        successfulExecutions,
        successRate: successRate.toFixed(2),
        totalAssets,
        totalSources,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Source performance
router.get('/sources', async (req, res, next) => {
  try {
    const sources = await prisma.liquiditySource.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        type: true,
        reliabilityScore: true,
        uptimePercentage: true,
        healthStatus: true,
      },
    });

    res.json({
      success: true,
      data: sources,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
