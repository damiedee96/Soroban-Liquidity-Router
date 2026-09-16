import { Router } from 'express';
import { prisma } from '@soroban-router/database';

const router = Router();

// Get execution by ID
router.get('/:id', async (req, res, next) => {
  try {
    const execution = await prisma.execution.findUnique({
      where: { id: req.params.id },
      include: { quote: { include: { route: { include: { steps: true } } } } },
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Execution not found',
        },
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    next(error);
  }
});

// List executions
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      prisma.execution.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { quote: true },
      }),
      prisma.execution.count(),
    ]);

    res.json({
      success: true,
      data: executions,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
