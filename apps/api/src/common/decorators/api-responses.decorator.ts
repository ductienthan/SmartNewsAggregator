import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiBadRequestResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';

export interface ApiResponsesOptions {
  success?: {
    status: number;
    type?: any;
    description?: string;
  };
  badRequest?: boolean | string;
  unauthorized?: boolean | string;
  conflict?: boolean | string;
  notFound?: boolean | string;
  internalServerError?: boolean | string;
}

export function ApiResponses(options: ApiResponsesOptions = {}) {
  const decorators: (MethodDecorator & ClassDecorator)[] = [];

  // Success response
  if (options.success) {
    decorators.push(
      ApiResponse({
        status: options.success.status,
        type: options.success.type,
        description: options.success.description || 'Operation completed successfully'
      })
    );
  }

  // Bad request response
  if (options.badRequest) {
    decorators.push(
      ApiBadRequestResponse({
        description: typeof options.badRequest === 'string' 
          ? options.badRequest 
          : 'Invalid input data or validation errors'
      })
    );
  }

  // Unauthorized response
  if (options.unauthorized) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: typeof options.unauthorized === 'string' 
          ? options.unauthorized 
          : 'Unauthorized access'
      })
    );
  }

  // Conflict response
  if (options.conflict) {
    decorators.push(
      ApiResponse({
        status: 409,
        description: typeof options.conflict === 'string' 
          ? options.conflict 
          : 'Resource conflict'
      })
    );
  }

  // Not found response
  if (options.notFound) {
    decorators.push(
      ApiResponse({
        status: 404,
        description: typeof options.notFound === 'string' 
          ? options.notFound 
          : 'Resource not found'
      })
    );
  }

  // Internal server error response (default for all endpoints)
  if (options.internalServerError !== false) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: typeof options.internalServerError === 'string' 
          ? options.internalServerError 
          : 'Internal server error'
      })
    );
  }

  return applyDecorators(...decorators);
}

// Predefined response decorators for common use cases
export function ApiAuthResponses(type?: any) {
  return ApiResponses({
    success: { status: 200, type, description: 'Authentication successful' },
    badRequest: 'Invalid input data or validation errors',
    unauthorized: 'Invalid credentials',
    internalServerError: 'Authentication service error'
  });
}

export function ApiCreateResponses(type?: any) {
  return ApiResponses({
    success: { status: 201, type, description: 'Resource created successfully' },
    badRequest: 'Invalid input data',
    conflict: 'Resource already exists',
    internalServerError: 'Failed to create resource'
  });
}

export function ApiUpdateResponses() {
  return ApiResponses({
    success: { status: 200, description: 'Resource updated successfully' },
    badRequest: 'Invalid input data',
    notFound: 'Resource not found',
    internalServerError: 'Failed to update resource'
  });
}

export function ApiDeleteResponses() {
  return ApiResponses({
    success: { status: 200, description: 'Resource deleted successfully' },
    notFound: 'Resource not found',
    internalServerError: 'Failed to delete resource'
  });
}

export function ApiGetResponses(type?: any) {
  return ApiResponses({
    success: { status: 200, type, description: 'Resource retrieved successfully' },
    notFound: 'Resource not found',
    internalServerError: 'Failed to retrieve resource'
  });
} 