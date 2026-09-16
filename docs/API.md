# API Reference

> Complete REST API documentation for Soroban Liquidity Router

**Base URL (Testnet)**: `https://api-testnet.soroban-router.dev`  
**Base URL (Mainnet)**: `https://api.soroban-router.dev`

## Authentication

All API requests require authentication using an API key.

### API Key Header

```http
Authorization: Bearer YOUR_API_KEY
```

### Rate Limits

| Tier | Requests/Min | Execute/Min |
|------|--------------|-------------|
| Free | 60 | 10 |
| Pro | 300 | 50 |
| Enterprise | Custom | Custom |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time until limit resets (Unix timestamp)

## Endpoints

### Assets

#### List Assets

```http
GET /api/v1/assets
```

Query Parameters:
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 50, max: 100)
- `code` (string): Filter by asset code
- `issuer` (string): Filter by issuer address
- `status` (string): Filter by status (active, deprecated, restricted)
- `verified` (boolean): Filter by verification status

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "USDC",
      "issuer": "GBBD...",
      "type": "credit_alphanum4",
      "network": "testnet",
      "status": "active",
      "decimals": 7,
      "authorizationRequired": false,
      "clawbackEnabled": false,
      "createdAt": "2026-09-16T00:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalPages": 10,
    "totalItems": 500
  }
}
```

#### Get Asset Details

```http
GET /api/v1/assets/:id
```

Response includes full asset details, issuer info, market data, and available pairs.

### Routes

#### Discover Routes

```http
POST /api/v1/routes/discover
```

Request Body:
```json
{
  "inputAsset": "USDC:GBBD...",
  "outputAsset": "XLM:native",
  "inputAmount": "1000",
  "maxHops": 3,
  "policyId": "uuid" // optional
}
```

Response:
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "uuid",
        "inputAsset": "uuid",
        "outputAsset": "uuid",
        "steps": [
          {
            "stepNumber": 1,
            "sourceId": "uuid",
            "sourceName": "Stellar DEX",
            "inputAsset": "uuid",
            "outputAsset": "uuid",
            "expectedOutput": "1020.50",
            "fee": "0.30",
            "priceImpact": "0.001"
          }
        ],
        "hopCount": 1,
        "dataFreshness": "2026-09-16T12:00:00Z"
      }
    ],
    "totalRoutesFound": 5,
    "searchCompletedIn": 250
  }
}
```

### Quotes

#### Get Quote

```http
POST /api/v1/quotes
```

Request Body:
```json
{
  "routeId": "uuid",
  "quoteType": "firm",
  "maxSlippage": "0.01",
  "validitySeconds": 60
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "routeId": "uuid",
    "quoteType": "firm",
    "inputAmount": "1000",
    "expectedOutput": "1020.50",
    "minimumOutput": "1010.30",
    "effectiveRate": "1.0205",
    "totalFees": "10.50",
    "estimatedSlippage": "0.009",
    "validUntil": "2026-09-16T12:01:00Z",
    "createdAt": "2026-09-16T12:00:00Z"
  }
}
```

### Execution

#### Simulate Transaction

```http
POST /api/v1/routes/simulate
```

Request Body:
```json
{
  "quoteId": "uuid",
  "signerAddress": "GABC..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "expectedOutput": "1020.50",
    "estimatedFees": "10.50",
    "policyCompliant": true,
    "checks": [
      {
        "name": "Balance Check",
        "passed": true
      }
    ],
    "warnings": []
  }
}
```

#### Execute Route

```http
POST /api/v1/routes/execute
```

Request Body:
```json
{
  "quoteId": "uuid",
  "idempotencyKey": "unique-key",
  "webhookUrl": "https://your-app.com/webhook" // optional
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "submitted",
    "transactionId": "hash",
    "expectedOutput": "1020.50",
    "createdAt": "2026-09-16T12:00:00Z"
  }
}
```

#### Get Execution Status

```http
GET /api/v1/executions/:id
```

Response includes full execution details, actual output, slippage, and failure information if applicable.

### Policies

#### Create Policy

```http
POST /api/v1/policies
```

#### Update Policy

```http
PUT /api/v1/policies/:id
```

#### Get Policy

```http
GET /api/v1/policies/:id
```

### Analytics

#### Platform Metrics

```http
GET /api/v1/analytics/platform?period=24h
```

#### Route Performance

```http
GET /api/v1/analytics/routes?period=7d
```

## Error Responses

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input amount",
    "details": {
      "field": "inputAmount"
    }
  }
}
```

### Error Codes

- `AUTHENTICATION_ERROR` (401): Invalid or missing API key
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `VALIDATION_ERROR` (400): Invalid request parameters
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Server error

## Webhooks

Configure webhook URL in execution request to receive status updates.

### Webhook Payload

```json
{
  "event": "execution.completed",
  "timestamp": "2026-09-16T12:00:00Z",
  "data": {
    "executionId": "uuid",
    "status": "confirmed",
    "actualOutput": "1018.75"
  }
}
```

### Webhook Events

- `execution.submitted`
- `execution.confirmed`
- `execution.failed`
- `quote.expiring`

## SDKs

Official SDKs available:
- **TypeScript/JavaScript**: `npm install @soroban-router/sdk`
- More coming soon

## Support

- Documentation: https://docs.soroban-router.dev
- API Status: https://status.soroban-router.dev
- Support: support@soroban-router.dev
