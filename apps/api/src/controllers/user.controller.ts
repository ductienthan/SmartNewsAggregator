import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@snag/share';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: 'users'
})
@UseGuards(JwtAuthGuard)
export class UserController {

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      message: 'Profile retrieved successfully'
    };
  }

  @Get('protected')
  @ApiOperation({ summary: 'Protected route example' })
  @ApiResponse({ 
    status: 200, 
    description: 'Access granted to protected route',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async protectedRoute(@CurrentUser() user: JwtPayload) {
    return {
      message: 'You have access to this protected route!',
      user: {
        id: user.sub,
        email: user.email,
        role: user.role
      }
    };
  }
} 