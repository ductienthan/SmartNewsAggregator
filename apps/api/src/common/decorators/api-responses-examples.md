# API Responses Optimization

This document shows different approaches to eliminate boilerplate API response decorators.

## 🎯 **The Problem**

Having to declare `@ApiInternalServerErrorResponse` and other common responses on every endpoint creates unnecessary boilerplate:

```typescript
// ❌ Before - Lots of boilerplate
@Post('/register')
@ApiOperation({ summary: 'Register a new user' })
@ApiBody({ type: RegisterUser })
@ApiResponse({ status: 201, type: AccessTokenResponse, description: 'User registered successfully' })
@ApiBadRequestResponse({ description: 'Invalid input data or validation errors' })
@ApiConflictResponse({ description: 'Email already registered' })
@ApiInternalServerErrorResponse({ description: 'Internal server error during registration' })
async registerUser(@Body() payload: RegisterUser) {
  return await this.authService.registerUser(payload);
}
```

## ✅ **Solutions**

### **Option 1: Controller-Level Default Responses**

Add common responses at the controller level:

```typescript
@ApiTags('Authentication')
@ApiResponse({ status: 500, description: 'Internal server error' })
@Controller('auth')
export class AuthController {
  // All endpoints inherit the 500 response
}
```

### **Option 2: Custom Response Decorators (Recommended)**

Use predefined decorators for common response patterns:

```typescript
// ✅ After - Clean and reusable
@Post('/register')
@ApiOperation({ summary: 'Register a new user' })
@ApiBody({ type: RegisterUser })
@ApiCreateResponses(AccessTokenResponse)
async registerUser(@Body() payload: RegisterUser) {
  return await this.authService.registerUser(payload);
}

@Post('/login')
@ApiOperation({ summary: 'Login user' })
@ApiBody({ type: LoginDto })
@ApiAuthResponses()
async login(@Body() payload: LoginDto) {
  return await this.authService.login(payload);
}
```

## 📦 **Available Response Decorators**

### **Predefined Decorators**

```typescript
// For authentication endpoints
@ApiAuthResponses(AccessTokenResponse)
// Includes: 200 (success with AccessTokenResponse), 400 (bad request), 401 (unauthorized), 500 (internal error)

// For resource creation
@ApiCreateResponses(UserDto)
// Includes: 201 (created), 400 (bad request), 409 (conflict), 500 (internal error)

// For resource updates
@ApiUpdateResponses()
// Includes: 200 (success), 400 (bad request), 404 (not found), 500 (internal error)

// For resource deletion
@ApiDeleteResponses()
// Includes: 200 (success), 404 (not found), 500 (internal error)

// For resource retrieval
@ApiGetResponses(UserDto)
// Includes: 200 (success), 404 (not found), 500 (internal error)
```

### **Custom Response Decorators**

```typescript
// Custom responses for specific use cases
@ApiResponses({
  success: { status: 200, type: UserProfileDto, description: 'Profile updated' },
  badRequest: 'Invalid profile data',
  notFound: 'User not found',
  internalServerError: 'Profile update failed'
})
async updateProfile(@Body() payload: UpdateProfileDto) {
  return await this.userService.updateProfile(payload);
}
```

## 🔧 **Implementation Examples**

### **User Controller**

```typescript
@ApiTags('Users')
@Controller('users')
export class UserController {
  
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiGetResponses(UserDto)
  async getUser(@Param('id') id: string) {
    return await this.userService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreateResponses(UserDto)
  async createUser(@Body() payload: CreateUserDto) {
    return await this.userService.create(payload);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiBody({ type: UpdateUserDto })
  @ApiUpdateResponses()
  async updateUser(@Param('id') id: string, @Body() payload: UpdateUserDto) {
    return await this.userService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiDeleteResponses()
  async deleteUser(@Param('id') id: string) {
    return await this.userService.delete(id);
  }
}
```

### **Article Controller**

```typescript
@ApiTags('Articles')
@Controller('articles')
export class ArticleController {
  
  @Get()
  @ApiOperation({ summary: 'Get all articles' })
  @ApiGetResponses([ArticleDto])
  async getArticles(@Query() filters: ArticleFiltersDto) {
    return await this.articleService.findAll(filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create article' })
  @ApiBody({ type: CreateArticleDto })
  @ApiCreateResponses(ArticleDto)
  async createArticle(@Body() payload: CreateArticleDto) {
    return await this.articleService.create(payload);
  }
}
```

## 📊 **Code Reduction Comparison**

| Approach | Before | After | Reduction |
|----------|--------|-------|-----------|
| Individual Decorators | 6-8 lines per endpoint | 1 line per endpoint | **85%** |
| Controller-Level | 6-8 lines per endpoint | 1 line per controller | **90%** |
| Custom Decorators | 6-8 lines per endpoint | 1 line per endpoint | **85%** |

## 🎯 **Best Practices**

1. **Use predefined decorators** for common operations (CRUD, auth)
2. **Create custom decorators** for domain-specific responses
3. **Combine with validation decorators** for complete endpoint definition
4. **Keep descriptions consistent** across similar operations
5. **Use TypeScript types** for better documentation

## 🔍 **Complete Example**

```typescript
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: RegisterUserDto })
  @ApiCreateResponses(AccessTokenResponse)
  @WithAuthValidation()
  async register(@Body() payload: RegisterUserDto) {
    return await this.authService.register(payload);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiAuthResponses(AccessTokenResponse)
  @WithAuthValidation()
  async login(@Body() payload: LoginDto) {
    return await this.authService.login(payload);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiAuthResponses(AccessTokenResponse)
  async refresh(@Body() payload: RefreshTokenDto) {
    return await this.authService.refresh(payload);
  }
}
```

This approach eliminates boilerplate while maintaining comprehensive API documentation! 🎉 