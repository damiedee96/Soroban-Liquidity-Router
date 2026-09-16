import { Router } from 'express';
import { AssetRegistry } from '@soroban-router/routing-engine';

const router = Router();
const assetRegistry = new AssetRegistry();

// List assets
router.get('/', async (req, res, next) => {
  try {
    const result = await assetRegistry.listAssets({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      code: req.query.code as string,
      issuer: req.query.issuer as string,
      status: req.query.status as any,
      network: req.query.network as any,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// Get asset by ID
router.get('/:id', async (req, res, next) => {
  try {
    const asset = await assetRegistry.getAssetDetails(req.params.id);
    
    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
});

// Register new asset
router.post('/', async (req, res, next) => {
  try {
    const asset = await assetRegistry.registerAsset(req.body);
    
    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
});

// Search assets
router.get('/search/:code', async (req, res, next) => {
  try {
    const network = (req.query.network as string) || 'TESTNET';
    const assets = await assetRegistry.searchAssetsByCode(
      req.params.code,
      network,
      parseInt(req.query.limit as string) || 10
    );
    
    res.json({
      success: true,
      data: assets,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
