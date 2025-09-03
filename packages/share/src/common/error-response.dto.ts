export class ErrorResponseDto {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path?: string;
  details?: Record<string, any>;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  declare message: string[];
}

export class ConflictErrorResponseDto extends ErrorResponseDto {
  declare message: string;
}

export class UnauthorizedErrorResponseDto extends ErrorResponseDto {
  declare message: string;
}

export class InternalServerErrorResponseDto extends ErrorResponseDto {
  declare message: string;
} 