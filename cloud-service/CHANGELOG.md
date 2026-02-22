# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release of Miaoda Cloud Service
- RESTful API with versioning (v1)
- JWT-based authentication system
- User registration and login endpoints
- Model configuration management
- User profile and configuration endpoints
- SQLite database with migrations
- Rate limiting for all endpoints
- Comprehensive security features:
  - Helmet.js for security headers
  - CORS configuration
  - bcrypt password hashing
  - Input validation with Zod
  - SQL injection prevention
- Request logging with Winston
- Error handling middleware
- Health check endpoint
- Database seeding with default models
- Comprehensive test suite (Jest)
- Docker support with multi-stage builds
- Docker Compose configuration
- Production-ready deployment setup
- API documentation
- Deployment guide
- TypeScript support throughout
- ESLint and Prettier configuration

### Security
- JWT tokens with 7-day expiry
- Password strength validation
- Rate limiting (5 req/15min for auth, 100 req/15min for general)
- Parameterized SQL queries
- Environment variable validation

### Models
- Free tier: Ollama (llama2, codellama, mistral), DeepSeek
- Pro tier: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude Opus/Sonnet/Haiku)
- Enterprise tier: Azure OpenAI, AWS Bedrock, Google Gemini

### Infrastructure
- Node.js + Express
- TypeScript
- SQLite (production-ready, easy migration to PostgreSQL)
- Better-sqlite3 for performance
- Graceful shutdown handling
- Process signal handling
- Health monitoring

### Developer Experience
- Hot reload with nodemon
- Comprehensive test coverage
- Migration and seed scripts
- Clear project structure
- Detailed documentation
- Example requests and responses

## [Unreleased]

### Planned
- PostgreSQL support for production scale
- Redis caching layer
- WebSocket support for real-time updates
- Admin dashboard
- Usage analytics
- API key management
- Webhook support
- Email verification
- Password reset functionality
- Two-factor authentication
- OAuth integration (Google, GitHub)
- API versioning (v2)
- GraphQL endpoint
- Swagger/OpenAPI documentation
- Prometheus metrics
- Distributed tracing
