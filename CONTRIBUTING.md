# Contributing to Soroban Liquidity Router

Thank you for your interest in contributing to the Soroban Liquidity Router! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and professional
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Rust and Cargo (for smart contracts)
- PostgreSQL 16+ and Redis 7+
- Git

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Soroban-Liquidity-Router.git
   cd Soroban-Liquidity-Router
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start infrastructure:
   ```bash
   npm run docker:up
   ```

6. Run migrations:
   ```bash
   npm run migrate:dev
   ```

7. Start development servers:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes, following our coding standards

3. Write or update tests

4. Run tests and linting:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```

7. Open a Pull Request on GitHub

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Define explicit types, avoid `any`
- Use interfaces for object shapes
- Document complex functions with JSDoc

### Code Style

- Follow Prettier configuration (`.prettierrc`)
- Use meaningful variable and function names
- Keep functions small and focused
- Prefer functional programming patterns
- Use async/await over callbacks

### Testing

- Write unit tests for business logic
- Write integration tests for API endpoints
- Aim for >80% code coverage
- Test edge cases and error conditions
- Use descriptive test names

Example test structure:
```typescript
describe('RouteDiscovery', () => {
  describe('findRoutes', () => {
    it('should find direct route between assets', async () => {
      // Arrange
      const input = createTestAsset('USDC');
      const output = createTestAsset('XLM');
      
      // Act
      const routes = await routeDiscovery.findRoutes(input, output);
      
      // Assert
      expect(routes).toHaveLength(1);
      expect(routes[0].hopCount).toBe(1);
    });

    it('should reject routes exceeding max hops', async () => {
      // Test implementation
    });
  });
});
```

### Documentation

- Update README.md for user-facing changes
- Update API documentation for API changes
- Add inline comments for complex logic
- Document public APIs with JSDoc
- Include examples in documentation

### Smart Contracts (Rust)

- Follow Soroban best practices
- Use safe math operations
- Implement reentrancy guards
- Add comprehensive tests
- Document public functions

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts with main
- [ ] Commit messages follow conventions

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Reviewed my own code
```

### Review Process

1. Automated CI checks must pass
2. At least one maintainer approval required
3. Address review feedback
4. Maintainer will merge when approved

## Project Structure

```
soroban-liquidity-router/
├── apps/
│   ├── api/              # REST API server
│   ├── dashboard/        # Analytics dashboard
│   └── worker/           # Background workers
├── packages/
│   ├── contracts/        # Soroban contracts
│   ├── database/         # Database schema
│   ├── sdk/              # TypeScript SDK
│   ├── routing-engine/   # Core routing logic
│   ├── types/            # Shared types
│   └── utils/            # Shared utilities
└── docs/                 # Documentation
```

## Testing Guidelines

### Running Tests

```bash
# All tests
npm test

# Specific package
cd packages/routing-engine && npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Contract tests
npm run contracts:test
```

### Writing Tests

- Use Jest for JavaScript/TypeScript
- Use Cargo test for Rust contracts
- Mock external dependencies
- Test success and failure cases
- Test boundary conditions

## Debugging

### API Server

```bash
# Start with debug logging
LOG_LEVEL=debug npm run dev
```

### Database

```bash
# View database
npm run db:studio

# Check migrations
cd packages/database && prisma migrate status
```

### Contracts

```bash
# Run contract tests with output
cd packages/contracts && cargo test -- --nocapture
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000
```

### Database Connection Issues

```bash
# Restart database
npm run docker:down
npm run docker:up
```

### Type Errors

```bash
# Rebuild type packages
cd packages/types && npm run build
```

## Release Process

Maintainers only:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release tag
4. GitHub Actions handles deployment

## Security

### Reporting Vulnerabilities

**Do not** open public issues for security vulnerabilities. Email security@soroban-router.dev with:

- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user input
- Sanitize data before database queries
- Use parameterized queries
- Implement rate limiting
- Follow principle of least privilege

## Questions?

- **General Questions**: Open a Discussion on GitHub
- **Bug Reports**: Open an Issue
- **Feature Requests**: Open an Issue with "Feature Request" label
- **Security**: Email security@soroban-router.dev
- **Chat**: Join our Discord community

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Credited in release notes
- Invited to join the contributors team

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to Soroban Liquidity Router! 🚀
