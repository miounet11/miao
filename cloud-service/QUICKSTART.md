# Quick Start Guide

Get Miaoda Cloud Service running in 5 minutes!

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
# 1. Navigate to project directory
cd cloud-service

# 2. Install dependencies
npm install

# 3. Setup environment and database
npm run migrate
npm run seed

# 4. Create .env file
cp .env.example .env

# 5. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and paste it as JWT_SECRET in .env

# 6. Start development server
npm run dev
```

Server will start at `http://localhost:3000`

## Quick Test

### 1. Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### 2. Register User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

Save the token from the response!

### 3. Get Models
```bash
curl http://localhost:3000/api/v1/config/models \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Save Config
```bash
curl -X POST http://localhost:3000/api/v1/user/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark","fontSize":14}'
```

## Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database with default data
npm run lint         # Lint code
npm run format       # Format code with Prettier
```

## Project Structure

```
cloud-service/
├── src/
│   ├── server.ts              # Entry point
│   ├── app.ts                 # Express app
│   ├── config/                # Configuration
│   ├── routes/                # API routes
│   ├── middleware/            # Middleware
│   ├── services/              # Business logic
│   ├── models/                # Database models
│   └── utils/                 # Utilities
├── migrations/                # Database migrations
├── seeds/                     # Seed data
├── tests/                     # Test files
└── scripts/                   # Utility scripts
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/health` | Health check | No |
| POST | `/api/v1/auth/register` | Register user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| GET | `/api/v1/config/models` | Get models | Optional |
| GET | `/api/v1/user/profile` | Get profile | Yes |
| POST | `/api/v1/user/config` | Save config | Yes |
| GET | `/api/v1/user/config` | Get config | Yes |

## Default Models

### Free Tier
- Ollama: llama2, codellama, mistral
- DeepSeek: deepseek-coder, deepseek-chat

### Pro Tier
- OpenAI: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- Anthropic: claude-opus-4, claude-sonnet-4, claude-haiku-4

### Enterprise Tier
- Azure OpenAI, AWS Bedrock, Google Gemini

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | Database path | `./data/miaoda.db` |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRY` | Token expiration | `7d` |
| `CORS_ORIGIN` | Allowed origins | `*` |

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

### Database errors
```bash
# Reset database
rm data/miaoda.db
npm run migrate
npm run seed
```

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Read [API.md](./API.md) for detailed API documentation
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
3. Customize model configurations in database
4. Implement additional features

## Support

- Documentation: See README.md, API.md, DEPLOYMENT.md
- Issues: Open a GitHub issue
- Tests: Run `npm test` to verify everything works

## Security Notes

- Change `JWT_SECRET` in production
- Use HTTPS in production
- Configure proper `CORS_ORIGIN`
- Keep dependencies updated: `npm audit`

---

**Happy coding!** 🚀
