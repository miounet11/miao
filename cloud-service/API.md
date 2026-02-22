# API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }  // Optional
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description"
  }
}
```

## Endpoints

### Health Check

#### GET /health
Check service health status.

**Authentication:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "environment": "production",
    "database": "connected",
    "memory": {
      "used": 50,
      "total": 100,
      "unit": "MB"
    }
  }
}
```

---

### Authentication

#### POST /auth/register
Register a new user account.

**Authentication:** None

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "membership": "free",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Errors:**
- `400` - Invalid email or weak password
- `400` - Email already registered

---

#### POST /auth/login
Login to existing account.

**Authentication:** None

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "membership": "free",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Errors:**
- `401` - Invalid email or password

---

### Model Configuration

#### GET /config/models
Get available model configurations.

**Authentication:** Optional (affects available models)

**Query Parameters:**
- `membership` (optional): `free`, `pro`, or `enterprise`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider": "ollama",
      "model": "llama2",
      "api_url": "http://localhost:11434",
      "membership_required": "free",
      "enabled": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "provider": "openai",
      "model": "gpt-4",
      "api_url": "https://api.openai.com/v1",
      "membership_required": "pro",
      "enabled": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "count": 2,
    "membership": "pro"
  }
}
```

**Membership Hierarchy:**
- `free`: Only free models
- `pro`: Free + Pro models
- `enterprise`: All models

---

#### GET /config/models/:id
Get specific model configuration by ID.

**Authentication:** None

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "provider": "ollama",
    "model": "llama2",
    "api_url": "http://localhost:11434",
    "membership_required": "free",
    "enabled": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Model configuration not found

---

### User Profile

#### GET /user/profile
Get current user profile.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "membership": "free",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Not authenticated
- `404` - User not found

---

### User Configuration

#### POST /user/config
Save or update user configuration.

**Authentication:** Required

**Request Body:**
```json
{
  "theme": "dark",
  "fontSize": 14,
  "models": ["gpt-4", "claude-opus-4"],
  "customSettings": {
    "autoSave": true,
    "lineNumbers": true
  }
}
```

**Validation:**
- `fontSize`: 8-32
- All fields are optional

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "theme": "dark",
    "fontSize": 14,
    "models": ["gpt-4", "claude-opus-4"],
    "customSettings": {
      "autoSave": true,
      "lineNumbers": true
    }
  },
  "message": "Configuration saved successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid configuration

---

#### GET /user/config
Get user configuration.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "theme": "dark",
    "fontSize": 14,
    "models": ["gpt-4", "claude-opus-4"]
  }
}
```

If no configuration exists:
```json
{
  "success": true,
  "data": {},
  "message": "No configuration found"
}
```

**Errors:**
- `401` - Not authenticated

---

#### DELETE /user/config
Delete user configuration.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Configuration deleted successfully"
}
```

**Errors:**
- `401` - Not authenticated

---

## Rate Limiting

### General Endpoints
- Window: 15 minutes
- Max Requests: 100

### Authentication Endpoints
- Window: 15 minutes
- Max Requests: 5

Rate limit headers are included in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1640000000
```

When rate limit is exceeded:
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Examples

### cURL Examples

**Register:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

**Get Models (with auth):**
```bash
curl http://localhost:3000/api/v1/config/models \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Save Config:**
```bash
curl -X POST http://localhost:3000/api/v1/user/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark","fontSize":14}'
```

### JavaScript/TypeScript Examples

```typescript
// Register
const response = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});
const data = await response.json();
const token = data.data.token;

// Get models with authentication
const modelsResponse = await fetch('http://localhost:3000/api/v1/config/models', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const models = await modelsResponse.json();

// Save user config
await fetch('http://localhost:3000/api/v1/user/config', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    theme: 'dark',
    fontSize: 14
  })
});
```
