import { 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Query, 
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '@snag/share';
import { UserService } from '../services/user.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: 'admin'
})
@UseGuards(JwtAuthGuard, AdminGuard) // Both JWT auth and admin role required
export class AdminController {
  constructor(private readonly userService: UserService) {}

  @Delete('users/:userId')
  @ApiOperation({ 
    summary: 'Delete user by ID (Admin only)',
    description: 'Permanently delete a user account. Only users with ADMIN role can perform this action.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'The ID of the user to delete',
    example: 'cmeweg8e70000oq91q9kkjcbk'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User deleted successfully' },
        deletedUser: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cmeweg8e70000oq91q9kkjcbk' },
            email: { type: 'string', example: 'user@example.com' },
            role: { type: 'string', example: 'USER' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required or cannot delete own account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: JwtPayload
  ) {
    return await this.userService.deleteUserById(userId, admin.sub);
  }

  @Get('users')
  @ApiOperation({ 
    summary: 'Get all users (Admin only)',
    description: 'Retrieve a paginated list of all users. Only users with ADMIN role can access this endpoint.'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    description: 'Page number (starts from 1)',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of users per page (max 100)',
    example: 10
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            pages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    // Ensure reasonable limits
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;
    
    return await this.userService.getAllUsers(page, limit);
  }

  @Get('users/:userId')
  @ApiOperation({ 
    summary: 'Get user by ID (Admin only)',
    description: 'Retrieve detailed information about a specific user. Only users with ADMIN role can access this endpoint.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'The ID of the user to retrieve',
    example: 'cmeweg8e70000oq91q9kkjcbk'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        createdAt: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('userId') userId: string) {
    return await this.userService.findUserById(userId);
  }
} 