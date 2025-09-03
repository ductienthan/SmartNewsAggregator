# Auto Error Handling Decorators

This directory contains decorators that automatically handle errors, validation, and logging without requiring manual try-catch blocks or validation code in your methods.

## 🎯 **Benefits**

- **Zero boilerplate**: No more try-catch blocks in every method
- **Automatic validation**: Built-in email, password, and required field validation
- **Consistent logging**: Automatic operation logging with user context
- **Type safety**: Full TypeScript support with proper error typing
- **Reusable**: Specialized decorators for common use cases

## 📦 **Available Decorators**

### Service Decorators (`auto-error-handler.decorator.ts`)

#### `@AutoErrorHandler(options)`
Generic error handling decorator for service methods.

```typescript
@AutoErrorHandler({
  context: 'User operation',
  logContext: 'UserService',
  includeUserId: true,
  userIdExtractor: (args) => args[0]?.userId
})
async updateUser(userId: string, data: any) {
  // Your business logic here - no try-catch needed!
  return await this.prisma.user.update({ where: { id: userId }, data });
}
```

#### `@WithAuthErrorHandling()`
Specialized decorator for authentication operations.

```typescript
@WithAuthErrorHandling()
async registerUser(payload: RegisterUser) {
  // Automatically extracts email for logging
  // Handles auth-specific errors
  return await this.createUser(payload);
}
```

#### `@WithDatabaseErrorHandling()`
Specialized decorator for database operations.

```typescript
@WithDatabaseErrorHandling()
async findUser(id: string) {
  // Handles Prisma errors automatically
  return await this.prisma.user.findUnique({ where: { id } });
}
```

### Controller Decorators (`auto-controller.decorator.ts`)

#### `@AutoController(options)`
Generic controller decorator with validation and logging.

```typescript
@AutoController({
  validateEmail: true,
  validateRequired: ['name', 'email'],
  logContext: 'UserController',
  includeUserId: true,
  userIdExtractor: (args) => args[0]?.email
})
async createUser(@Body() payload: CreateUserDto) {
  // Automatic validation and logging
  return await this.userService.createUser(payload);
}
```

#### `@WithAuthValidation()`
Specialized decorator for authentication endpoints.

```typescript
@Post('/login')
@WithAuthValidation()
async login(@Body() payload: LoginDto) {
  // Automatically validates email and password
  // Logs with user context
  return await this.authService.login(payload);
}
```

#### `@WithUserValidation()`
Specialized decorator for user operations.

```typescript
@Post('/profile')
@WithUserValidation()
async updateProfile(@Body() payload: UpdateProfileDto) {
  // Validates email and required fields
  return await this.userService.updateProfile(payload);
}
```

## 🚀 **Usage Examples**

### Before (Manual Error Handling)
```typescript
async registerUser(payload: RegisterUser): Promise<AccessTokenResponse> {
  try {
    // Validate email
    if (!payload.email || !payload.email.includes('@')) {
      throw new BadRequestException('Invalid email format');
    }
    
    // Validate password
    if (!payload.password || payload.password.length < 6) {
      throw new BadRequestException('Password too short');
    }
    
    this.logger.log(`Registration attempt for: ${payload.email}`);
    
    const result = await this.createUser(payload);
    
    this.logger.log(`User registered: ${payload.email}`);
    return result;
  } catch (error: unknown) {
    this.logger.error(`Registration failed: ${payload.email}`, error);
    
    if (error instanceof HttpException) {
      throw error;
    }
    
    if (error.code?.startsWith('P')) {
      throw new InternalServerErrorException('Database error');
    }
    
    throw new InternalServerErrorException('Unexpected error');
  }
}
```

### After (Decorator-Based)
```typescript
@WithAuthValidation()
async registerUser(payload: RegisterUser): Promise<AccessTokenResponse> {
  // Clean business logic only!
  return await this.createUser(payload);
}
```

### Before (Manual Controller Validation)
```typescript
@Post('/register')
async register(@Body() payload: RegisterUser) {
  // Manual validation
  if (!payload.email || !payload.email.includes('@')) {
    throw new BadRequestException('Invalid email');
  }
  
  if (!payload.password || payload.password.length < 6) {
    throw new BadRequestException('Password too short');
  }
  
  this.logger.log(`Registration attempt: ${payload.email}`);
  
  const result = await this.authService.register(payload);
  
  this.logger.log(`Registration successful: ${payload.email}`);
  return result;
}
```

### After (Decorator-Based)
```typescript
@Post('/register')
@WithAuthValidation()
async register(@Body() payload: RegisterUser) {
  // Automatic validation and logging!
  return await this.authService.register(payload);
}
```

## 🔧 **Custom Decorators**

You can create custom decorators for your specific use cases:

```typescript
// Custom decorator for article operations
export function WithArticleValidation() {
  return AutoController({
    validateRequired: ['title', 'content'],
    logContext: 'ArticleController',
    includeUserId: true,
    userIdExtractor: (args) => args[0]?.authorId
  });
}

// Usage
@Post('/articles')
@WithArticleValidation()
async createArticle(@Body() payload: CreateArticleDto) {
  return await this.articleService.create(payload);
}
```

## 📊 **Code Reduction**

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Service Methods | ~50 lines | ~10 lines | **80%** |
| Controller Methods | ~30 lines | ~5 lines | **83%** |
| Error Handling | Manual | Automatic | **100%** |
| Validation | Manual | Automatic | **100%** |

## 🎯 **Best Practices**

1. **Use specialized decorators** when available (`@WithAuthValidation`, `@WithDatabaseErrorHandling`)
2. **Create custom decorators** for domain-specific operations
3. **Keep business logic clean** - decorators handle the boilerplate
4. **Use consistent naming** for your custom decorators
5. **Document your custom decorators** for team adoption

## 🔍 **Error Handling Flow**

1. **Validation**: Decorator validates input based on options
2. **Logging**: Operation start is logged with user context
3. **Execution**: Original method is executed
4. **Success Logging**: Operation completion is logged
5. **Error Handling**: Any errors are caught, logged, and re-thrown appropriately

This approach eliminates boilerplate code while maintaining comprehensive error handling and logging! 