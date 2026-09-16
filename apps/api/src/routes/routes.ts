import { Router } from 'express';
import { RouteDiscoveryService } from '@soroban-router/routing-engine';

const router = Router();
const routeDiscovery = new RouteDiscoveryService();

// Discover routes
router.post('/discover', async (req, res, next) => {
  try {
    const result = await routeDiscovery.discoverRoutes(req.body);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get route by ID
router.get('/:id', async (req, res, next) => {
  try {
    const route = await routeDiscovery.getRoute(req.params.id);
    
    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
});

// Validate route
router.get('/:id/validate', async (req, res, next) => {
  try {
    const isValid = await routeDiscovery.validateRoute(req.params.id);
    
    res.json({
      success: true,
      data: { valid: isValid },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
