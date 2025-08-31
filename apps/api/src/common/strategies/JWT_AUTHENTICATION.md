# JWT Authentication System

This document explains the complete JWT authentication system with token validation, blacklist checking, and user context attachment.

## 🏗️ **Architecture Overview**

The JWT authentication system consists of several components:

1. **JwtStrategy** - Validates JWT tokens and checks blacklist
2. **JwtAuthGuard** - Protects routes and handles authentication
3. **TokenBlacklistService** - Manages revoked tokens using Redis
4. **Public Decorator** - Marks routes as public (no auth required)
5. **CurrentUser Decorator** - Extracts user from request

## 🔧 **Components**

### **1. JWT Strategy (`jwt.strategy.ts`)**

Validates JWT tokens from the `Authorization: Bearer` header:

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(request: Request, payload: JwtPayload): Promise<JwtPayload> {
    // 1. Extract token from request
    const token = this.extractTokenFromRequest(request);
    
    // 2. Check if token is blacklisted
    const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    
    // 3. Validate payload structure
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    // 4. Return user payload (attached to request)
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### **2. JWT Auth Guard (`jwt-auth.guard.ts`)**

Protects routes and handles authentication:

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip authentication
    }

    return super.canActivate(context);
  }
}
```

### **3. Token Blacklist Service (`token-blacklist.service.ts`)**

Manages revoked tokens using Redis:

```typescript
@Injectable()
export class TokenBlacklistService {
  // Add token to blacklist
  async blacklistToken(token: string, userId?: string): Promise<void>
  
  // Check if token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean>
  
  // Remove token from blacklist
  async removeFromBlacklist(token: string): Promise<void>
  
  // Get blacklist statistics
  async getBlacklistStats(): Promise<{ total: number; keys: string[] }>
}
```

## 🚀 **Usage Examples**

### **1. Public Routes (No Authentication Required)**

```typescript
@Post('/auth/login')
@Public() // Mark as public
@UseGuards(JwtAuthGuard)
async login(@Body() payload: LoginDto) {
  return await this.authService.login(payload);
}

@Post('/auth/register')
@Public() // Mark as public
@UseGuards(JwtAuthGuard)
async register(@Body() payload: RegisterDto) {
  return await this.authService.register(payload);
}
```

### **2. Protected Routes (Authentication Required)**

```typescript
@Get('/users/profile')
@UseGuards(JwtAuthGuard) // Require authentication
async getProfile(@CurrentUser() user: JwtPayload) {
  return {
    id: user.sub,
    email: user.email,
    role: user.role
  };
}
```

### **3. Controller-Level Protection**

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard) // All routes in this controller require auth
export class UserController {
  
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    // Automatically protected
  }
  
  @Get('settings')
  async getSettings(@CurrentUser() user: JwtPayload) {
    // Automatically protected
  }
}
```

## 🔐 **Authentication Flow**

### **1. Login Process**

```typescript
// 1. User sends credentials
POST /v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// 2. Server validates credentials and returns token
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessTokenExp": 1642234567890
}
```

### **2. Protected Request**

```typescript
// 1. Client includes token in header
GET /v1/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 2. JWT Strategy validates token
// 3. TokenBlacklistService checks if token is revoked
// 4. User payload is attached to request
// 5. Route handler receives user context
```

### **3. Logout Process**

```typescript
// 1. User sends logout request with token
POST /v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 2. Server blacklists the token
// 3. Token is stored in Redis with expiry
// 4. Future requests with this token are rejected
```

## 📋 **API Endpoints**

### **Authentication Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/v1/auth/register` | Register new user | ❌ |
| POST | `/v1/auth/login` | Login user | ❌ |
| POST | `/v1/auth/logout` | Logout user | ✅ |
| POST | `/v1/auth/refresh` | Refresh access token | ❌ |

### **Protected Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/v1/users/profile` | Get user profile | ✅ |
| GET | `/v1/users/protected` | Protected route example | ✅ |

## 🛡️ **Security Features**

### **1. Token Validation**

- ✅ **Signature Verification** - Ensures token wasn't tampered with
- ✅ **Expiration Check** - Rejects expired tokens
- ✅ **Payload Validation** - Verifies required fields exist
- ✅ **Blacklist Check** - Rejects revoked tokens

### **2. Token Blacklisting**

- ✅ **Redis Storage** - Fast, persistent storage
- ✅ **Automatic Expiry** - Tokens expire after 24 hours
- ✅ **Hash Storage** - Tokens are hashed, not stored in plain text
- ✅ **Statistics** - Monitor blacklist usage

### **3. Error Handling**

- ✅ **401 Unauthorized** - Invalid/missing token
- ✅ **401 Unauthorized** - Blacklisted token
- ✅ **401 Unauthorized** - Expired token
- ✅ **500 Internal Server Error** - Redis connection issues

## 🔧 **Configuration**

### **Environment Variables**

```env
# JWT Configuration
JWT_ACCESS_SECRET=your_jwt_secret_here
JWT_ACCESS_TTL=30m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_TTL=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### **Module Setup**

```typescript
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_ACCESS_TTL', '30m')}
      })
    })
  ],
  providers: [
    JwtStrategy,
    TokenBlacklistService,
    JwtAuthGuard
  ],
  exports: [TokenBlacklistService]
})
export class AuthModule {}
```

## 🧪 **Testing Examples**

### **1. Login and Get Token**

```bash
# Login
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessTokenExp": 1642234567890
}
```

### **2. Access Protected Route**

```bash
# Get user profile
curl -X GET http://localhost:3000/v1/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "id": "user123",
  "email": "user@example.com",
  "role": "USER",
  "message": "Profile retrieved successfully"
}
```

### **3. Logout (Blacklist Token)**

```bash
# Logout
curl -X POST http://localhost:3000/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "message": "Logged out successfully"
}

# Try to use the same token again (should fail)
curl -X GET http://localhost:3000/v1/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "statusCode": 401,
  "message": "Token has been revoked",
  "path": "/v1/users/profile",
  "timeStamp": "2024-01-15T10:00:00.000Z"
}
```

## 🎯 **Best Practices**

1. **Always use HTTPS** in production
2. **Set appropriate token expiry times**
3. **Use strong JWT secrets**
4. **Monitor blacklist statistics**
5. **Implement rate limiting**
6. **Log authentication events**
7. **Use refresh tokens for long sessions**
8. **Implement token rotation**

This JWT authentication system provides enterprise-grade security with token validation, blacklist checking, and comprehensive error handling! 🎉 