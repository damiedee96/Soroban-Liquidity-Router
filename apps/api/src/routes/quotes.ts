import { Router } from 'express';
import { QuoteService } from '@soroban-router/routing-engine';

const router = Router();
const quoteService = new QuoteService();

// Generate quote
router.post('/', async (req, res, next) => {
  try {
    const quote = await quoteService.generateQuote(req.body.routeId, req.body);
    
    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
});

// Get quote by ID
router.get('/:id', async (req, res, next) => {
  try {
    const quote = await quoteService.getQuote(req.params.id);
    
    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
});

// Refresh quote
router.post('/:id/refresh', async (req, res, next) => {
  try {
    const quote = await quoteService.refreshQuote(req.params.id);
    
    res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
