import {
  prisma,
  PaginationParams,
  calculatePagination,
  buildPaginationMetadata,
  formatAssetIdentifier,
} from '@soroban-router/database';
import {
  Asset,
  AssetDetails,
  AssetSearchFilters,
  AssetAllowlistEntry,
  IssuerAllowlistEntry,
  PaginatedResponse,
  NotFoundError,
  ValidationError,
  AssetError,
  UnsupportedAssetError,
  RestrictedAssetError,
} from '@soroban-router/types';
import {
  createLogger,
  isValidAssetCode,
  isValidStellarAddress,
  parseAssetIdentifier,
  validateRequired,
} from '@soroban-router/utils';

const logger = createLogger('AssetRegistry');

/**
 * Asset Registry Service
 * Manages supported assets, issuers, and asset allowlists
 */
export class AssetRegistry {
  /**
   * Register a new asset
   */
  async registerAsset(data: {
    code: string;
    issuer: string;
    network: 'MAINNET' | 'TESTNET' | 'FUTURENET';
    decimals?: number;
    name?: string;
    description?: string;
    authorizationRequired?: boolean;
    clawbackEnabled?: boolean;
    issuerInfo?: {
      name?: string;
      website?: string;
      verified?: boolean;
    };
  }): Promise<Asset> {
    // Validation
    if (!isValidAssetCode(data.code)) {
      throw new ValidationError(`Invalid asset code: ${data.code}`);
    }

    if (data.issuer !== 'native' && !isValidStellarAddress(data.issuer)) {
      throw new ValidationError(`Invalid issuer address: ${data.issuer}`);
    }

    // Check if asset already exists
    const existing = await prisma.asset.findFirst({
      where: {
        code: data.code,
        issuer: data.issuer,
        network: data.network,
      },
    });

    if (existing) {
      throw new ValidationError(
        `Asset ${formatAssetIdentifier(data.code, data.issuer)} already registered`
      );
    }

    // Determine asset type
    let assetType: 'NATIVE' | 'CREDIT_ALPHANUM4' | 'CREDIT_ALPHANUM12' | 'CONTRACT';
    if (data.code === 'XLM' && data.issuer === 'native') {
      assetType = 'NATIVE';
    } else if (data.code.length <= 4) {
      assetType = 'CREDIT_ALPHANUM4';
    } else {
      assetType = 'CREDIT_ALPHANUM12';
    }

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        code: data.code,
        issuer: data.issuer,
        type: assetType,
        network: data.network,
        decimals: data.decimals || 7,
        name: data.name,
        description: data.description,
        authorizationRequired: data.authorizationRequired || false,
        clawbackEnabled: data.clawbackEnabled || false,
        issuerName: data.issuerInfo?.name,
        issuerWebsite: data.issuerInfo?.website,
        issuerVerified: data.issuerInfo?.verified || false,
        status: 'ACTIVE',
      },
    });

    logger.info('Asset registered', {
      assetId: asset.id,
      code: asset.code,
      issuer: asset.issuer,
    });

    return asset as Asset;
  }

  /**
   * Get asset by ID
   */
  async getAsset(id: string): Promise<Asset> {
    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundError('Asset', id);
    }

    return asset as Asset;
  }

  /**
   * Get asset by code and issuer
   */
  async getAssetByIdentifier(code: string, issuer: string, network: string): Promise<Asset> {
    const asset = await prisma.asset.findFirst({
      where: {
        code,
        issuer,
        network: network as any,
      },
    });

    if (!asset) {
      throw new NotFoundError(
        'Asset',
        formatAssetIdentifier(code, issuer)
      );
    }

    return asset as Asset;
  }

  /**
   * Resolve asset from identifier string
   */
  async resolveAsset(identifier: string, network: string): Promise<Asset> {
    const { code, issuer } = parseAssetIdentifier(identifier);
    return this.getAssetByIdentifier(code, issuer, network);
  }

  /**
   * Get asset details with related data
   */
  async getAssetDetails(id: string): Promise<AssetDetails> {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        basePairs: {
          include: {
            quoteAsset: true,
          },
        },
        quotePairs: {
          include: {
            baseAsset: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset', id);
    }

    return {
      ...asset,
      pairs: [...asset.basePairs, ...asset.quotePairs],
    } as any;
  }

  /**
   * List assets with pagination and filters
   */
  async listAssets(
    params: PaginationParams & AssetSearchFilters
  ): Promise<PaginatedResponse<Asset>> {
    const { skip, take } = calculatePagination(params);

    // Build where clause
    const where: any = {};

    if (params.code) {
      where.code = { contains: params.code, mode: 'insensitive' };
    }

    if (params.issuer) {
      where.issuer = params.issuer;
    }

    if (params.network) {
      where.network = params.network;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.verified !== undefined) {
      where.issuerVerified = params.verified;
    }

    if (params.riskLevel) {
      where.riskLevel = params.riskLevel;
    }

    if (params.authorizationRequired !== undefined) {
      where.authorizationRequired = params.authorizationRequired;
    }

    if (params.clawbackEnabled !== undefined) {
      where.clawbackEnabled = params.clawbackEnabled;
    }

    // Query
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where }),
    ]);

    const metadata = buildPaginationMetadata(
      total,
      params.page || 1,
      take
    );

    return {
      data: assets as Asset[],
      pagination: metadata,
    };
  }

  /**
   * Update asset information
   */
  async updateAsset(
    id: string,
    data: Partial<{
      status: string;
      name: string;
      description: string;
      riskLevel: string;
      riskFactors: string[];
      issuerVerified: boolean;
    }>
  ): Promise<Asset> {
    const asset = await prisma.asset.update({
      where: { id },
      data: data as any,
    });

    logger.info('Asset updated', { assetId: id, changes: Object.keys(data) });

    return asset as Asset;
  }

  /**
   * Check if asset is supported and active
   */
  async isAssetSupported(id: string): Promise<boolean> {
    const asset = await prisma.asset.findUnique({
      where: { id },
      select: { status: true },
    });

    return asset?.status === 'ACTIVE';
  }

  /**
   * Check if asset is in application allowlist
   */
  async isAssetAllowed(assetId: string, applicationId: string): Promise<boolean> {
    const entry = await prisma.assetAllowlist.findUnique({
      where: {
        assetId_applicationId: {
          assetId,
          applicationId,
        },
      },
    });

    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Add asset to application allowlist
   */
  async addToAllowlist(data: {
    assetId: string;
    applicationId: string;
    addedBy: string;
    reason?: string;
    expiresAt?: Date;
  }): Promise<AssetAllowlistEntry> {
    // Verify asset exists
    await this.getAsset(data.assetId);

    const entry = await prisma.assetAllowlist.create({
      data: data as any,
    });

    logger.info('Asset added to allowlist', {
      assetId: data.assetId,
      applicationId: data.applicationId,
    });

    return entry as AssetAllowlistEntry;
  }

  /**
   * Remove asset from application allowlist
   */
  async removeFromAllowlist(assetId: string, applicationId: string): Promise<void> {
    await prisma.assetAllowlist.delete({
      where: {
        assetId_applicationId: {
          assetId,
          applicationId,
        },
      },
    });

    logger.info('Asset removed from allowlist', { assetId, applicationId });
  }

  /**
   * Check if issuer is in application allowlist
   */
  async isIssuerAllowed(issuerAddress: string, applicationId: string): Promise<boolean> {
    const entry = await prisma.issuerAllowlist.findUnique({
      where: {
        issuerAddress_applicationId: {
          issuerAddress,
          applicationId,
        },
      },
    });

    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Add issuer to application allowlist
   */
  async addIssuerToAllowlist(data: {
    issuerAddress: string;
    applicationId: string;
    addedBy: string;
    trustLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    reason?: string;
    expiresAt?: Date;
  }): Promise<IssuerAllowlistEntry> {
    if (!isValidStellarAddress(data.issuerAddress)) {
      throw new ValidationError(`Invalid issuer address: ${data.issuerAddress}`);
    }

    const entry = await prisma.issuerAllowlist.create({
      data: data as any,
    });

    logger.info('Issuer added to allowlist', {
      issuerAddress: data.issuerAddress,
      applicationId: data.applicationId,
    });

    return entry as IssuerAllowlistEntry;
  }

  /**
   * Validate asset for routing
   */
  async validateAssetForRouting(
    assetId: string,
    applicationId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const asset = await this.getAsset(assetId);

    // Check status
    if (asset.status !== 'ACTIVE') {
      return { valid: false, reason: `Asset status is ${asset.status}` };
    }

    // Check if restricted
    if (asset.status === 'RESTRICTED') {
      return { valid: false, reason: 'Asset is restricted' };
    }

    // Check application allowlist if specified
    if (applicationId) {
      const isAllowed = await this.isAssetAllowed(assetId, applicationId);
      if (!isAllowed) {
        const issuerAllowed = await this.isIssuerAllowed(asset.issuer, applicationId);
        if (!issuerAllowed) {
          return {
            valid: false,
            reason: 'Asset not in application allowlist',
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get assets by issuer
   */
  async getAssetsByIssuer(issuer: string, network: string): Promise<Asset[]> {
    const assets = await prisma.asset.findMany({
      where: {
        issuer,
        network: network as any,
        status: 'ACTIVE',
      },
    });

    return assets as Asset[];
  }

  /**
   * Search assets by code
   */
  async searchAssetsByCode(code: string, network: string, limit: number = 10): Promise<Asset[]> {
    const assets = await prisma.asset.findMany({
      where: {
        code: {
          contains: code,
          mode: 'insensitive',
        },
        network: network as any,
        status: 'ACTIVE',
      },
      take: limit,
      orderBy: [{ issuerVerified: 'desc' }, { createdAt: 'desc' }],
    });

    return assets as Asset[];
  }

  /**
   * Get asset statistics
   */
  async getAssetStatistics(assetId: string, days: number = 30): Promise<{
    totalVolume: string;
    totalTrades: number;
    uniquePairs: number;
    avgSlippage: string;
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // This would aggregate from execution and analytics tables
    // Simplified for now
    return {
      totalVolume: '0',
      totalTrades: 0,
      uniquePairs: 0,
      avgSlippage: '0',
    };
  }
}
